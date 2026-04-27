const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function attachWhatsappNumbers(companies) {
    if (!companies || companies.length === 0) return [];

    const companyIds = companies.map((item) => item.company.id);
    const { data: numbers, error } = await supabase
        .from('company_whatsapp_numbers')
        .select('*')
        .in('company_id', companyIds)
        .order('created_at', { ascending: true });

    if (error) throw error;

    const numbersByCompany = new Map();
    (numbers || []).forEach((number) => {
        if (!numbersByCompany.has(number.company_id)) {
            numbersByCompany.set(number.company_id, []);
        }
        numbersByCompany.get(number.company_id).push(number);
    });

    return companies.map((item) => ({
        ...item.company,
        membership_id: item.id,
        role: item.role,
        member_status: item.status,
        joined_at: item.joined_at,
        whatsapp_numbers: numbersByCompany.get(item.company.id) || []
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
            .select('id, role, status, joined_at, company:companies(*)')
            .eq('user_id', user_id)
            .eq('status', 'active')
            .order('joined_at', { ascending: true });

        if (error) throw error;

        const companies = await attachWhatsappNumbers(memberships || []);

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
