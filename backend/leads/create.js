const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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

    let subscriber = digits.slice(4);

    // Mantemos o padrao legado do CRM: salvar sempre sem o '9' apos o DDD.
    if (digits.length === 13) {
        if (subscriber[0] !== '9') {
            return { error: "Telefone invalido. Para 13 digitos, o nono digito apos o DDD deve ser 9." };
        }
        subscriber = subscriber.slice(1);
    }

    if (!/^[0-9]{8}$/.test(subscriber)) {
        return { error: "Telefone invalido. O numero local deve conter 8 digitos apos normalizacao." };
    }

    if (subscriber[0] === '0' || subscriber[0] === '1') {
        return { error: "Telefone invalido. Numero local brasileiro fora do padrao esperado." };
    }

    const canonicalDigits = `55${ddd}${subscriber}`;
    const phone = `+${canonicalDigits}`;
    const externalKey = `whatsapp:${phone}`;
    const nineDigitsVariant = `55${ddd}9${subscriber}`;

    return {
        phone,
        externalKey,
        whatsappFrom: externalKey,
        waId: canonicalDigits,
        altPhoneWithNine: `+${nineDigitsVariant}`,
        altExternalKeyWithNine: `whatsapp:+${nineDigitsVariant}`,
        altWaIdWithNine: nineDigitsVariant
    };
}

async function findExistingLeadByPhoneVariants(phoneData) {
    const fieldsToCheck = [
        { field: 'phone', values: [phoneData.phone, phoneData.altPhoneWithNine] },
        { field: 'external_key', values: [phoneData.externalKey, phoneData.altExternalKeyWithNine] },
        { field: 'wa_id', values: [phoneData.waId, phoneData.altWaIdWithNine] }
    ];

    for (const item of fieldsToCheck) {
        for (const value of item.values) {
            const { data, error } = await supabase
                .from('leads')
                .select('id')
                .eq(item.field, value)
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                return data[0];
            }
        }
    }

    return null;
}

module.exports = async (req, res) => {
    const { name, phone } = req.body;

    if (!name || !phone) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'name' e 'phone' sao obrigatorios."
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

    const leadId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        console.log(`[CRM] Criando lead manual: ${trimmedName} (${normalizedPhone.phone})`);

        const existingLead = await findExistingLeadByPhoneVariants(normalizedPhone);
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
                name: trimmedName,
                phone: normalizedPhone.phone,
                external_key: normalizedPhone.externalKey,
                whatsapp_from: normalizedPhone.whatsappFrom,
                wa_id: normalizedPhone.waId,
                last_message: '',
                last_message_preview: '',
                last_message_at: null,
                last_inbound_at: null,
                created_at: now,
                updated_at: now,
                unread_count: 0,
                message_count_total: 0,
                inbound_count: 0,
                messages_after_last_resume: 0
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
