const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const {
    buildConversationWindow,
    getPreview,
    mapTwilioChatError,
    parseContentVariables,
    renderTemplateBody,
    resolveLeadPhone,
    validateTemplateVariables
} = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

async function fetchTemplate(templateId, contentSid) {
    let query = supabase
        .from('templates')
        .select('*')
        .eq('is_active', 1)
        .limit(1);

    if (templateId) {
        query = query.eq('id', templateId);
    } else {
        query = query.eq('content_sid', contentSid);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
}

module.exports = async (req, res) => {
    const {
        phone,
        lead_id,
        template_id,
        content_sid,
        variables,
        contentVariables
    } = req.body || {};

    if (!lead_id) {
        return res.status(400).json({
            success: false,
            error: "O campo 'lead_id' e obrigatorio."
        });
    }

    if (!template_id && !content_sid) {
        return res.status(400).json({
            success: false,
            error: "Informe 'template_id' ou 'content_sid'."
        });
    }

    const parsedVariables = parseContentVariables(
        contentVariables !== undefined ? contentVariables : variables
    );

    if (!parsedVariables) {
        return res.status(400).json({
            success: false,
            error: "Variaveis de template invalidas. Envie um objeto JSON valido."
        });
    }

    try {
        const [{ data: leads, error: leadError }, template] = await Promise.all([
            supabase
                .from('leads')
                .select('*')
                .eq('id', lead_id)
                .limit(1),
            fetchTemplate(template_id, content_sid)
        ]);

        if (leadError) throw leadError;
        if (!leads || leads.length === 0) {
            return res.status(404).json({ success: false, error: "Lead nao encontrado." });
        }

        if (!template) {
            return res.status(404).json({ success: false, error: "Template ativo nao encontrado." });
        }

        if (!template.content_sid) {
            return res.status(400).json({
                success: false,
                error: "Template sem content_sid cadastrado."
            });
        }

        const variableValidation = validateTemplateVariables(template.body, parsedVariables);
        if (!variableValidation.valid) {
            return res.status(400).json({
                success: false,
                error: variableValidation.error
            });
        }

        const lead = leads[0];
        const normalizedPhone = resolveLeadPhone(lead, phone);
        if (!normalizedPhone.valid) {
            return res.status(400).json({ success: false, error: normalizedPhone.error });
        }

        const messageId = crypto.randomUUID();
        const now = new Date().toISOString();
        const renderedBody = renderTemplateBody(template.body, parsedVariables);

        console.log(`[CRM] Enviando template ${template.name} para lead ${lead_id}`);

        const twilioPayload = {
            contentSid: template.content_sid,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: normalizedPhone.whatsapp
        };

        if (Object.keys(parsedVariables).length > 0) {
            twilioPayload.contentVariables = JSON.stringify(parsedVariables);
        }

        if (process.env.TWILIO_STATUS_CALLBACK_URL) {
            twilioPayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
        }

        const message = await client.messages.create(twilioPayload);

        const { error: insertError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                lead_id,
                message_sid: message.sid,
                provider_message_id: message.sid,
                direction: 'outbound',
                body: renderedBody,
                preview: getPreview(renderedBody),
                message_type: 'template',
                sent_by_customer: 0,
                delivery_status: 'sent',
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
                last_message: renderedBody,
                last_message_preview: getPreview(renderedBody),
                last_message_at: now,
                updated_at: now,
                message_count_total: Number(lead.message_count_total || 0) + 1
            })
            .eq('id', lead_id);

        if (updateError) {
            console.error("Erro ao atualizar lead apos envio de template:", updateError);
        }

        return res.status(200).json({
            success: true,
            chatMessageId: messageId,
            providerMessageId: message.sid,
            templateId: template.id,
            conversation_window: buildConversationWindow(lead),
            message: "Template enviado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao enviar template via Twilio:", error);
        const mappedError = mapTwilioChatError(error);
        return res.status(mappedError.status).json(mappedError.body);
    }
};
