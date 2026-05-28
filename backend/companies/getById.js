const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { companyId } = req.params;
    const { user_id } = req.query;

    if (!isValidUuid(companyId)) {
        return res.status(400).json({ success: false, error: "Parametro 'companyId' deve ser um UUID valido." });
    }

    if (user_id && !isValidUuid(user_id)) {
        return res.status(400).json({ success: false, error: "Parametro 'user_id' deve ser um UUID valido." });
    }

    try {
        console.log(`[CRM] Buscando empresa: ${companyId}`);

        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

        if (companyError) {
            if (companyError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: "Empresa nao encontrada." });
            }
            throw companyError;
        }

        if (user_id) {
            const { data: membership, error: membershipError } = await supabase
                .from('company_members')
                .select('*')
                .eq('company_id', companyId)
                .eq('profile_id', user_id)
                .maybeSingle();

            if (membershipError) throw membershipError;

            if (!membership) {
                return res.status(403).json({ success: false, error: "Usuario sem acesso a esta empresa." });
            }

            company.membership = membership;
        }

        const { data: members, error: membersError } = await supabase
                .from('company_members')
                .select('*, profile:profiles(id, full_name, phone, avatar_url)')
                .eq('company_id', companyId)
                .order('joined_at', { ascending: true });

        if (membersError) throw membersError;

        return res.status(200).json({
            success: true,
            company: {
                ...company,
                members: members || []
            }
        });
    } catch (error) {
        console.error("Erro ao buscar empresa:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
