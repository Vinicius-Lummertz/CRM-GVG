const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    // 1. Coleta e desestrutura os dados enviados pelo Front-end
    const { 
        name, 
        body, 
        language = 'pt_BR', 
        category = 'utility', 
        variables_json, 
        content_sid, 
        created_by_operator_id 
    } = req.body;

    // Validação básica
    if (!name || !body || !content_sid) {
        return res.status(400).json({ 
            success: false, 
            error: "Os campos 'name', 'body' e 'content_sid' são obrigatórios." 
        });
    }

    const templateId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        console.log(`[CRM] Cadastrando novo template: ${name}`);

        // 2. Injeta na tabela templates do Supabase
        const { error: insertError } = await supabase
            .from('templates')
            .insert([{
                id: templateId,
                name,
                body,
                language,
                category,
                // Garantimos que seja string se vier como objeto json válido no req.body
                variables_json: (typeof variables_json === 'object' && variables_json !== null) ? JSON.stringify(variables_json) : variables_json,
                is_active: 1,
                created_by_operator_id: created_by_operator_id || null, // FK para operators pode ser nula
                content_sid,
                created_at: now,
                updated_at: now
            }]);

        if (insertError) {
            // Código 23505 no Postgres significa Unique Violation (content_sid duplicado)
            if (insertError.code === '23505') {
                return res.status(409).json({ success: false, error: "Esse Content SID já existe no banco de dados." });
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
