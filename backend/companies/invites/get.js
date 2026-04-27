const { createClient } = require('@supabase/supabase-js');
const {
    VALID_INVITE_STATUSES,
    isValidUuid,
    parseOptionalString
} = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { companyId } = req.params;
    const status = parseOptionalString(req.query.status);

    if (!isValidUuid(companyId)) {
        return res.status(400).json({ success: false, error: "Parametro 'companyId' deve ser um UUID valido." });
    }

    if (status && !VALID_INVITE_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: `Status invalido. Use: ${VALID_INVITE_STATUSES.join(', ')}.` });
    }

    try {
        console.log(`[CRM] Listando convites da empresa ${companyId}`);

        let query = supabase
            .from('company_member_invites')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);

        const { data: invites, error } = await query;
        if (error) throw error;

        return res.status(200).json({
            success: true,
            count: invites ? invites.length : 0,
            invites: invites || []
        });
    } catch (error) {
        console.error("Erro ao listar convites:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
