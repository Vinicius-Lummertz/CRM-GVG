const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { isValidUuid, parseRequiredString } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const name = parseRequiredString(req.body.name, 'name');
    const commercialPhone = parseRequiredString(req.body.commercial_phone, 'commercial_phone');
    const { owner_id, company_settings } = req.body;

    if (name.error) return res.status(400).json({ success: false, error: name.error });

    if (!commercialPhone.value) {
        return res.status(400).json({ success: false, error: "O campo 'commercial_phone' e obrigatorio." });
    }

    if (!owner_id || !isValidUuid(owner_id)) {
        return res.status(400).json({ success: false, error: "O campo 'owner_id' deve ser um UUID valido." });
    }

    const companyId = crypto.randomUUID();

    try {
        console.log(`[CRM] Criando empresa: ${name.value}`);

        const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert([{
                id: companyId,
                name: name.value,
                commercial_phone: commercialPhone.value,
                company_settings: company_settings && typeof company_settings === 'object' ? company_settings : {}
            }])
            .select('*')
            .single();

        if (companyError) throw companyError;

        const { error: memberError } = await supabase
            .from('company_members')
            .insert([{
                id: crypto.randomUUID(),
                company_id: companyId,
                profile_id: owner_id,
                role: 'owner'
            }]);

        if (memberError) throw memberError;

        return res.status(201).json({
            success: true,
            companyId,
            company: {
                ...company,
                role: 'owner'
            },
            message: "Empresa criada com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao criar empresa:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
