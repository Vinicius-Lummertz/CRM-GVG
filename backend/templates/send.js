const twilio = require('twilio');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

function normalizeWhatsAppPhone(phone) {
    let value = (phone || '').toString().trim();
    if (!value) return '';
    if (value.startsWith('whatsapp:')) return value;
    if (!value.startsWith('+')) value = `+${value}`;
    return `whatsapp:${value}`;
}

function digitsOnly(value) {
    return (value || '').toString().replace(/\D/g, '');
}

async function resolveLeadId(leadIdInput, phone) {
    if (leadIdInput) return leadIdInput;

    const digits = digitsOnly(phone);
    if (!digits) return null;

    const externalKey = `whatsapp:+${digits}`;
    const { data, error } = await supabase
        .from('leads')
        .select('id')
        .or(`phone.eq.+${digits},phone.eq.${digits},wa_id.eq.${digits},external_key.eq.${externalKey}`)
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[0].id;
}

module.exports = async (req, res) => {
    const phone = (req.body.phone || '').toString().trim();
    const leadIdInput = (req.body.lead_id || req.body.leadId || '').toString().trim();
    const templateId = (req.body.template_id || req.body.templateId || '').toString().trim();
    const contentSidInput = (req.body.content_sid || req.body.contentSid || '').toString().trim();
    const contentVariablesRaw = req.body.content_variables || req.body.contentVariables || {};

    if (!phone) {
        return res.status(400).json({
            success: false,
            error: "O campo 'phone' e obrigatorio."
        });
    }

    if (!templateId && !contentSidInput) {
        return res.status(400).json({
            success: false,
            error: "Informe 'template_id' ou 'content_sid'."
        });
    }

    let contentSid = contentSidInput;
    let templateBody = '';
    let templateName = '';

    try {
        if (!contentSid && templateId) {
            const { data: templateRows, error: templateError } = await supabase
                .from('templates')
                .select('id, name, body, content_sid')
                .eq('id', templateId)
                .eq('is_active', 1)
                .limit(1);

            if (templateError) throw templateError;

            if (!templateRows || templateRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Template nao encontrado ou inativo.'
                });
            }

            const template = templateRows[0];
            contentSid = (template.content_sid || '').toString().trim();
            templateBody = (template.body || '').toString();
            templateName = (template.name || '').toString();
        }

        if (!contentSid) {
            return res.status(400).json({
                success: false,
                error: 'content_sid nao foi resolvido para envio.'
            });
        }

        const leadId = await resolveLeadId(leadIdInput, phone);
        if (!leadId) {
            return res.status(404).json({
                success: false,
                error: 'Lead nao encontrado para associar o envio.'
            });
        }

        const to = normalizeWhatsAppPhone(phone);
        const contentVariables =
            typeof contentVariablesRaw === 'string'
                ? contentVariablesRaw
                : JSON.stringify(contentVariablesRaw || {});

        const twilioMessage = await client.messages.create({
            contentSid,
            contentVariables,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to
        });

        const now = new Date().toISOString();
        const localMessageId = crypto.randomUUID();
        const preview = templateBody || `Template enviado (${templateName || contentSid})`;

        const { error: messageInsertError } = await supabase
            .from('messages')
            .insert([{
                id: localMessageId,
                lead_id: leadId,
                message_sid: twilioMessage.sid,
                provider_message_id: twilioMessage.sid,
                direction: 'outbound',
                body: preview,
                preview: preview.substring(0, 50),
                message_type: 'template',
                sent_by_customer: 0,
                delivery_status: 'sent',
                created_at: now
            }]);

        if (messageInsertError) {
            throw messageInsertError;
        }

        await supabase
            .from('leads')
            .update({
                last_message: preview,
                last_message_preview: preview.substring(0, 50),
                last_message_at: now,
                updated_at: now
            })
            .eq('id', leadId);

        return res.status(200).json({
            success: true,
            message: 'Template enviado com sucesso.',
            providerMessageId: twilioMessage.sid,
            chatMessageId: localMessageId
        });
    } catch (error) {
        console.error('Erro ao enviar template:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
