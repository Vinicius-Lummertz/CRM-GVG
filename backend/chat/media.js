const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// Bucket onde ficam os anexos que NOS enviamos (vide chat/sendMedia.js). Esses media_url
// vem com o prefixo `supabase://<caminho>` e sao servidos direto do Storage, sem Twilio.
const STORAGE_BUCKET = 'Arquivos';

// O Twilio so entrega a midia (figurinha, imagem, video, GIF, audio) mediante
// autenticacao Basic com Account SID + Auth Token. Em vez de expor essas credenciais
// no front, este endpoint busca a midia no Twilio e a repassa (stream) para o cliente.
// Assim a URL exibida no CRM nao expira nem exige login do usuario.
module.exports = async (req, res) => {
    const { messageId } = req.params;
    const companyId = req.query.company_id ? req.query.company_id.toString().trim() : '';

    if (!messageId || !isValidUuid(messageId)) {
        return res.status(400).json({ success: false, error: "Parametro 'messageId' invalido." });
    }

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        // Busca a mensagem e, em seguida, confirma que o lead dono dela pertence a empresa
        // que esta pedindo. Sem essa checagem o endpoint viraria um proxy aberto de midia
        // de qualquer conta. Fazemos em dois passos para nao depender do embed de FK.
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('id, media_url, has_media, lead_id')
            .eq('id', messageId)
            .maybeSingle();

        if (messageError) throw messageError;
        if (!message || !message.has_media || !message.media_url) {
            return res.status(404).json({ success: false, error: "Midia nao encontrada." });
        }

        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('id')
            .eq('id', message.lead_id)
            .eq('company_id', companyId)
            .maybeSingle();

        if (leadError) throw leadError;
        if (!lead) {
            return res.status(404).json({ success: false, error: "Midia nao encontrada." });
        }

        // Anexos que nos mesmos enviamos ficam no Storage do Supabase, nao no Twilio.
        if (message.media_url.startsWith('supabase://')) {
            const storagePath = message.media_url.slice('supabase://'.length);
            const { data: fileData, error: downloadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .download(storagePath);

            if (downloadError || !fileData) {
                console.error(`[CRM] Falha ao baixar midia do Storage ${messageId}:`, downloadError);
                return res.status(404).json({ success: false, error: "Midia nao encontrada." });
            }

            const contentType = fileData.type || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'private, max-age=86400');
            const buffer = Buffer.from(await fileData.arrayBuffer());
            return res.status(200).send(buffer);
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_ACCOUNT_AUTH_TOKEN;
        if (!accountSid || !authToken) {
            return res.status(500).json({
                success: false,
                error: "Credenciais do Twilio nao configuradas no servidor."
            });
        }

        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const twilioResponse = await fetch(message.media_url, {
            headers: { Authorization: `Basic ${auth}` }
        });

        if (!twilioResponse.ok) {
            console.error(`[CRM] Twilio retornou ${twilioResponse.status} ao buscar midia ${messageId}`);
            return res.status(502).json({ success: false, error: "Falha ao buscar a midia no Twilio." });
        }

        const contentType = twilioResponse.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'private, max-age=86400');

        const buffer = Buffer.from(await twilioResponse.arrayBuffer());
        return res.status(200).send(buffer);
    } catch (error) {
        console.error("Erro ao repassar midia do Twilio:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
