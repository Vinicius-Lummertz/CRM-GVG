const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function normalizeStatus(rawStatus) {
    const status = (rawStatus || '').toString().trim().toLowerCase();

    if (['queued', 'accepted', 'scheduled'].includes(status)) return 'queued';
    if (['sent', 'sending'].includes(status)) return 'sent';
    if (status === 'delivered') return 'delivered';
    if (status === 'read') return 'read';
    if (['failed', 'undelivered'].includes(status)) return 'failed';

    return status || 'unknown';
}

module.exports = async (req, res) => {
    const messageSid = req.body.MessageSid || req.body.SmsSid;
    const rawStatus = req.body.MessageStatus || req.body.SmsStatus;

    if (!messageSid) {
        return res.status(400).json({
            success: false,
            error: "MessageSid ausente no webhook de status."
        });
    }

    const deliveryStatus = normalizeStatus(rawStatus);

    try {
        console.log(`[CRM] Status Twilio recebido: ${messageSid} -> ${deliveryStatus}`);

        const { error } = await supabase
            .from('messages')
            .update({ delivery_status: deliveryStatus })
            .or(`message_sid.eq.${messageSid},provider_message_id.eq.${messageSid}`);

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao atualizar status da mensagem:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
