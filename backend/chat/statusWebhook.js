module.exports = async (req, res) => {
    const messageSid = req.body.MessageSid || req.body.SmsSid;
    const rawStatus = req.body.MessageStatus || req.body.SmsStatus;

    if (!messageSid) {
        return res.status(400).json({
            success: false,
            error: 'MessageSid ausente no webhook de status.'
        });
    }

    console.log(`[CRM] Status Twilio recebido: ${messageSid} -> ${rawStatus || 'unknown'}`);
    return res.status(200).json({ success: true });
};
