const { createClient } = require('@supabase/supabase-js');
const { isValidUuid, normalizePhone, parseOptionalString } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { id, full_name, avatar_url } = req.body;
    const phone = normalizePhone(req.body.phone, 'phone');

    if (!id || !isValidUuid(id)) {
        return res.status(400).json({ success: false, error: "O campo 'id' deve ser um UUID valido." });
    }

    if (phone.error) {
        return res.status(400).json({ success: false, error: phone.error });
    }

    try {
        console.log(`[CRM] Salvando perfil: ${phone.value}`);

        const { data: profile, error } = await supabase
            .from('profiles')
            .upsert([{
                id,
                full_name: parseOptionalString(full_name),
                phone: phone.value,
                avatar_url: parseOptionalString(avatar_url)
            }], { onConflict: 'id' })
            .select('*')
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            profile,
            message: "Perfil salvo com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao salvar perfil:", error);

        if (error.code === '23505') {
            return res.status(409).json({ success: false, error: "Este numero de acesso ja esta vinculado a outro perfil." });
        }

        return res.status(500).json({ success: false, error: error.message });
    }
};
