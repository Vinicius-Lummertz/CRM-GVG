const { createClient } = require('@supabase/supabase-js');
const { normalizePhone } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const loginPhone = normalizePhone(req.query.login_phone, 'login_phone');

    if (loginPhone.error) {
        return res.status(400).json({ success: false, error: loginPhone.error });
    }

    try {
        console.log(`[CRM] Buscando perfil por telefone: ${loginPhone.value}`);

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('login_phone', loginPhone.value)
            .maybeSingle();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            found: Boolean(profile),
            profile
        });
    } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
