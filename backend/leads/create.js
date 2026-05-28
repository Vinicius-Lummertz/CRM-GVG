const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function normalizeBrazilPhone(rawPhone) {
    if (typeof rawPhone !== 'string') {
        return { error: "O campo 'phone' deve ser uma string valida." };
    }

    const cleanedInput = rawPhone.trim().replace(/^whatsapp:/i, '');
    const digits = cleanedInput.replace(/\D/g, '');

    if (!digits) {
        return { error: "O campo 'phone' esta invalido. Informe um numero brasileiro com codigo do pais 55." };
    }

    if (!digits.startsWith('55')) {
        return { error: "Telefone invalido. Informe o numero com codigo do pais 55 (Brasil)." };
    }

    if (digits.length !== 12 && digits.length !== 13) {
        return { error: "Telefone invalido. Use formato brasileiro com 55 + DDD + numero." };
    }

    const ddd = digits.slice(2, 4);
    if (!/^[1-9][0-9]$/.test(ddd)) {
        return { error: "Telefone invalido. DDD brasileiro nao reconhecido." };
    }

    return { phone: `+${digits}` };
}

async function findExistingLeadByPhoneVariants(companyId, phoneData) {
    const { data, error } = await supabase
        .from('leads')
        .select('id')
        .eq('company_id', companyId)
        .eq('phone', phoneData.phone)
        .limit(1);

    if (error) throw error;
    if (data && data.length > 0) return data[0];

    return null;
}

module.exports = async (req, res) => {
    const { name, phone, company_id, assigned_to } = req.body;

    if (!name || !phone || !company_id) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'name', 'phone' e 'company_id' sao obrigatorios."
        });
    }

    const trimmedName = name.toString().trim();
    const normalizedPhone = normalizeBrazilPhone(phone);

    if (!trimmedName) {
        return res.status(400).json({
            success: false,
            error: "O campo 'name' nao pode ser vazio."
        });
    }

    if (normalizedPhone.error) {
        return res.status(400).json({
            success: false,
            error: normalizedPhone.error
        });
    }

    if (!isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    if (assigned_to && !isValidUuid(assigned_to)) {
        return res.status(400).json({ success: false, error: "O campo 'assigned_to' deve ser um UUID valido." });
    }

    const leadId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        console.log(`[CRM] Criando lead manual: ${trimmedName} (${normalizedPhone.phone})`);

        const existingLead = await findExistingLeadByPhoneVariants(company_id, normalizedPhone);
        if (existingLead) {
            return res.status(409).json({
                success: false,
                error: "Ja existe um lead com este telefone."
            });
        }

        const { error: insertError } = await supabase
            .from('leads')
            .insert([{
                id: leadId,
                company_id,
                name: trimmedName,
                phone: normalizedPhone.phone,
                assigned_to: assigned_to || null,
                created_at: now,
                updated_at: now
            }]);

        if (insertError) throw insertError;

        console.log(`[CRM] Lead criado com sucesso! ID: ${leadId}`);
        return res.status(201).json({
            success: true,
            leadId,
            message: "Lead criado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao criar lead:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
