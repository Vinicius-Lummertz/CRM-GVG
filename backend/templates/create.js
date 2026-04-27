const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const {
        name,
        body,
        language = 'pt_BR',
        category = 'utility',
        variables_json,
        content_sid,
        created_by_operator_id,
        company_id
    } = req.body;

    if (!name || !body || !content_sid || !company_id) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'name', 'body', 'content_sid' e 'company_id' sao obrigatorios."
        });
    }

    if (!isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    const templateId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        console.log(`[CRM] Cadastrando novo template: ${name} | company_id=${company_id}`);

        const { error: insertError } = await supabase
            .from('templates')
            .insert([{
                id: templateId,
                company_id,
                name,
                body,
                language,
                category,
                variables_json: (typeof variables_json === 'object' && variables_json !== null) ? JSON.stringify(variables_json) : variables_json,
                is_active: 1,
                created_by_operator_id: created_by_operator_id || null,
                content_sid,
                created_at: now,
                updated_at: now
            }]);

        if (insertError) {
            if (insertError.code === '23505') {
                return res.status(409).json({ success: false, error: "Esse Content SID ja existe no banco de dados." });
            }
            throw insertError;
        }

        console.log(`[CRM] Template cadastrado com sucesso! ID: ${templateId}`);
        return res.status(201).json({
            success: true,
            templateId,
            message: "Template adicionado corretamente ao banco de dados!"
        });
    } catch (error) {
        console.error("Erro interno ao inserir template:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
