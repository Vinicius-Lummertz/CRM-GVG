const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function hashToken(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizePhone(rawPhone) {
    if (typeof rawPhone !== 'string') return null;

    const digits = rawPhone.trim().replace(/^whatsapp:/i, '').replace(/\D/g, '');
    if (!digits || digits.length < 10 || digits.length > 15) return null;

    return `+${digits}`;
}

function extractBearerToken(req) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token.trim();
}

async function findSessionByAccessToken(accessToken) {
    const tokenHash = hashToken(accessToken);

    const { data, error } = await supabase
        .from('auth_sessions')
        .select('id, profile_id, expires_at')
        .eq('access_token_hash', tokenHash)
        .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
}

async function resolveProfileCompany(profileId, requestedCompanyId) {
    let query = supabase
        .from('company_members')
        .select('company_id, role, joined_at')
        .eq('profile_id', profileId)
        .order('joined_at', { ascending: true });

    if (requestedCompanyId) {
        query = query.eq('company_id', requestedCompanyId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) return null;
    return data[0];
}

async function authRequired(req, res, next) {
    try {
        const accessToken = extractBearerToken(req);
        if (!accessToken) {
            return res.status(401).json({ success: false, error: 'Nao autenticado.' });
        }

        const session = await findSessionByAccessToken(accessToken);
        if (!session) {
            return res.status(401).json({ success: false, error: 'Sessao invalida.' });
        }

        const expiresAt = new Date(session.expires_at);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
            return res.status(401).json({ success: false, error: 'Sessao expirada.' });
        }

        const requestedCompanyId = (req.headers['x-company-id'] || '').toString().trim() || null;
        const membership = await resolveProfileCompany(session.profile_id, requestedCompanyId);

        if (!membership) {
            return res.status(403).json({
                success: false,
                error: requestedCompanyId
                    ? 'Voce nao possui acesso a empresa informada.'
                    : 'Nenhuma empresa associada a este usuario.'
            });
        }

        req.auth = {
            accessToken,
            profileId: session.profile_id,
            companyId: membership.company_id,
            role: membership.role
        };

        return next();
    } catch (error) {
        console.error('Erro no middleware de autenticacao:', error);
        return res.status(500).json({ success: false, error: 'Erro interno de autenticacao.' });
    }
}

async function findAuthUserByPhone(phone) {
    const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
    });

    if (error) throw error;
    const users = (data && data.users) || [];

    return users.find((user) => {
        const normalizedUserPhone = normalizePhone(user.phone || '');
        return normalizedUserPhone === phone;
    }) || null;
}

async function findOrCreateProfileByPhone(phone, now) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
        throw new Error('Telefone invalido para criar perfil.');
    }

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', normalizedPhone)
        .limit(1);

    if (profileError) throw profileError;
    if (profiles && profiles.length > 0) return profiles[0];

    let authUser = null;

    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        phone_confirm: true
    });

    if (createUserError) {
        authUser = await findAuthUserByPhone(normalizedPhone);
        if (!authUser) throw createUserError;
    } else {
        authUser = createdUser.user;
    }

    const profilePayload = {
        id: authUser.id,
        phone: normalizedPhone,
        full_name: null,
        created_at: now.toISOString()
    };

    const { data: insertedProfile, error: insertProfileError } = await supabase
        .from('profiles')
        .insert([profilePayload])
        .select('*')
        .limit(1);

    if (insertProfileError) throw insertProfileError;
    return insertedProfile[0];
}

async function ensureDefaultCompanyForProfile(profile, now) {
    const { data: memberships, error: memberError } = await supabase
        .from('company_members')
        .select('company_id, role, joined_at')
        .eq('profile_id', profile.id)
        .order('joined_at', { ascending: true })
        .limit(1);

    if (memberError) throw memberError;
    if (memberships && memberships.length > 0) return memberships[0];

    const companyName = profile.full_name
        ? `Empresa de ${profile.full_name}`
        : `Empresa ${profile.phone}`;

    const { data: createdCompany, error: createCompanyError } = await supabase
        .from('companies')
        .insert([{
            name: companyName,
            commercial_phone: profile.phone,
            created_at: now.toISOString()
        }])
        .select('id, name')
        .limit(1);

    if (createCompanyError) throw createCompanyError;

    const company = createdCompany[0];
    const { error: createMemberError } = await supabase
        .from('company_members')
        .insert([{
            company_id: company.id,
            profile_id: profile.id,
            role: 'owner',
            joined_at: now.toISOString()
        }]);

    if (createMemberError) throw createMemberError;

    return {
        company_id: company.id,
        role: 'owner',
        joined_at: now.toISOString()
    };
}

async function listCompaniesForProfile(profileId) {
    const { data, error } = await supabase
        .from('company_members')
        .select('role, companies(id, name, commercial_phone)')
        .eq('profile_id', profileId);

    if (error) throw error;

    return (data || [])
        .map((row) => ({
            id: row.companies && row.companies.id ? row.companies.id : null,
            name: row.companies && row.companies.name ? row.companies.name : null,
            commercial_phone: row.companies && row.companies.commercial_phone ? row.companies.commercial_phone : null,
            role: row.role
        }))
        .filter((company) => company.id);
}

async function createSession(profileId, now) {
    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { error } = await supabase
        .from('auth_sessions')
        .insert([{
            profile_id: profileId,
            access_token_hash: hashToken(accessToken),
            refresh_token_hash: hashToken(refreshToken),
            expires_at: expiresAt.toISOString(),
            created_at: now.toISOString()
        }]);

    if (error) throw error;

    return {
        accessToken,
        refreshToken,
        expiresAt: expiresAt.toISOString()
    };
}

module.exports = {
    authRequired,
    createSession,
    ensureDefaultCompanyForProfile,
    findOrCreateProfileByPhone,
    listCompaniesForProfile,
    normalizePhone
};
