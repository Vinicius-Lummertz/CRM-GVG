const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const {
    buildConversationWindow,
    getPreview,
    mapTwilioChatError,
    resolveLeadPhone
} = require('./utils');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

// Bucket no Supabase Storage onde guardamos os anexos enviados pelo CRM.
const STORAGE_BUCKET = 'Arquivos';
// Validade da URL assinada que entregamos ao Twilio. Ele baixa a midia na hora do
// envio, entao alguns minutos bastam; deixamos 1h de folga por seguranca.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// O Twilio aceita ate 5MB para a maioria das midias no WhatsApp; mantemos esse teto.
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Rotulo gravado em `content` por tipo de midia. O front infere o tipo da mensagem
// a partir desse rotulo ([Imagem], [Video]...), entao precisa casar com aquela regex.
function mediaLabel(mimeType) {
    const type = (mimeType || '').toLowerCase();
    if (type.startsWith('image/')) return '[Imagem]';
    if (type.startsWith('video/')) return '[Vídeo]';
    if (type.startsWith('audio/')) return '[Áudio]';
    return '[Arquivo]';
}

// Gera um caminho unico dentro do bucket preservando a extensao original.
function buildStoragePath(companyId, leadId, originalName) {
    const safeName = (originalName || 'arquivo')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(-80);
    return `${companyId}/${leadId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

module.exports = async (req, res) => {
    const { lead_id, company_id, phone, caption } = req.body || {};
    const file = req.file;

    if (!lead_id || !company_id) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'lead_id' e 'company_id' sao obrigatorios."
        });
    }

    if (!isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
        return res.status(400).json({ success: false, error: "Nenhum arquivo enviado." });
    }

    if (file.buffer.length > MAX_FILE_BYTES) {
        return res.status(400).json({ success: false, error: "Arquivo muito grande. Limite de 5MB." });
    }

    try {
        const { data: leads, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', lead_id)
            .eq('company_id', company_id)
            .limit(1);

        if (leadError) throw leadError;
        if (!leads || leads.length === 0) {
            return res.status(404).json({ success: false, error: "Lead nao encontrado." });
        }

        const lead = leads[0];
        const windowInfo = buildConversationWindow(lead);
        if (!windowInfo.is_open) {
            return res.status(400).json({
                success: false,
                error: "WINDOW_CLOSED",
                message: "Janela de 24h fechada. Use um template aprovado para iniciar ou retomar a conversa.",
                conversation_window: windowInfo,
                fallbackEndpoint: "/api/v2/chat/send-template",
                templatesEndpoint: "/api/v2/templates"
            });
        }

        const normalizedPhone = resolveLeadPhone(lead, phone);
        if (!normalizedPhone.valid) {
            return res.status(400).json({ success: false, error: normalizedPhone.error });
        }

        // 1) Sobe o arquivo para o Storage.
        const storagePath = buildStoragePath(company_id, lead_id, file.originalname);
        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file.buffer, {
                contentType: file.mimetype || 'application/octet-stream',
                upsert: false
            });

        if (uploadError) {
            console.error("Erro ao subir arquivo para o Storage:", uploadError);
            return res.status(500).json({ success: false, error: "Falha ao armazenar o arquivo." });
        }

        // 2) Gera uma URL assinada para o Twilio baixar a midia.
        const { data: signed, error: signedError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

        if (signedError || !signed || !signed.signedUrl) {
            console.error("Erro ao gerar URL assinada:", signedError);
            return res.status(500).json({ success: false, error: "Falha ao preparar o arquivo para envio." });
        }

        const messageId = crypto.randomUUID();
        const now = new Date().toISOString();
        const captionText = typeof caption === 'string' ? caption.trim() : '';
        const label = mediaLabel(file.mimetype);

        console.log(`[CRM] Enviando midia para lead ${lead_id} (${normalizedPhone.whatsapp})`);

        // 3) Envia via Twilio com a URL da midia.
        const twilioPayload = {
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: normalizedPhone.whatsapp,
            mediaUrl: [signed.signedUrl]
        };
        if (captionText) twilioPayload.body = captionText;
        if (process.env.TWILIO_STATUS_CALLBACK_URL) {
            twilioPayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
        }

        const message = await client.messages.create(twilioPayload);

        // 4) Grava a mensagem. Guardamos o caminho no Storage com um prefixo `supabase://`
        // (e nao a URL assinada, que expira) para que o proxy de midia saiba baixar do
        // Storage em vez de tentar autenticar no Twilio.
        const content = captionText ? `${label} ${captionText}` : label;
        const { error: insertError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                lead_id,
                direction: 'outbound',
                content,
                has_media: true,
                media_url: `supabase://${storagePath}`,
                sender_id: null,
                created_at: now,
                provider_message_id: message.sid,
                delivery_status: 'queued'
            }]);

        if (insertError) {
            console.error("Erro ao salvar mensagem de midia no banco:", insertError);
            return res.status(500).json({
                success: false,
                error: "Midia enviada no WhatsApp, mas falhou ao gravar no banco do CRM.",
                details: insertError
            });
        }

        const { error: updateError } = await supabase
            .from('leads')
            .update({
                updated_at: now,
                last_conversation_summary: getPreview(content)
            })
            .eq('id', lead_id)
            .eq('company_id', company_id);

        if (updateError) {
            console.error("Erro ao atualizar lead apos envio de midia:", updateError);
        }

        return res.status(200).json({
            success: true,
            chatMessageId: messageId,
            providerMessageId: message.sid,
            conversation_window: windowInfo,
            message: "Arquivo enviado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao enviar midia via Twilio:", error);
        const mappedError = mapTwilioChatError(error);
        return res.status(mappedError.status).json(mappedError.body);
    }
};
