const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    // O Twilio manda os dados no formato form-urlencoded
    // ProfileName costuma vir nas requisições do WhatsApp Business API
    const { From, To, Body, MessageSid, ProfileName } = req.body;

    console.log(`\n=== NOVO WEBHOOK RECEBIDO ===`);
    console.log(`De: ${From} | Nome: ${ProfileName || 'Desconhecido'}`);
    console.log(`Mensagem: ${Body}`);

    const now = new Date().toISOString();
    let leadId;

    try {
        // 1. Procurar se o Lead já existe pelo external_key (neste caso, o "From")
        const { data: existingLeads, error: findError } = await supabase
            .from('leads')
            .select('*')
            .eq('external_key', From)
            .limit(1);

        if (findError) throw findError;

        if (existingLeads && existingLeads.length > 0) {
            // LEAD EXISTE: Apenas atualizamos os contadores e datas dele
            const lead = existingLeads[0];
            leadId = lead.id;

            const { error: updateError } = await supabase
                .from('leads')
                .update({
                    name: (ProfileName && lead.name === 'Sem nome') ? ProfileName : lead.name,
                    last_message: Body,
                    last_message_preview: Body ? Body.substring(0, 50) : '',
                    last_message_at: now,
                    last_inbound_at: now,
                    updated_at: now,
                    unread_count: lead.unread_count + 1,
                    message_count_total: lead.message_count_total + 1,
                    inbound_count: lead.inbound_count + 1,
                    messages_after_last_resume: lead.messages_after_last_resume + 1
                })
                .eq('id', leadId);

            if (updateError) console.error("Erro ao atualizar lead existente:", updateError);
            else console.log(`[CRM] Lead atualizado no banco. ID: ${leadId}`);

        } else {
            // LEAD NOVO: Inserção dinâmica no banco
            leadId = crypto.randomUUID();

            // Limpamos a string do telefone ('whatsapp:+5548...' -> '5548...')
            const phoneOnly = From.replace('whatsapp:', '');
            const waId = phoneOnly.replace('+', '');

            const { error: insertError } = await supabase
                .from('leads')
                .insert([{
                    id: leadId,
                    external_key: From, // Ex: whatsapp:+5548...
                    phone: phoneOnly,
                    whatsapp_from: From,
                    wa_id: waId,
                    name: ProfileName || 'Sem nome', // Tenta pegar o nome do perfil de WA
                    last_message: Body,
                    last_message_preview: Body ? Body.substring(0, 50) : '',
                    last_message_at: now,
                    last_inbound_at: now,
                    created_at: now,
                    updated_at: now,
                    unread_count: 1,
                    message_count_total: 1,
                    inbound_count: 1
                }]);

            if (insertError) throw insertError;
            console.log(`[CRM] + Novo lead dinâmico criado! ID: ${leadId}`);
        }

        // 2. Gravar o Histórico da Mensagem que Acabou de Chegar
        const messageId = crypto.randomUUID();
        const { error: msgError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                lead_id: leadId,
                message_sid: MessageSid,
                provider_message_id: MessageSid,
                direction: 'inbound',
                body: Body,
                preview: Body ? Body.substring(0, 50) : '',
                message_type: 'text',
                sent_by_customer: 1,  // Flag: Veio do cliente para o bot
                delivery_status: 'received',
                created_at: now
            }]);

        if (msgError) {
            console.error("Erro ao salvar a mensagem recebida no DB:", msgError);
        } else {
            console.log(`[CRM] Mensagem armazenada e linkada ao Lead ${leadId}`);
        }

    } catch (dbError) {
        console.error("Erro ao processar as ações de banco de dados no webhook:", dbError);
    }

    // 3. Resposta Padrão do Twilio (TwiML em XML)
    // Precisamos sempre devolver 200 pro Twilio entender que a requisição não falhou!
    const twiml = new twilio.twiml.MessagingResponse();
    res.status(200).type('text/xml').send(twiml.toString());
};
