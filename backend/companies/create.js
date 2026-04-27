const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { isValidUuid, parseRequiredString } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const name = parseRequiredString(req.body.name, 'name');
    const { owner_id } = req.body;

    if (name.error) return res.status(400).json({ success: false, error: name.error });

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
                owner_id
            }])
            .select('*')
            .single();

        if (companyError) throw companyError;

        const { error: memberError } = await supabase
            .from('company_members')
            .insert([{
                id: crypto.randomUUID(),
                company_id: companyId,
                user_id: owner_id,
                role: 'owner',
                status: 'active'
            }]);

        if (memberError) throw memberError;

        return res.status(201).json({
            success: true,
            companyId,
            company: {
                ...company,
                role: 'owner',
                whatsapp_numbers: []
            },
            message: "Empresa criada com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao criar empresa:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
