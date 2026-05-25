const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const {
    mapTwilioChatError,
    normalizeText,
    resolveLeadPhone
} = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

module.exports = async (req, res) => {
    const { phone, text, lead_id } = req.body || {};
    const companyId = req.auth.companyId;
    const profileId = req.auth.profileId;

    if (!lead_id || !text) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'lead_id' e 'text' sao obrigatorios."
        });
    }

    const normalizedText = normalizeText(text);
    if (!normalizedText.valid) {
        return res.status(400).json({ success: false, error: normalizedText.error });
    }

    try {
        const { data: leads, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', lead_id)
            .eq('company_id', companyId)
            .limit(1);

        if (leadError) throw leadError;
        if (!leads || leads.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead nao encontrado.' });
        }

        const lead = leads[0];
        const normalizedPhone = resolveLeadPhone(lead, phone);
        if (!normalizedPhone.valid) {
            return res.status(400).json({ success: false, error: normalizedPhone.error });
        }

        const messageId = crypto.randomUUID();
        const now = new Date().toISOString();

        const twilioPayload = {
            body: normalizedText.text,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: normalizedPhone.whatsapp
        };

        if (process.env.TWILIO_STATUS_CALLBACK_URL) {
            twilioPayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
        }

        const twilioMessage = await client.messages.create(twilioPayload);

        const { error: insertError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                lead_id,
                direction: 'outbound',
                content: normalizedText.text,
                has_media: false,
                media_url: null,
                sender_id: profileId,
                created_at: now
            }]);

        if (insertError) {
            console.error('Erro ao salvar mensagem no banco:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Mensagem enviada no WhatsApp, mas falhou ao gravar no banco do CRM.'
            });
        }

        const { error: updateError } = await supabase
            .from('leads')
            .update({
                last_conversation_summary: normalizedText.text.substring(0, 2000),
                updated_at: now
            })
            .eq('id', lead_id)
            .eq('company_id', companyId);

        if (updateError) {
            console.error('Erro ao atualizar resumo do lead apos envio:', updateError);
        }

        return res.status(200).json({
            success: true,
            chatMessageId: messageId,
            providerMessageId: twilioMessage.sid,
            message: 'Mensagem enviada com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem livre via Twilio:', error);
        const mappedError = mapTwilioChatError(error);
        return res.status(mappedError.status).json(mappedError.body);
    }
};
