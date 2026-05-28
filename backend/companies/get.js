const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function mapMemberships(companies) {
    return (companies || []).map((item) => ({
        ...item.company,
        membership_id: item.id,
        role: item.role,
        joined_at: item.joined_at
    }));
}

module.exports = async (req, res) => {
    const { user_id } = req.query;

    if (!user_id || !isValidUuid(user_id)) {
        return res.status(400).json({ success: false, error: "Parametro 'user_id' e obrigatorio e deve ser um UUID valido." });
    }

    try {
        console.log(`[CRM] Buscando empresas do usuario: ${user_id}`);

        const { data: memberships, error } = await supabase
            .from('company_members')
            .select('id, role, joined_at, company:companies(*)')
            .eq('profile_id', user_id)
            .order('joined_at', { ascending: true });

        if (error) throw error;

        const companies = mapMemberships(memberships);

        return res.status(200).json({
            success: true,
            count: companies.length,
            companies
        });
    } catch (error) {
        console.error("Erro ao buscar empresas:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
