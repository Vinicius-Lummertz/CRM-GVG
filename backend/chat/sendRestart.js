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

module.exports = async (req, res) => {
    const { phone, lead_id, company_id } = req.body || {};

    if (!lead_id || !company_id) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'lead_id' e 'company_id' sao obrigatorios."
        });
    }

    if (!isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    try {
        const [{ data: leads, error: leadError }, { data: templates, error: templateError }] = await Promise.all([
            supabase
                .from('leads')
                .select('*')
                .eq('id', lead_id)
                .eq('company_id', company_id)
                .limit(1),
            supabase
                .from('templates')
                .select('*')
                .eq('company_id', company_id)
                .eq('is_active', 1)
                .ilike('name', 'restart_conversa')
                .order('created_at', { ascending: false })
                .limit(1)
        ]);

        if (leadError) throw leadError;
        if (templateError) throw templateError;

        if (!leads || leads.length === 0) {
            return res.status(404).json({ success: false, error: "Lead nao encontrado." });
        }

        if (!templates || templates.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Template 'restart_conversa' nao encontrado para esta empresa."
            });
        }

        const lead = leads[0];
        const template = templates[0];
        const normalizedPhone = resolveLeadPhone(lead, phone);
        if (!normalizedPhone.valid) {
            return res.status(400).json({ success: false, error: normalizedPhone.error });
        }

        if (!template.content_sid) {
            return res.status(400).json({
                success: false,
                error: "Template restart_conversa sem content_sid cadastrado."
            });
        }

        const leadName = (lead.name || 'cliente').toString().trim() || 'cliente';
        const contentVariables = { '1': leadName };
        const renderedBody = template.body ? template.body.replace(/{{\s*1\s*}}/g, leadName) : JSON.stringify(contentVariables);

        const twilioPayload = {
            contentSid: template.content_sid,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: normalizedPhone.whatsapp,
            contentVariables: JSON.stringify(contentVariables)
        };

        if (process.env.TWILIO_STATUS_CALLBACK_URL) {
            twilioPayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
        }

        console.log(`[CRM] Enviando restart_conversa para lead ${lead_id}`);
        const message = await client.messages.create(twilioPayload);

        const messageId = crypto.randomUUID();
        const now = new Date().toISOString();

        const { error: insertError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                lead_id,
                direction: 'outbound',
                content: renderedBody,
                has_media: false,
                media_url: null,
                sender_id: null,
                created_at: now,
                provider_message_id: message.sid,
                delivery_status: 'queued'
            }]);

        if (insertError) {
            console.error("Erro ao salvar restart_conversa no banco:", insertError);
            return res.status(500).json({
                success: false,
                error: "Template enviado no WhatsApp, mas falhou ao gravar no banco do CRM.",
                details: insertError
            });
        }

        const { error: updateError } = await supabase
            .from('leads')
            .update({
                updated_at: now,
                last_conversation_summary: getPreview(renderedBody)
            })
            .eq('id', lead_id)
            .eq('company_id', company_id);

        if (updateError) {
            console.error("Erro ao atualizar lead apos restart_conversa:", updateError);
        }

        return res.status(200).json({
            success: true,
            chatMessageId: messageId,
            providerMessageId: message.sid,
            templateName: 'restart_conversa',
            conversation_window: buildConversationWindow(lead),
            message: "Mensagem de abertura enviada com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao enviar restart_conversa:", error);
        const mappedError = mapTwilioChatError(error);
        return res.status(mappedError.status).json(mappedError.body);
    }
};

