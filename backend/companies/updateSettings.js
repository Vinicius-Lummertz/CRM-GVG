const { createClient } = require('@supabase/supabase-js');
const {
    isValidUuid,
    parseOptionalString,
    parseRequiredString
} = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { companyId } = req.params;
    const userId = parseOptionalString(req.body.user_id || req.query.user_id);

    if (!isValidUuid(companyId)) {
        return res.status(400).json({ success: false, error: "Parametro 'companyId' deve ser um UUID valido." });
    }

    if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({ success: false, error: "Informe 'user_id' valido para atualizar configuracoes da empresa." });
    }

    try {
        const { data: membership, error: membershipError } = await supabase
            .from('company_members')
            .select('id, role')
            .eq('company_id', companyId)
            .eq('profile_id', userId)
            .maybeSingle();

        if (membershipError) throw membershipError;
        if (!membership) {
            return res.status(403).json({ success: false, error: "Usuario sem acesso a esta empresa." });
        }

        if (!['owner', 'admin'].includes(membership.role)) {
            return res.status(403).json({ success: false, error: "Apenas owner/admin podem alterar configuracoes da empresa." });
        }

        const payload = {};

        if (req.body.name !== undefined) {
            const name = parseRequiredString(req.body.name, 'name');
            if (name.error) return res.status(400).json({ success: false, error: name.error });
            payload.name = name.value;
        }

        if (req.body.commercial_phone !== undefined) {
            const commercialPhone = parseRequiredString(req.body.commercial_phone, 'commercial_phone');
            if (commercialPhone.error) return res.status(400).json({ success: false, error: commercialPhone.error });
            payload.commercial_phone = commercialPhone.value;
        }

        const hasConnectionFields = (
            req.body.display_name !== undefined
            || req.body.meta_business_id !== undefined
            || req.body.meta_phone_number_id !== undefined
        );

        if (hasConnectionFields) {
            const { data: company, error: companyError } = await supabase
                .from('companies')
                .select('company_settings')
                .eq('id', companyId)
                .single();

            if (companyError) throw companyError;

            const currentSettings = company.company_settings && typeof company.company_settings === 'object'
                ? company.company_settings
                : {};

            const currentConnection = currentSettings.chat_connection && typeof currentSettings.chat_connection === 'object'
                ? currentSettings.chat_connection
                : {};

            const nextConnection = {
                ...currentConnection
            };

            if (req.body.display_name !== undefined) {
                nextConnection.display_name = parseOptionalString(req.body.display_name);
            }
            if (req.body.meta_business_id !== undefined) {
                nextConnection.meta_business_id = parseOptionalString(req.body.meta_business_id);
            }
            if (req.body.meta_phone_number_id !== undefined) {
                nextConnection.meta_phone_number_id = parseOptionalString(req.body.meta_phone_number_id);
            }

            payload.company_settings = {
                ...currentSettings,
                chat_connection: nextConnection
            };
        }

        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ success: false, error: "Informe ao menos um campo para atualizar." });
        }

        const { data: updatedCompany, error: updateError } = await supabase
            .from('companies')
            .update(payload)
            .eq('id', companyId)
            .select('*')
            .single();

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            company: updatedCompany,
            message: "Configuracoes da empresa atualizadas com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao atualizar configuracoes da empresa:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
