"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
  phone: string;
  isMaster: boolean;
  authenticatedAt: string;
};

type DashboardSummary = {
  success: boolean;
  cards: {
    leads_active: { value: number; trend_pct: number };
    messages_sent: { value: number; trend_pct: number };
    proposals_accepted: { value: number; trend_pct: number };
    revenue: { value: number; trend_pct: number };
  };
  pipeline: {
    possivel_cliente: number;
    analisando_proposta: number;
    proposta_aceita: number;
  };
  today_events: Array<{ id: string; title: string; start_time: string }>;
};

type Lead = {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  updated_at: string;
};

const API_BASE = "https://crm-gvg.onrender.com";

const KANBAN_COLUMNS = [
  { id: "entrada", label: "Entrada", statuses: ["possivel_cliente", "contato_iniciado"], saveAs: "possivel_cliente" },
  { id: "analise", label: "Analisando proposta", statuses: ["analisando_proposta"], saveAs: "analisando_proposta" },
  { id: "aceitos", label: "Propostas aceitas", statuses: ["proposta_aceita"], saveAs: "proposta_aceita" },
  { id: "encerrados", label: "Encerrados", statuses: ["perdido", "proposta_recusada"], saveAs: "perdido" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function Trend({ value }: { value: number }) {
  const rounded = Number.isFinite(value) ? Math.round(value) : 0;
  const up = rounded > 0;
  const down = rounded < 0;
  const color = up ? "text-emerald-600" : down ? "text-rose-600" : "text-[var(--muted)]";
  const arrow = up ? "▲" : down ? "▼" : "•";
  const text = `${rounded > 0 ? "+" : ""}${rounded}%`;

  return <p className={`mt-1 text-xs ${color}`}>{`${arrow} ${rounded === 0 ? "-" : text}`}</p>;
}

export default function AppPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [selectedModule, setSelectedModule] = useState("inicio");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [creatingLead, setCreatingLead] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("crm_session");
    if (!raw) {
      router.replace("/otp");
      return;
    }

    try {
      setSession(JSON.parse(raw) as Session);
    } catch {
      localStorage.removeItem("crm_session");
      router.replace("/otp");
    }
  }, [router]);

  useEffect(() => {
    if (!session) return;
    const currentSession = session;

    async function loadDashboard() {
      setLoadingSummary(true);
      setSummaryError(null);

      try {
        let selectedCompanyId = localStorage.getItem("crm_company_id");

        if (!selectedCompanyId) {
          const profileRes = await fetch(
            `${API_BASE}/api/v2/profiles/by-phone?phone=${encodeURIComponent(currentSession.phone)}`
          );
          const profileData = await profileRes.json();

          if (!profileRes.ok || !profileData.success || !profileData.profile?.id) {
            throw new Error("Nao foi possivel identificar o perfil para carregar o dashboard.");
          }
          setProfileId(profileData.profile.id);

          const companiesRes = await fetch(
            `${API_BASE}/api/v2/companies?user_id=${encodeURIComponent(profileData.profile.id)}`
          );
          const companiesData = await companiesRes.json();

          if (!companiesRes.ok || !companiesData.success) {
            throw new Error("Nao foi possivel carregar empresas do usuario.");
          }

          const companies = Array.isArray(companiesData.companies)
            ? companiesData.companies
            : [];

          const mostRecentCompany = companies
            .slice()
            .sort((a: { joined_at?: string }, b: { joined_at?: string }) => {
              const ta = a.joined_at ? new Date(a.joined_at).getTime() : 0;
              const tb = b.joined_at ? new Date(b.joined_at).getTime() : 0;
              return tb - ta;
            })[0];

          selectedCompanyId = mostRecentCompany?.id || null;
          if (!selectedCompanyId) {
            throw new Error("Nenhuma empresa encontrada para este usuario.");
          }

          localStorage.setItem("crm_company_id", selectedCompanyId);
        }

        setCompanyId(selectedCompanyId);

        const summaryRes = await fetch(
          `${API_BASE}/api/v2/dashboard/summary?company_id=${encodeURIComponent(selectedCompanyId)}&days=30`
        );
        const summaryData = await summaryRes.json();

        if (!summaryRes.ok || !summaryData.success) {
          throw new Error(summaryData.error || "Falha ao carregar dashboard.");
        }

        setSummary(summaryData as DashboardSummary);
      } catch (error) {
        setSummaryError(error instanceof Error ? error.message : "Falha ao carregar dashboard.");
      } finally {
        setLoadingSummary(false);
      }
    }

    loadDashboard();
  }, [session]);

  useEffect(() => {
    if (!companyId) return;
    const activeCompanyId = companyId;

    async function loadLeads() {
      setLoadingLeads(true);
      setLeadsError(null);
      try {
        const response = await fetch(
          `${API_BASE}/api/v2/leads?company_id=${encodeURIComponent(activeCompanyId)}`
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Falha ao carregar leads.");
        }
        setLeads((data.leads || []) as Lead[]);
      } catch (error) {
        setLeadsError(error instanceof Error ? error.message : "Falha ao carregar leads.");
      } finally {
        setLoadingLeads(false);
      }
    }

    loadLeads();
  }, [companyId]);

  async function moveLead(leadId: string, targetColumnId: string) {
    if (!companyId) return;
    const target = KANBAN_COLUMNS.find((column) => column.id === targetColumnId);
    if (!target) return;

    const nextStatus = target.saveAs;
    const previous = leads;
    const next = leads.map((lead) =>
      lead.id === leadId ? { ...lead, status: nextStatus, updated_at: new Date().toISOString() } : lead
    );
    setLeads(next);

    try {
      const response = await fetch(`${API_BASE}/api/v2/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao atualizar status.");
      }
    } catch (error) {
      setLeads(previous);
      setLeadsError(error instanceof Error ? error.message : "Falha ao mover lead.");
    }
  }

  async function refreshLeads() {
    if (!companyId) return;
    const response = await fetch(
      `${API_BASE}/api/v2/leads?company_id=${encodeURIComponent(companyId)}`
    );
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Falha ao recarregar leads.");
    }
    setLeads((data.leads || []) as Lead[]);
  }

  async function createLeadManually() {
    if (!companyId) {
      setLeadsError("Empresa nao identificada para criar lead.");
      return;
    }

    const trimmedName = leadName.trim();
    const normalizedPhone = leadPhone.trim();
    if (!trimmedName || !normalizedPhone) {
      setLeadsError("Preencha nome e telefone para criar o lead.");
      return;
    }

    setCreatingLead(true);
    setLeadsError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: normalizedPhone,
          company_id: companyId,
          assigned_to: profileId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao criar lead.");
      }

      setLeadName("");
      setLeadPhone("");
      setShowLeadModal(false);
      await refreshLeads();
    } catch (error) {
      setLeadsError(error instanceof Error ? error.message : "Falha ao criar lead.");
    } finally {
      setCreatingLead(false);
    }
  }

  function logout() {
    localStorage.removeItem("crm_session");
    router.replace("/otp");
  }

  const modules = useMemo(
    () => [
      { id: "inicio", label: "Inicio" },
      { id: "kanban", label: "Kanban" },
      { id: "agenda", label: "Agenda" },
      { id: "tasks", label: "Tasks" },
      { id: "chat", label: "Chat" },
    ],
    []
  );

  const accountItems = useMemo(
    () => [
      { id: "conta", label: "Conta" },
      { id: "config", label: "Configuracoes" },
    ],
    []
  );

  const leadsByColumn = KANBAN_COLUMNS.reduce<Record<string, Lead[]>>((acc, column) => {
    acc[column.id] = leads.filter((lead) => column.statuses.includes(lead.status));
    return acc;
  }, {});

  if (!session) return null;

  return (
    <main className="hero-glow min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="w-[270px] border-r border-[var(--line)] bg-white/90 px-5 py-6 backdrop-blur-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
            CRM GVG
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">{session.phone}</p>

          <nav className="mt-8 space-y-2">
            {modules.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedModule(item.id)}
                className={`flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium transition ${
                  selectedModule === item.id
                    ? "bg-pink-100 text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:bg-pink-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 border-t border-[var(--line)] pt-6">
            {accountItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedModule(item.id)}
                className={`mb-2 flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium transition ${
                  selectedModule === item.id
                    ? "bg-pink-100 text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:bg-pink-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={logout}
            className="mt-8 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[var(--line)] text-sm font-semibold text-[var(--foreground)]"
          >
            Sair
          </button>
        </aside>

        <section className="flex-1 p-6 md:p-8">
          {selectedModule === "inicio" ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-semibold text-[var(--foreground)]">Inicio</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Visao geral da operacao no periodo.
                </p>
              </div>

              {summaryError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {summaryError}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Leads ativos",
                    value: loadingSummary ? "-" : String(summary?.cards.leads_active.value ?? 0),
                    trend: summary?.cards.leads_active.trend_pct ?? 0,
                  },
                  {
                    label: "Mensagens enviadas",
                    value: loadingSummary ? "-" : String(summary?.cards.messages_sent.value ?? 0),
                    trend: summary?.cards.messages_sent.trend_pct ?? 0,
                  },
                  {
                    label: "Orcamentos fechados",
                    value: loadingSummary
                      ? "-"
                      : String(summary?.cards.proposals_accepted.value ?? 0),
                    trend: summary?.cards.proposals_accepted.trend_pct ?? 0,
                  },
                  {
                    label: "Faturamento",
                    value: loadingSummary
                      ? "-"
                      : formatCurrency(summary?.cards.revenue.value ?? 0),
                    trend: summary?.cards.revenue.trend_pct ?? 0,
                  },
                ].map((card) => (
                  <article
                    key={card.label}
                    className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.4)]"
                  >
                    <p className="text-sm text-[var(--muted)]">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{card.value}</p>
                    <Trend value={card.trend} />
                  </article>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <article className="rounded-2xl border border-[var(--line)] bg-white p-5 xl:col-span-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">Pipeline rapido</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        stage: "Possivel cliente",
                        qty: summary?.pipeline.possivel_cliente ?? 0,
                      },
                      {
                        stage: "Analisando proposta",
                        qty: summary?.pipeline.analisando_proposta ?? 0,
                      },
                      {
                        stage: "Proposta aceita",
                        qty: summary?.pipeline.proposta_aceita ?? 0,
                      },
                    ].map((item) => (
                      <div key={item.stage} className="rounded-xl bg-pink-50 p-4">
                        <p className="text-xs text-[var(--muted)]">{item.stage}</p>
                        <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                          {loadingSummary ? "-" : item.qty}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
                  <p className="text-sm font-medium text-[var(--foreground)]">Agenda de hoje</p>
                  <ul className="mt-4 space-y-3 text-sm text-[var(--foreground)]">
                    {(summary?.today_events || []).length === 0 ? (
                      <li className="rounded-lg bg-pink-50 px-3 py-2 text-[var(--muted)]">
                        Sem eventos para hoje.
                      </li>
                    ) : (
                      (summary?.today_events || []).map((event) => (
                        <li key={event.id} className="rounded-lg bg-pink-50 px-3 py-2">
                          {new Date(event.start_time).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          {event.title}
                        </li>
                      ))
                    )}
                  </ul>
                </article>
              </div>
            </div>
          ) : selectedModule === "kanban" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">Kanban</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Arraste os cards para mover os leads entre etapas.
                </p>
              </div>
              {leadsError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {leadsError}
                </div>
              ) : null}
              <div className="grid gap-4 xl:grid-cols-4">
                {KANBAN_COLUMNS.map((column) => (
                  <div
                    key={column.id}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const leadId = event.dataTransfer.getData("text/lead-id");
                      if (leadId) moveLead(leadId, column.id);
                    }}
                    className="min-h-[480px] rounded-2xl border border-[var(--line)] bg-white p-3"
                  >
                    <div className="mb-3 flex items-center justify-between px-1">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{column.label}</p>
                      <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                        {loadingLeads ? "-" : leadsByColumn[column.id]?.length || 0}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {(leadsByColumn[column.id] || []).map((lead) => (
                        <article
                          key={lead.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/lead-id", lead.id);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          className="cursor-grab rounded-xl border border-pink-100 bg-pink-50/70 p-3 active:cursor-grabbing"
                        >
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {lead.name || "Sem nome"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{lead.phone || "-"}</p>
                        </article>
                      ))}
                      {!loadingLeads && (leadsByColumn[column.id]?.length || 0) === 0 ? (
                        <div className="rounded-xl border border-dashed border-pink-200 px-3 py-5 text-center text-xs text-[var(--muted)]">
                          Sem leads nesta etapa.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowLeadModal(true)}
                className="fixed right-8 bottom-8 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-2xl font-semibold text-white shadow-[0_18px_35px_-18px_rgba(230,57,120,0.8)]"
                aria-label="Adicionar lead"
              >
                +
              </button>

              {showLeadModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6">
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Novo lead</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Adicione um lead manualmente ao Kanban.
                    </p>
                    <div className="mt-4 space-y-3">
                      <input
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        placeholder="Nome"
                        className="h-11 w-full rounded-xl border border-[var(--line)] px-3"
                      />
                      <input
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        placeholder="+55..."
                        className="h-11 w-full rounded-xl border border-[var(--line)] px-3"
                      />
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        onClick={() => setShowLeadModal(false)}
                        className="h-10 rounded-xl border border-[var(--line)] px-4 text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={createLeadManually}
                        disabled={creatingLead}
                        className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70"
                      >
                        {creatingLead ? "Salvando..." : "Salvar lead"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                {selectedModule === "config"
                  ? "Configuracoes"
                  : selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)}
              </h2>
              <p className="mt-2 text-[var(--muted)]">
                Este modulo sera implementado em seguida, tela por tela.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
