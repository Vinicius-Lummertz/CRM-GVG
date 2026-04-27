const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function normalizeDigits(value) {
    return value ? value.toString().replace(/\D/g, '') : '';
}

function normalizeWebhookPhone(rawPhone) {
    const digits = normalizeDigits(rawPhone ? rawPhone.toString().replace(/^whatsapp:/i, '') : '');
    return digits ? `+${digits}` : null;
}

function addPhoneVariant(candidates, digits) {
    if (!digits) return;

    candidates.add(digits);

    // Brasil: compatibilidade entre numeros com e sem o nono digito apos o DDD.
    if (digits.startsWith('55')) {
        if (digits.length === 13 && digits[4] === '9') {
            candidates.add(`${digits.slice(0, 4)}${digits.slice(5)}`);
        } else if (digits.length === 12) {
            candidates.add(`${digits.slice(0, 4)}9${digits.slice(4)}`);
        }
    }
}

function buildPhoneCandidates(rawPhone) {
    const digits = normalizeDigits(rawPhone);
    const candidates = new Set();

    addPhoneVariant(candidates, digits);

    if (digits && !digits.startsWith('55')) {
        addPhoneVariant(candidates, `55${digits}`);
    }

    return Array.from(candidates);
}

async function resolveCompanyWhatsappNumber(rawTo) {
    const phoneNumber = normalizeWebhookPhone(rawTo);
    if (!phoneNumber) return null;

    const { data, error } = await supabase
        .from('company_whatsapp_numbers')
        .select('id, company_id, phone_number')
        .eq('phone_number', phoneNumber)
        .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
}

async function findExistingLeadByWebhookPhone(companyId, from) {
    const matchesById = new Map();
    const exactExternalKey = from ? from.toString().trim() : '';

    if (exactExternalKey) {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('company_id', companyId)
            .eq('external_key', exactExternalKey)
            .order('updated_at', { ascending: false })
            .limit(1);

        if (error) throw error;
        (data || []).forEach((lead) => matchesById.set(lead.id, lead));
    }

    const candidates = buildPhoneCandidates(from);
    const fields = ['phone', 'external_key', 'whatsapp_from', 'wa_id'];

    for (const digits of candidates) {
        const valuesByField = {
            phone: [`+${digits}`, digits],
            external_key: [`whatsapp:+${digits}`],
            whatsapp_from: [`whatsapp:+${digits}`],
            wa_id: [digits]
        };

        for (const field of fields) {
            for (const value of valuesByField[field]) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq(field, value)
                    .order('updated_at', { ascending: false })
                    .limit(1);

                if (error) throw error;
                (data || []).forEach((lead) => matchesById.set(lead.id, lead));
            }
        }
    }

    const matches = Array.from(matchesById.values());
    if (matches.length === 0) return null;

    return matches.sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
    })[0];
}

function sendEmptyTwiml(res) {
    const twiml = new twilio.twiml.MessagingResponse();
    return res.status(200).type('text/xml').send(twiml.toString());
}

module.exports = async (req, res) => {
    const { From, To, Body, MessageSid, ProfileName } = req.body || {};

    console.log(`\n=== NOVO WEBHOOK RECEBIDO ===`);
    console.log(`De: ${From || '[sem From]'} | Para: ${To || '[sem To]'} | Nome: ${ProfileName || 'Desconhecido'}`);
    console.log(`Mensagem: ${Body || ''}`);

    const now = new Date().toISOString();
    let leadId;

    try {
        if (!From) {
            console.warn("[CRM] Webhook recebido sem campo From. Payload:", req.body);
            return sendEmptyTwiml(res);
        }

        const companyWhatsappNumber = await resolveCompanyWhatsappNumber(To);
        if (!companyWhatsappNumber) {
            console.error(`[CRM] Numero comercial nao mapeado para empresa: ${To || '[sem To]'}`);
            return sendEmptyTwiml(res);
        }

        if (MessageSid) {
            const { data: duplicateMessages, error: duplicateError } = await supabase
                .from('messages')
                .select('id, lead_id')
                .eq('company_id', companyWhatsappNumber.company_id)
                .or(`provider_message_id.eq.${MessageSid},message_sid.eq.${MessageSid},idempotency_key.eq.${MessageSid}`)
                .limit(1);

            if (duplicateError) throw duplicateError;
            if (duplicateMessages && duplicateMessages.length > 0) {
                console.log(`[CRM] Webhook duplicado ignorado. SID: ${MessageSid}`);
                return sendEmptyTwiml(res);
            }
        }

        const existingLead = await findExistingLeadByWebhookPhone(companyWhatsappNumber.company_id, From);

        if (existingLead) {
            const lead = existingLead;
            leadId = lead.id;

            const { error: updateError } = await supabase
                .from('leads')
                .update({
                    name: (ProfileName && lead.name === 'Sem nome') ? ProfileName : lead.name,
                    whatsapp_number_id: lead.whatsapp_number_id || companyWhatsappNumber.id,
                    last_message: Body || '',
                    last_message_preview: Body ? Body.substring(0, 50) : '',
                    last_message_at: now,
                    last_inbound_at: now,
                    updated_at: now,
                    unread_count: Number(lead.unread_count || 0) + 1,
                    message_count_total: Number(lead.message_count_total || 0) + 1,
                    inbound_count: Number(lead.inbound_count || 0) + 1,
                    messages_after_last_resume: Number(lead.messages_after_last_resume || 0) + 1
                })
                .eq('id', leadId)
                .eq('company_id', companyWhatsappNumber.company_id);

            if (updateError) console.error("Erro ao atualizar lead existente:", updateError);
            else console.log(`[CRM] Lead atualizado no banco. ID: ${leadId}`);
        } else {
            leadId = crypto.randomUUID();

            const phoneOnly = From.replace(/^whatsapp:/i, '');
            const waId = normalizeDigits(phoneOnly);

            const { error: insertError } = await supabase
                .from('leads')
                .insert([{
                    id: leadId,
                    company_id: companyWhatsappNumber.company_id,
                    whatsapp_number_id: companyWhatsappNumber.id,
                    external_key: From,
                    phone: phoneOnly,
                    whatsapp_from: From,
                    wa_id: waId,
                    name: ProfileName || 'Sem nome',
                    last_message: Body || '',
                    last_message_preview: Body ? Body.substring(0, 50) : '',
                    last_message_at: now,
                    last_inbound_at: now,
                    created_at: now,
                    updated_at: now,
                    unread_count: 1,
                    message_count_total: 1,
                    inbound_count: 1,
                    messages_after_last_resume: 1
                }]);

            if (insertError) throw insertError;
            console.log(`[CRM] + Novo lead dinamico criado! ID: ${leadId}`);
        }

        const messageId = crypto.randomUUID();
        const providerMessageId = MessageSid || messageId;

        const { error: msgError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                company_id: companyWhatsappNumber.company_id,
                whatsapp_number_id: companyWhatsappNumber.id,
                lead_id: leadId,
                message_sid: providerMessageId,
                provider_message_id: providerMessageId,
                direction: 'inbound',
                body: Body || '',
                preview: Body ? Body.substring(0, 50) : '',
                message_type: 'text',
                sent_by_customer: 1,
                delivery_status: 'received',
                mode: 'real',
                idempotency_key: providerMessageId,
                raw_payload_json: JSON.stringify(req.body || {}),
                created_at: now
            }]);

        if (msgError) {
            console.error("Erro ao salvar a mensagem recebida no DB:", msgError);
        } else {
            console.log(`[CRM] Mensagem armazenada e linkada ao Lead ${leadId}`);
        }
    } catch (dbError) {
        console.error("Erro ao processar as acoes de banco de dados no webhook:", dbError);
    }

    return sendEmptyTwiml(res);
};
