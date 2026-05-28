const {
    extractConnection,
    fetchCompany,
    normalizeE164Phone,
    supabase,
    VALID_CONNECTION_STATUSES
} = require('./utils');

module.exports = async (req, res) => {
    const { companyId } = req.params;
    const fetched = await fetchCompany(companyId);

    if (fetched.error) {
        return res.status(fetched.status || 400).json({ success: false, error: fetched.error });
    }

    const status = (req.body.status || '').toString().trim();
    if (!VALID_CONNECTION_STATUSES.includes(status)) {
        return res.status(400).json({
            success: false,
            error: `Status invalido. Use: ${VALID_CONNECTION_STATUSES.join(', ')}.`
        });
    }

    const currentConnection = extractConnection(fetched.company);
    const nextMetaBusinessId = req.body.meta_business_id ? String(req.body.meta_business_id) : (currentConnection.meta_business_id || null);
    const nextMetaPhoneNumberId = req.body.meta_phone_number_id ? String(req.body.meta_phone_number_id) : (currentConnection.meta_phone_number_id || null);

    let nextPhone = currentConnection.phone_number || null;
    if (req.body.phone_number !== undefined) {
        const normalizedPhone = normalizeE164Phone(req.body.phone_number, 'phone_number');
        if (normalizedPhone.error) {
            return res.status(400).json({ success: false, error: normalizedPhone.error });
        }
        nextPhone = normalizedPhone.value;
    }

    if (status === 'conectado') {
        if (!nextPhone || !nextMetaBusinessId || !nextMetaPhoneNumberId) {
            return res.status(400).json({
                success: false,
                error: "Para marcar como conectado, preencha phone_number, meta_business_id e meta_phone_number_id."
            });
        }
    }

    const nextConnection = {
        ...currentConnection,
        status,
        phone_number: nextPhone,
        meta_business_id: nextMetaBusinessId,
        meta_phone_number_id: nextMetaPhoneNumberId,
        last_error: req.body.last_error ? String(req.body.last_error) : null,
        connected_at: status === 'conectado' ? new Date().toISOString() : (currentConnection.connected_at || null),
        updated_at: new Date().toISOString()
    };

    const companySettings = fetched.company.company_settings && typeof fetched.company.company_settings === 'object'
        ? fetched.company.company_settings
        : {};

    const nextSettings = {
        ...companySettings,
        chat_connection: nextConnection
    };

    const { error } = await supabase
        .from('companies')
        .update({ company_settings: nextSettings })
        .eq('id', companyId);

    if (error) {
        return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
        success: true,
        company_id: companyId,
        chat_connection: nextConnection
    });
};
