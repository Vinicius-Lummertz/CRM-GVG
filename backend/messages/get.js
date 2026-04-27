const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function normalizeWebhookPhone(rawPhone) {
    if (!rawPhone) return null;

    const digits = rawPhone.toString().replace(/^whatsapp:/i, '').replace(/\D/g, '');
    return digits ? `+${digits}` : null;
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

module.exports = async (req, res) => {
    const { From, To, Body, MessageSid, ProfileName } = req.body;

    console.log(`\n=== NOVO WEBHOOK RECEBIDO ===`);
    console.log(`De: ${From} | Para: ${To} | Nome: ${ProfileName || 'Desconhecido'}`);
    console.log(`Mensagem: ${Body}`);

    const now = new Date().toISOString();
    let leadId;

    try {
        const companyWhatsappNumber = await resolveCompanyWhatsappNumber(To);
        if (!companyWhatsappNumber) {
            console.error(`[CRM] Numero comercial nao mapeado para empresa: ${To}`);
            const twiml = new twilio.twiml.MessagingResponse();
            return res.status(200).type('text/xml').send(twiml.toString());
        }

        const { data: existingLeads, error: findError } = await supabase
            .from('leads')
            .select('*')
            .eq('company_id', companyWhatsappNumber.company_id)
            .eq('external_key', From)
            .limit(1);

        if (findError) throw findError;

        if (existingLeads && existingLeads.length > 0) {
            const lead = existingLeads[0];
            leadId = lead.id;

            const { error: updateError } = await supabase
                .from('leads')
                .update({
                    name: (ProfileName && lead.name === 'Sem nome') ? ProfileName : lead.name,
                    whatsapp_number_id: lead.whatsapp_number_id || companyWhatsappNumber.id,
                    last_message: Body,
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

            const phoneOnly = From.replace('whatsapp:', '');
            const waId = phoneOnly.replace('+', '');

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
                    last_message: Body,
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
        const { error: msgError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                company_id: companyWhatsappNumber.company_id,
                whatsapp_number_id: companyWhatsappNumber.id,
                lead_id: leadId,
                message_sid: MessageSid,
                provider_message_id: MessageSid,
                direction: 'inbound',
                body: Body,
                preview: Body ? Body.substring(0, 50) : '',
                message_type: 'text',
                sent_by_customer: 1,
                delivery_status: 'received',
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

    const twiml = new twilio.twiml.MessagingResponse();
    res.status(200).type('text/xml').send(twiml.toString());
};
