"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Lead {
  id: string;
  name: string;
  phone: string;
  external_key: string;
  wa_id: string;
  updated_at: string;
}

export default function LeadsPage() {
  const [authPhone] = useState<string | null>(() => (
    typeof window !== 'undefined' ? localStorage.getItem('auth_phone') : null
  ));
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const router = useRouter();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDdd, setNewDdd] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchLeads = useCallback(async (query: string = '') => {
    setLoading(true);
    setError('');

    try {
      const url = `https://crm-gvg.onrender.com/api/v2/leads${query ? `?search=${encodeURIComponent(query)}&by=auto` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setLeads(data.leads || []);
      } else {
        setError(data.error || 'Erro ao carregar leads');
      }
    } catch {
      setError('Erro de conexão com a API de Leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authPhone) {
      router.push('/');
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchLeads();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authPhone, fetchLeads, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(search);
  };

  const handleDddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    if (v.length > 3) v = v.slice(0, 3);
    setNewDdd(v);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 9) v = v.slice(0, 9);
    
    if (v.length > 5) {
      v = v.replace(/^(\d{5})(\d{1,4})/, '$1-$2');
    }
    setNewPhone(v);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const cleanPhone = newPhone.replace(/\D/g, '');
    
    if (!newName.trim()) {
        setAddError('O nome é obrigatório.');
        return;
    }
    if (!newDdd || newDdd.length < 2) {
        setAddError('DDD inválido.');
        return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
        setAddError('Número inválido.');
        return;
    }

    setAddLoading(true);

    const fullPhone = `55${newDdd}${cleanPhone}`;
    try {
      const res = await fetch('https://crm-gvg.onrender.com/api/v2/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName, phone: fullPhone })
      });
      const data = await res.json();

      if (data.success || res.status === 201) {
        setShowAdd(false);
        setNewName('');
        setNewDdd('');
        setNewPhone('');
        fetchLeads(); // refresh the list
      } else {
        setAddError(data.error || 'Erro ao adicionar lead');
      }
    } catch {
      setAddError('Erro de conexão ao adicionar lead');
    } finally {
      setAddLoading(false);
    }
  };

  if (!authPhone) return null;

  return (
    <div className="container animate-fade-in w-full py-10">
      <div className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 mb-8">
        <div>
          <h2 className="text-xl mb-1 text-primary">Bem-vindo de volta!</h2>
          <p className="text-success font-medium text-sm flex items-center gap-2">
            <span className="inline-block" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
            Autenticado como: +{authPhone}
          </p>
        </div>

        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Adicionar Lead
        </button>
      </div>

      {showAdd && (
          <div className="card p-6 mb-8 animate-fade-in border-danger" style={{ borderColor: 'var(--accent-primary)' }}>
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
                            onChange={handleDddChange}
                            className="input-field text-center px-2 min-w-0"
                            style={{ width: '80px' }}
                            disabled={addLoading}
                        />
                        <input 
                            type="text" 
                            className="input-field flex-1 min-w-0" 
                            placeholder="99999-9999" 
                            value={newPhone}
                            onChange={handlePhoneChange}
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
        <h3 className="text-2xl font-semibold text-primary">Meus Leads</h3>

        <form onSubmit={handleSearch} className="flex gap-3 min-w-xs w-full sm:w-auto">
          <input
            type="text"
            className="input-field text-sm px-4 py-2"
            placeholder="Buscar por nome ou número..."
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
                <div>
                  <h4 className="text-lg m-0 mb-1 text-primary">{lead.name || 'Sem Nome'}</h4>
                </div>
                <span className="badge">Lead</span>
              </div>

              <div className="flex items-center gap-2 mb-3 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span className="text-base">{lead.phone}</span>
              </div>

              <div className="pt-4 flex justify-between items-center gap-2 mt-4" style={{ borderTop: '1px solid var(--panel-border)' }}>
                <span className="text-xs text-secondary mt-4">
                  Atualizado: {new Date(lead.updated_at).toLocaleDateString('pt-BR')}
                </span>
                <button
                  type="button"
                  className="btn-outline mt-4"
                  onClick={() => {
                    const params = new URLSearchParams({
                      name: lead.name || '',
                      phone: lead.phone || '',
                      wa_id: lead.wa_id || '',
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
