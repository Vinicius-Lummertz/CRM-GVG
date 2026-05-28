const {
    extractConnection,
    fetchCompany,
    normalizeE164Phone,
    supabase
} = require('./utils');

module.exports = async (req, res) => {
    const { companyId } = req.params;
    const fetched = await fetchCompany(companyId);

    if (fetched.error) {
        return res.status(fetched.status || 400).json({ success: false, error: fetched.error });
    }

    const phoneNormalization = normalizeE164Phone(req.body.phone_number || '', 'phone_number');
    if (phoneNormalization.error) {
        return res.status(400).json({ success: false, error: phoneNormalization.error });
    }

    const displayName = (req.body.display_name || '').toString().trim();
    if (!displayName) {
        return res.status(400).json({ success: false, error: "O campo 'display_name' e obrigatorio." });
    }

    const currentConnection = extractConnection(fetched.company);
    const nextConnection = {
        ...currentConnection,
        status: 'pendente_meta',
        phone_number: phoneNormalization.value,
        display_name: displayName,
        last_error: null,
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
        .update({
            commercial_phone: phoneNormalization.value,
            company_settings: nextSettings
        })
        .eq('id', companyId);

    if (error) {
        return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
        success: true,
        company_id: companyId,
        chat_connection: nextConnection,
        message: 'Numero da empresa salvo. Prossiga com a conexao na Meta.'
    });
};
