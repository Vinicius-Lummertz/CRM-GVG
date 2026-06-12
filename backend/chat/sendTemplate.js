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
    if (parsedVariables === null) {
        return res.status(400).json({
            success: false,
            error: "Variaveis do template invalidas. Envie um objeto JSON como { \"1\": \"valor\" }."
        });
    }

    if (!content_sid) {
        return res.status(400).json({
            success: false,
            error: "No schema atual, envie 'content_sid' diretamente para disparar templates."
        });
    }

    try {
        // Busca lead e o template correspondente ao content_sid em paralelo. O template
        // serve para validar as variaveis obrigatorias e gravar o texto real no historico.
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
                .eq('content_sid', content_sid)
                .eq('is_active', 1)
                .limit(1)
        ]);

        if (leadError) throw leadError;
        if (templateError) throw templateError;
        if (!leads || leads.length === 0) {
            return res.status(404).json({ success: false, error: "Lead nao encontrado." });
        }

        const lead = leads[0];
        const template = templates && templates.length > 0 ? templates[0] : null;

        const normalizedPhone = resolveLeadPhone(lead, phone);
        if (!normalizedPhone.valid) {
            return res.status(400).json({ success: false, error: normalizedPhone.error });
        }

        // Se conhecemos o corpo do template, validamos que toda variavel ({{1}}, {{2}}...)
        // foi preenchida antes de gastar um envio cobrado pela Meta.
        if (template && template.body) {
            const validation = validateTemplateVariables(template.body, parsedVariables);
            if (!validation.valid) {
                return res.status(400).json({ success: false, error: validation.error });
            }
        }

        // Texto real que vai pro historico do CRM (em vez de salvar o JSON cru das variaveis).
        const renderedBody = template && template.body
            ? renderTemplateBody(template.body, parsedVariables)
            : (Object.keys(parsedVariables).length > 0 ? JSON.stringify(parsedVariables) : content_sid);

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
                created_at: now,
                provider_message_id: message.sid,
                delivery_status: 'queued'
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
