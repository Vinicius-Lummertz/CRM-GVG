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

function buildStatusUpdate(deliveryStatus, body) {
    const now = new Date().toISOString();
    const update = {
        delivery_status: deliveryStatus,
        raw_payload_json: JSON.stringify(body || {})
    };

    if (deliveryStatus === 'queued') update.queued_at = now;
    if (deliveryStatus === 'sent') update.sent_at = now;
    if (deliveryStatus === 'delivered') update.delivered_at = now;
    if (deliveryStatus === 'read') update.read_at = now;
    if (deliveryStatus === 'failed') {
        update.failed_at = now;
        update.failed_reason = body.ErrorMessage || body.ErrorCode || null;
    }

    return update;
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
            .update(buildStatusUpdate(deliveryStatus, req.body))
            .or(`message_sid.eq.${messageSid},provider_message_id.eq.${messageSid}`);

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao atualizar status da mensagem:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
