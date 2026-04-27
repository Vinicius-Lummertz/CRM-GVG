"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ConversationWindow {
  is_open: boolean;
  expires_at: string | null;
  remaining_seconds: number;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  external_key: string;
  wa_id: string;
  updated_at: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count?: number;
  conversation_window?: ConversationWindow;
}

interface Company {
  id: string;
  name: string;
  role?: string;
  whatsapp_numbers?: Array<{
    id: string;
    phone_number: string;
    label?: string;
    status?: string;
  }>;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function persistCompanies(companies: Company[], selectedCompanyId?: string) {
  localStorage.setItem('auth_companies', JSON.stringify(companies));
  if (selectedCompanyId) localStorage.setItem('selected_company_id', selectedCompanyId);
}

function formatWindowLabel(lead: Lead) {
  if (!lead.conversation_window?.is_open) return 'Janela fechada';

  const hours = Math.floor((lead.conversation_window.remaining_seconds || 0) / 3600);
  if (hours <= 0) return 'Janela aberta';
  return `${hours}h restantes`;
}

export default function LeadsPage() {
  const router = useRouter();
  const [authPhone] = useState<string | null>(() => (
    typeof window !== 'undefined' ? localStorage.getItem('auth_phone') : null
  ));
  const [profileId] = useState<string | null>(() => (
    typeof window !== 'undefined' ? localStorage.getItem('auth_profile_id') : null
  ));
  const [companies, setCompanies] = useState<Company[]>(() => readJson<Company[]>('auth_companies', []));
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => (
    typeof window !== 'undefined' ? localStorage.getItem('selected_company_id') || '' : ''
  ));
  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || companies[0] || null,
    [companies, selectedCompanyId]
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDdd, setNewDdd] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [businessDdd, setBusinessDdd] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState('');

  const activeCompanyId = selectedCompany?.id || '';

  const fetchCompanies = useCallback(async () => {
    if (!profileId) return;

    const res = await fetch(`/api/v2/companies?user_id=${encodeURIComponent(profileId)}`, { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Nao foi possivel carregar empresas.');
    }

    const fetched = (data.companies || []) as Company[];
    const storedCompanyId = localStorage.getItem('selected_company_id') || '';
    const nextSelected = fetched.some((company) => company.id === storedCompanyId)
      ? storedCompanyId
      : fetched[0]?.id || '';

    setCompanies(fetched);
    setSelectedCompanyId(nextSelected);
    persistCompanies(fetched, nextSelected);
  }, [profileId]);

  const fetchLeads = useCallback(async (query: string = '') => {
    if (!activeCompanyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ company_id: activeCompanyId });
      if (query) {
        params.set('search', query);
        params.set('by', 'auto');
      }

      const res = await fetch(`/api/v2/leads?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        setLeads(data.leads || []);
      } else {
        setError(data.error || 'Erro ao carregar leads');
      }
    } catch {
      setError('Erro de conexao com a API de Leads');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (!authPhone) {
      router.push('/');
      return;
    }

    if (!profileId) {
      const timer = window.setTimeout(() => {
        setError('Seu login foi validado, mas o perfil ainda nao foi preparado. Entre novamente para concluir a configuracao.');
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      void fetchCompanies().catch((err: unknown) => {
        setCompanyError(err instanceof Error ? err.message : 'Nao foi possivel carregar suas empresas.');
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authPhone, fetchCompanies, profileId, router]);

  useEffect(() => {
    if (companies.length === 0 || !activeCompanyId) {
      const timer = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      void fetchLeads();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeCompanyId, companies.length, fetchLeads]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(search);
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    localStorage.setItem('selected_company_id', companyId);
  };

  const formatDdd = (value: string) => value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 3);
  const formatPhone = (value: string) => {
    let next = value.replace(/\D/g, '').slice(0, 9);
    if (next.length > 5) next = next.replace(/^(\d{5})(\d{1,4})/, '$1-$2');
    return next;
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError('');

    if (!profileId) {
      setCompanyError('Perfil de acesso indisponivel. Entre novamente.');
      return;
    }
    if (!companyName.trim()) {
      setCompanyError('Informe o nome da empresa.');
      return;
    }

    setCompanyLoading(true);

    try {
      const companyRes = await fetch('/api/v2/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyName.trim(), owner_id: profileId }),
      });
      const companyPayload = await companyRes.json();

      if (!companyRes.ok || !companyPayload.success) {
        setCompanyError(companyPayload.error || 'Nao foi possivel criar a empresa.');
        return;
      }

      const createdCompany = companyPayload.company as Company;
      const cleanBusinessPhone = businessPhone.replace(/\D/g, '');

      if (businessDdd.length >= 2 && cleanBusinessPhone.length >= 8) {
        const numberRes = await fetch(`/api/v2/companies/${createdCompany.id}/whatsapp-numbers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone_number: `55${businessDdd}${cleanBusinessPhone}`,
            label: 'Comercial',
            provider: 'meta',
            status: 'pending',
            api_config: {},
          }),
        });
        const numberPayload = await numberRes.json();

        if (numberRes.ok && numberPayload.success) {
          createdCompany.whatsapp_numbers = [numberPayload.whatsappNumber];
        }
      }

      const nextCompanies = [...companies, createdCompany];
      setCompanies(nextCompanies);
      setSelectedCompanyId(createdCompany.id);
      persistCompanies(nextCompanies, createdCompany.id);
      setCompanyName('');
      setBusinessDdd('');
      setBusinessPhone('');
      void fetchLeads();
    } catch {
      setCompanyError('Falha de conexao ao criar empresa.');
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const cleanPhone = newPhone.replace(/\D/g, '');

    if (!activeCompanyId) {
      setAddError('Selecione ou crie uma empresa antes de adicionar leads.');
      return;
    }
    if (!newName.trim()) {
      setAddError('O nome e obrigatorio.');
      return;
    }
    if (!newDdd || newDdd.length < 2) {
      setAddError('DDD invalido.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      setAddError('Numero invalido.');
      return;
    }

    setAddLoading(true);

    const fullPhone = `55${newDdd}${cleanPhone}`;
    try {
      const res = await fetch('/api/v2/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ company_id: activeCompanyId, name: newName, phone: fullPhone })
      });
      const data = await res.json();

      if (data.success || res.status === 201) {
        setShowAdd(false);
        setNewName('');
        setNewDdd('');
        setNewPhone('');
        fetchLeads();
      } else {
        setAddError(data.error || 'Erro ao adicionar lead');
      }
    } catch {
      setAddError('Erro de conexao ao adicionar lead');
    } finally {
      setAddLoading(false);
    }
  };

  if (!authPhone) return null;

  if (!activeCompanyId) {
    return (
      <div className="container animate-fade-in w-full py-10">
        <div className="card p-8 max-w-5xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl mb-2">Configure sua primeira empresa</h2>
            <p className="text-secondary">
              Voce entra com seu numero pessoal. Os leads ficam vinculados a empresa e ao WhatsApp comercial conectado.
            </p>
          </div>

          {companyError && <div className="bg-danger-light text-danger p-4 rounded-lg mb-5">{companyError}</div>}

          <form onSubmit={handleCreateCompany} className="flex flex-col gap-5">
            <div>
              <label className="text-sm text-secondary mb-2 block">Nome da empresa</label>
              <input
                className="input-field"
                placeholder="Ex: GVG Imoveis"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                disabled={companyLoading}
              />
            </div>

            <div>
              <label className="text-sm text-secondary mb-2 block">WhatsApp comercial</label>
              <div className="flex gap-2 items-stretch">
                <div className="input-addon">
                  <span className="font-semibold text-base">+55</span>
                </div>
                <input
                  type="text"
                  placeholder="DDD"
                  value={businessDdd}
                  onChange={(event) => setBusinessDdd(formatDdd(event.target.value))}
                  className="input-field text-center px-2 min-w-0"
                  style={{ width: '80px' }}
                  disabled={companyLoading}
                />
                <input
                  type="text"
                  className="input-field flex-1 min-w-0"
                  placeholder="99999-9999"
                  value={businessPhone}
                  onChange={(event) => setBusinessPhone(formatPhone(event.target.value))}
                  disabled={companyLoading}
                />
              </div>
              <p className="text-xs text-secondary mt-2">
                Esse e o numero que seus clientes chamam. Ele e diferente do seu numero pessoal de acesso.
              </p>
            </div>

            <button type="submit" className="btn-primary" disabled={companyLoading || !companyName.trim()}>
              {companyLoading ? <div className="spinner"></div> : 'Criar empresa'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in w-full py-10">
      <div className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h2 className="text-xl text-primary m-0">{selectedCompany?.name || 'Empresa'}</h2>
            {companies.length > 1 ? (
              <select
                className="input-field text-sm py-2"
                style={{ width: 'auto', minWidth: '220px' }}
                value={activeCompanyId}
                onChange={(event) => handleCompanyChange(event.target.value)}
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            ) : null}
          </div>
          <p className="text-success font-medium text-sm flex items-center gap-2">
            <span className="inline-block" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
            Acesso pessoal: +{authPhone}
          </p>
        </div>

        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Adicionar Lead
        </button>
      </div>

      {showAdd && (
        <div className="card p-6 mb-8 animate-fade-in" style={{ borderColor: 'var(--accent-primary)' }}>
          <h3 className="text-lg font-semibold mb-4 text-primary">Novo Lead</h3>
          {addError && <div className="bg-danger-light text-danger p-3 rounded-lg mb-4 text-sm">{addError}</div>}
          <form onSubmit={handleAddLead} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-secondary mb-2 block">Nome</label>
              <input
                type="text"
                className="input-field"
                placeholder="Nome do contato"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={addLoading}
              />
            </div>
            <div>
              <label className="text-sm text-secondary mb-2 block">Telefone (WhatsApp)</label>
              <div className="flex gap-2 items-stretch">
                <div className="input-addon">
                  <span className="font-semibold text-base">+55</span>
                </div>
                <input
                  type="text"
                  placeholder="DDD"
                  value={newDdd}
                  onChange={(e) => setNewDdd(formatDdd(e.target.value))}
                  className="input-field text-center px-2 min-w-0"
                  style={{ width: '80px' }}
                  disabled={addLoading}
                />
                <input
                  type="text"
                  className="input-field flex-1 min-w-0"
                  placeholder="99999-9999"
                  value={newPhone}
                  onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                  disabled={addLoading}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button type="button" className="btn-ghost" onClick={() => setShowAdd(false)} disabled={addLoading}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={addLoading || !newName || newPhone.length < 8 || newDdd.length < 2}>
                {addLoading ? <div className="spinner"></div> : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <h3 className="text-2xl font-semibold text-primary">Conversas</h3>

        <form onSubmit={handleSearch} className="flex gap-3 min-w-xs w-full sm:w-auto">
          <input
            type="text"
            className="input-field text-sm px-4 py-2"
            placeholder="Buscar por nome ou numero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary w-auto px-5 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        </form>
      </div>

      {error && <div className="bg-danger-light text-danger p-4 rounded-lg mb-5 border border-solid border-danger">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner spinner-lg"></div>
        </div>
      ) : leads.length === 0 ? (
        <div className="card text-center p-12 text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <p>Nenhum lead encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-fill gap-5">
          {leads.map((lead) => (
            <div key={lead.id} className="card card-hover p-8">
              <div className="flex justify-between items-start mb-4 gap-3">
                <div className="min-w-0">
                  <h4 className="text-lg m-0 mb-1 text-primary">{lead.name || 'Sem Nome'}</h4>
                </div>
                <span className={`badge ${lead.conversation_window?.is_open ? '' : 'border-danger'}`}>
                  {formatWindowLabel(lead)}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span className="text-base">{lead.phone}</span>
              </div>

              <div className="text-sm text-secondary" style={{ minHeight: '42px' }}>
                {lead.last_message_preview || 'Sem mensagens ainda.'}
              </div>

              <div className="pt-4 flex justify-between items-center gap-2 mt-4" style={{ borderTop: '1px solid var(--panel-border)' }}>
                <span className="text-xs text-secondary mt-4">
                  {lead.unread_count ? `${lead.unread_count} nao lida(s)` : `Atualizado: ${new Date(lead.updated_at).toLocaleDateString('pt-BR')}`}
                </span>
                <button
                  type="button"
                  className="btn-outline mt-4"
                  onClick={() => {
                    const params = new URLSearchParams({
                      name: lead.name || '',
                      phone: lead.phone || '',
                      wa_id: lead.wa_id || '',
                      company_id: activeCompanyId,
                      window_open: lead.conversation_window?.is_open ? '1' : '0',
                      window_expires_at: lead.conversation_window?.expires_at || '',
                    });
                    router.push(`/chat/${lead.id}?${params.toString()}`);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  Conversar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
