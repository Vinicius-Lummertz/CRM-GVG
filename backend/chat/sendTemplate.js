const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const {
    buildConversationWindow,
    getPreview,
    mapTwilioChatError,
    parseContentVariables,
    resolveLeadPhone
} = require('./utils');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

module.exports = async (req, res) => {
    const {
        phone,
        lead_id,
        company_id,
        template_id,
        content_sid,
        variables,
        contentVariables
    } = req.body || {};

    if (!lead_id || !company_id) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'lead_id' e 'company_id' sao obrigatorios."
        });
    }

    if (!isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    const parsedVariables = parseContentVariables(contentVariables !== undefined ? contentVariables : variables);

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
        const normalizedPhone = resolveLeadPhone(lead, phone);
        if (!normalizedPhone.valid) {
            return res.status(400).json({ success: false, error: normalizedPhone.error });
        }

        if (!content_sid) {
            return res.status(400).json({
                success: false,
                error: "No schema atual, envie 'content_sid' diretamente para disparar templates."
            });
        }

        const renderedBody = parsedVariables ? JSON.stringify(parsedVariables) : content_sid;

        console.log(`[CRM] Enviando template content_sid=${content_sid} para lead ${lead_id}`);

        const twilioPayload = {
            contentSid: content_sid,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: normalizedPhone.whatsapp
        };

        if (parsedVariables && Object.keys(parsedVariables).length > 0) {
            twilioPayload.contentVariables = JSON.stringify(parsedVariables);
        }

        if (process.env.TWILIO_STATUS_CALLBACK_URL) {
            twilioPayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
        }

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
                created_at: now
            }]);

        if (insertError) {
            console.error("Erro ao salvar template enviado no banco:", insertError);
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
            console.error("Erro ao atualizar lead apos envio de template:", updateError);
        }

        return res.status(200).json({
            success: true,
            chatMessageId: messageId,
            providerMessageId: message.sid,
            templateId: template_id || null,
            conversation_window: buildConversationWindow(lead),
            message: "Template enviado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao enviar template via Twilio:", error);
        const mappedError = mapTwilioChatError(error);
        return res.status(mappedError.status).json(mappedError.body);
    }
};
