const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function normalizeWebhookPhone(rawPhone) {
    if (!rawPhone) return null;

    const digits = rawPhone.toString().replace(/^whatsapp:/i, '').replace(/\D/g, '');
    return digits ? `+${digits}` : null;
}

// Gera variantes do telefone (formato E.164) para tolerar a diferenca do '9' apos
// o DDD em numeros brasileiros. Sem isso, um lead salvo num formato e a resposta
// chegando no outro nao casam, e o webhook acaba criando uma conversa duplicada.
function buildPhoneVariants(normalizedPhone) {
    if (!normalizedPhone) return [];

    const digits = normalizedPhone.replace(/\D/g, '');
    const variants = new Set();
    variants.add(`+${digits}`);

    if (digits.startsWith('55') && digits.length >= 5) {
        if (digits[4] === '9') {
            variants.add(`+${digits.slice(0, 4)}${digits.slice(5)}`);
        } else {
            variants.add(`+${digits.slice(0, 4)}9${digits.slice(4)}`);
        }
    }

    return Array.from(variants);
}

// Extrai a primeira midia anexada (figurinha, imagem, video, GIF, audio) do payload
// do Twilio. Quando so vem midia, o Body chega vazio; por isso geramos um rotulo
// legivel para o historico do CRM em vez de salvar uma mensagem em branco.
function extractMedia(body) {
    const numMedia = Number.parseInt(body && body.NumMedia, 10);
    if (!Number.isFinite(numMedia) || numMedia <= 0) {
        return { hasMedia: false, mediaUrl: null, mediaType: null, label: null };
    }

    const mediaUrl = body.MediaUrl0 || null;
    const mediaType = body.MediaContentType0 || null;

    let label = '[Mídia]';
    if (mediaType) {
        if (mediaType.startsWith('image/gif')) label = '[GIF]';
        else if (mediaType.startsWith('image/webp')) label = '[Figurinha]';
        else if (mediaType.startsWith('image/')) label = '[Imagem]';
        else if (mediaType.startsWith('video/')) label = '[Vídeo]';
        else if (mediaType.startsWith('audio/')) label = '[Áudio]';
        else label = '[Documento]';
    }

    return { hasMedia: true, mediaUrl, mediaType, label };
}

async function resolveCompanyWhatsappNumber(rawTo) {
    const phoneNumber = normalizeWebhookPhone(rawTo);
    if (!phoneNumber) return null;

    const { data, error } = await supabase
        .from('companies')
        .select('id, commercial_phone')
        .eq('commercial_phone', phoneNumber)
        .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
}

module.exports = async (req, res) => {
    const { From, To, Body, MessageSid, ProfileName } = req.body;

    const media = extractMedia(req.body);
    // Texto que vai pro historico: o corpo digitado ou, quando so veio midia, o rotulo.
    const summaryText = (Body && Body.trim()) ? Body : (media.hasMedia ? media.label : Body || '');

    console.log(`\n=== NOVO WEBHOOK RECEBIDO ===`);
    console.log(`De: ${From} | Para: ${To} | Nome: ${ProfileName || 'Desconhecido'}`);
    console.log(`Mensagem: ${Body}${media.hasMedia ? ` (+midia ${media.mediaType})` : ''}`);

    const now = new Date().toISOString();
    let leadId;

    try {
        const companyWhatsappNumber = await resolveCompanyWhatsappNumber(To);
        if (!companyWhatsappNumber) {
            console.error(`[CRM] Numero comercial nao mapeado para empresa: ${To}`);
            const twiml = new twilio.twiml.MessagingResponse();
            return res.status(200).type('text/xml').send(twiml.toString());
        }

        const phoneVariants = buildPhoneVariants(normalizeWebhookPhone(From));
        const { data: existingLeads, error: findError } = await supabase
            .from('leads')
            .select('*')
            .eq('company_id', companyWhatsappNumber.id)
            .in('phone', phoneVariants)
            .limit(1);

        if (findError) throw findError;

        if (existingLeads && existingLeads.length > 0) {
            const lead = existingLeads[0];
            leadId = lead.id;

            const { error: updateError } = await supabase
                .from('leads')
                .update({
                    name: (ProfileName && lead.name === 'Sem nome') ? ProfileName : lead.name,
                    updated_at: now,
                    last_inbound_at: now,
                    last_conversation_summary: summaryText || lead.last_conversation_summary
                })
                .eq('id', leadId)
                .eq('company_id', companyWhatsappNumber.id);

            if (updateError) console.error("Erro ao atualizar lead existente:", updateError);
            else console.log(`[CRM] Lead atualizado no banco. ID: ${leadId}`);
        } else {
            leadId = crypto.randomUUID();

            const phoneOnly = normalizeWebhookPhone(From);

            const { error: insertError } = await supabase
                .from('leads')
                .insert([{
                    id: leadId,
                    company_id: companyWhatsappNumber.id,
                    phone: phoneOnly,
                    name: ProfileName || 'Sem nome',
                    last_conversation_summary: summaryText || null,
                    created_at: now,
                    updated_at: now,
                    last_inbound_at: now
                }]);

            if (insertError) throw insertError;
            console.log(`[CRM] + Novo lead dinamico criado! ID: ${leadId}`);
        }

        const messageId = crypto.randomUUID();
        const { error: msgError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                lead_id: leadId,
                sender_id: null,
                direction: 'inbound',
                content: summaryText || '',
                has_media: media.hasMedia,
                media_url: media.mediaUrl,
                created_at: now
            }]);

        if (msgError) {
            console.error("Erro ao salvar a mensagem recebida no DB:", msgError);
        } else {
            console.log(`[CRM] Mensagem armazenada e linkada ao Lead ${leadId}`);
        }

        await supabase
            .from('leads')
            .update({
                updated_at: now,
                last_inbound_at: now,
                last_conversation_summary: summaryText || null
            })
            .eq('id', leadId)
            .eq('company_id', companyWhatsappNumber.id);
    } catch (dbError) {
        console.error("Erro ao processar as acoes de banco de dados no webhook:", dbError);
    }

    const twiml = new twilio.twiml.MessagingResponse();
    res.status(200).type('text/xml').send(twiml.toString());
};
