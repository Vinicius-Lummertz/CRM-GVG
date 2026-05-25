type StoredCompany = {
  id: string;
  name: string;
};

type DevSession = {
  authPhone: string | null;
  profileId: string | null;
  companies: StoredCompany[];
  selectedCompanyId: string;
  isBypass: boolean;
};

const DEV_AUTH_PHONE = '5500000000000';
const DEV_PROFILE_ID = '00000000-0000-0000-0000-000000000000';

export function ensureDevSession(companyId?: string): DevSession {
  const isEnabled = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
  const authPhone = localStorage.getItem('auth_phone');
  const profileId = localStorage.getItem('auth_profile_id');
  const selectedCompanyId = companyId || localStorage.getItem('selected_company_id') || '';
  const isExistingBypass = authPhone === DEV_AUTH_PHONE && profileId === DEV_PROFILE_ID;

  if (selectedCompanyId) {
    localStorage.setItem('selected_company_id', selectedCompanyId);
  }

  if (!isEnabled || authPhone) {
    const companies = ensureStoredCompany(selectedCompanyId, readStoredCompanies());
    return {
      authPhone,
      profileId,
      companies,
      selectedCompanyId,
      isBypass: isEnabled && isExistingBypass,
    };
  }

  const companies = ensureStoredCompany(selectedCompanyId, readStoredCompanies());

  localStorage.setItem('authenticated', 'true');
  localStorage.setItem('auth_phone', DEV_AUTH_PHONE);
  localStorage.setItem('auth_profile_id', DEV_PROFILE_ID);

  return {
    authPhone: DEV_AUTH_PHONE,
    profileId: DEV_PROFILE_ID,
    companies,
    selectedCompanyId,
    isBypass: true,
  };
}

function readStoredCompanies(): StoredCompany[] {
  try {
    const raw = localStorage.getItem('auth_companies');
    return raw ? JSON.parse(raw) as StoredCompany[] : [];
  } catch {
    return [];
  }
}

function ensureStoredCompany(companyId: string, companies: StoredCompany[]): StoredCompany[] {
  if (!companyId || companies.some((company) => company.id === companyId)) {
    return companies;
  }

  const nextCompanies = [
    ...companies,
    {
      id: companyId,
      name: 'Empresa dev',
    },
  ];

  localStorage.setItem('auth_companies', JSON.stringify(nextCompanies));
  return nextCompanies;
}
