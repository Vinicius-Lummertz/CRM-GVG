"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
  phone: string;
  isMaster: boolean;
  profileId?: string | null;
  authenticatedAt: string;
};

type CompanyRole = "owner" | "admin" | "assistant_ops" | "operator_chat" | "viewer";
type ThemeMode = "rosa" | "grafite";

type DashboardSummary = {
  success: boolean;
  cards: {
    leads_active: { value: number; trend_pct: number };
    messages_sent: { value: number; trend_pct: number };
    proposals_accepted: { value: number; trend_pct: number };
    revenue: { value: number; trend_pct: number };
  };
  pipeline: {
    contato_iniciado: number;
    em_negociacao: number;
    proposta_enviada: number;
    orcamento_fechado: number;
  };
  today_events: Array<{ id: string; title: string; start_time: string }>;
};

type Lead = {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  updated_at: string;
  conversation_window?: {
    is_open: boolean;
    opened_at: string | null;
    expires_at: string | null;
    remaining_seconds: number;
  };
};
type Task = {
  id: string;
  title: string;
  lead_id?: string | null;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
};
type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  lead_id: string | null;
};
type ChatConnection = {
  status: "nao_configurado" | "pendente_meta" | "conectado" | "erro";
  phone_number: string | null;
  display_name?: string | null;
  meta_business_id?: string | null;
  meta_phone_number_id?: string | null;
  connected_at?: string | null;
  last_error?: string | null;
};
type ChatMessage = {
  id: string;
  lead_id: string;
  direction: "inbound" | "outbound";
  content?: string | null;
  body?: string | null;
  created_at: string;
};
type CompanyMember = {
  id: string;
  role: CompanyRole;
  profile_id?: string | null;
  joined_at?: string | null;
  profile?: {
    id?: string;
    full_name?: string | null;
    phone?: string | null;
  } | null;
};

const API_BASE = "https://crm-gvg.onrender.com";
type IconName = "home" | "kanban" | "calendar" | "tasks" | "chat" | "user" | "settings";

type KanbanColumn = {
  id: string;
  label: string;
  statuses: string[];
  saveAs: string | null;
};

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "contato", label: "Contato iniciado", statuses: ["contato_iniciado"], saveAs: "contato_iniciado" },
  { id: "negociacao", label: "Em negociacao", statuses: ["em_negociacao"], saveAs: "em_negociacao" },
  { id: "proposta", label: "Proposta enviada", statuses: ["proposta_enviada"], saveAs: "proposta_enviada" },
  { id: "fechado", label: "Orcamento fechado", statuses: ["orcamento_fechado"], saveAs: "orcamento_fechado" },
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

function TrendLine({ points }: { points: number[] }) {
  const width = 520;
  const height = 140;
  const padding = 14;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(1, max - min);
  const stepX = (width - padding * 2) / Math.max(1, points.length - 1);

  const normalized = points.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y, value };
  });

  const path = normalized
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full">
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {normalized.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5" />
            <title>{`Dia ${index + 1}: ${Math.round(point.value)}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

function AppBootstrapSkeleton() {
  return (
    <main className="hero-glow min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1500px] animate-pulse">
        <aside className="w-[270px] border-r border-[var(--line)] bg-white/90 px-3 py-6">
          <div className="h-4 w-24 rounded bg-pink-100" />
          <div className="mt-3 h-3 w-40 rounded bg-pink-100/80" />
          <div className="mt-8 space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-11 w-full rounded-xl bg-pink-100/70" />
            ))}
          </div>
        </aside>
        <section className="flex-1 p-6 md:p-8">
          <div className="h-8 w-56 rounded bg-pink-100" />
          <div className="mt-2 h-4 w-80 rounded bg-pink-100/80" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl border border-[var(--line)] bg-white" />
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-72 rounded-2xl border border-[var(--line)] bg-white" />
            <div className="h-72 rounded-2xl border border-[var(--line)] bg-white" />
          </div>
        </section>
      </div>
    </main>
  );
}

function NavIcon({ name }: { name: IconName }) {
  const cls = "h-[18px] w-[18px] stroke-current fill-none";
  switch (name) {
    case "home":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/></svg>;
    case "kanban":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>;
    case "calendar":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case "tasks":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><path d="M9 11.5 11 13.5l4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg>;
    case "chat":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z"/></svg>;
    case "user":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>;
    case "settings":
      return <svg viewBox="0 0 24 24" className={cls} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.5-2-3.5-2.4.5a8.3 8.3 0 0 0-.8-.7l-.3-2.4h-4l-.3 2.4a8.3 8.3 0 0 0-.8.7l-2.4-.5-2 3.5 2 1.5a7.8 7.8 0 0 0 .1 1l-2 1.5 2 3.5 2.4-.5c.2.3.5.5.8.7l.3 2.4h4l.3-2.4c.3-.2.6-.4.8-.7l2.4.5 2-3.5z"/></svg>;
  }
}

async function copyToClipboard(value: string) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // noop
  }
}

export default function AppPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedModule, setSelectedModule] = useState("inicio");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [currentRole, setCurrentRole] = useState<CompanyRole>("viewer");
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [creatingLead, setCreatingLead] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskLeadId, setNewTaskLeadId] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskDateAsc, setTaskDateAsc] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventLeadId, setEventLeadId] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [upcomingCollapsed, setUpcomingCollapsed] = useState(false);
  const [chatConnection, setChatConnection] = useState<ChatConnection | null>(null);
  const [loadingChatConnection, setLoadingChatConnection] = useState(false);
  const [chatConnectionError, setChatConnectionError] = useState<string | null>(null);
  const [chatPhone, setChatPhone] = useState("");
  const [chatDisplayName, setChatDisplayName] = useState("");
  const [chatMetaBusinessId, setChatMetaBusinessId] = useState("");
  const [chatMetaPhoneId, setChatMetaPhoneId] = useState("");
  const [savingChatConnection, setSavingChatConnection] = useState(false);
  const [chatLeadSearch, setChatLeadSearch] = useState("");
  const [selectedChatLeadId, setSelectedChatLeadId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [chatMessagesError, setChatMessagesError] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyPhone, setNewCompanyPhone] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [companyOnboardingError, setCompanyOnboardingError] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>("rosa");
  const [settingsName, setSettingsName] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsDisplayName, setSettingsDisplayName] = useState("");
  const [settingsMetaBusinessId, setSettingsMetaBusinessId] = useState("");
  const [settingsMetaPhoneId, setSettingsMetaPhoneId] = useState("");
  const [savingCompanySettings, setSavingCompanySettings] = useState(false);
  const [companySettingsError, setCompanySettingsError] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessionFromHttpOnlyCookie() {
      try {
        const response = await fetch("/api/auth/session", { method: "GET" });
        const data = await response.json();
        if (!response.ok || !data.success || !data.session) {
          setSessionChecked(true);
          setBootstrapping(false);
          router.replace("/otp");
          return;
        }
        setSession(data.session as Session);
        setBootstrapping(true);
        setSessionChecked(true);
      } catch {
        setSessionChecked(true);
        setBootstrapping(false);
        router.replace("/otp");
      }
    }

    void loadSessionFromHttpOnlyCookie();
  }, [router]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("crm_theme_mode");
    const nextTheme: ThemeMode = savedTheme === "grafite" ? "grafite" : "rosa";
    setThemeMode(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    localStorage.setItem("crm_theme_mode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!session) return;
    const currentSession = session;

    async function loadDashboard() {
      setLoadingSummary(true);
      setSummaryError(null);

      try {
        let resolvedProfileId: string | null = currentSession.profileId || null;
        if (!resolvedProfileId) {
          const profileRes = await fetch(
            `${API_BASE}/api/v2/profiles/by-phone?phone=${encodeURIComponent(currentSession.phone)}`
          );
          const profileData = await profileRes.json();

          if (!profileRes.ok || !profileData.success || !profileData.profile?.id) {
            throw new Error("Nao foi possivel identificar o perfil para carregar o dashboard.");
          }
          resolvedProfileId = profileData.profile.id;
        }
        if (!resolvedProfileId) {
          throw new Error("Nao foi possivel identificar o perfil para carregar o dashboard.");
        }
        setProfileId(resolvedProfileId);

        const companiesRes = await fetch(
          `${API_BASE}/api/v2/companies?user_id=${encodeURIComponent(resolvedProfileId)}`
        );
        const companiesData = await companiesRes.json();

        if (!companiesRes.ok || !companiesData.success) {
          throw new Error("Nao foi possivel carregar empresas do usuario.");
        }

        const companies = Array.isArray(companiesData.companies)
          ? companiesData.companies
          : [];

        let selectedCompanyId = localStorage.getItem("crm_company_id");
        const selectedBelongsToUser = selectedCompanyId
          ? companies.some((company: { id?: string }) => company?.id === selectedCompanyId)
          : false;

        if (!selectedBelongsToUser) {
          const mostRecentCompany = companies
            .slice()
            .sort((a: { joined_at?: string }, b: { joined_at?: string }) => {
              const ta = a.joined_at ? new Date(a.joined_at).getTime() : 0;
              const tb = b.joined_at ? new Date(b.joined_at).getTime() : 0;
              return tb - ta;
            })[0];

          selectedCompanyId = mostRecentCompany?.id || null;
          if (!selectedCompanyId) {
            localStorage.removeItem("crm_company_id");
            setCompanyId(null);
            setSummary(null);
            return;
          }

          localStorage.setItem("crm_company_id", selectedCompanyId);
        }

        if (!selectedCompanyId) {
          localStorage.removeItem("crm_company_id");
          setCompanyId(null);
          setSummary(null);
          return;
        }

        const activeCompanyId = selectedCompanyId;
        setCompanyId(activeCompanyId);

        const summaryRes = await fetch(
          `${API_BASE}/api/v2/dashboard/summary?company_id=${encodeURIComponent(activeCompanyId)}&days=30`
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
        setBootstrapping(false);
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

  useEffect(() => {
    if (!companyId) return;
    void loadTasks(companyId);
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void loadEvents(companyId, calendarMonth);
  }, [companyId, calendarMonth]);

  useEffect(() => {
    if (!companyId) return;
    void loadChatConnection(companyId);
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !profileId) return;
    const activeCompanyId = companyId;
    const activeProfileId = profileId;

    async function loadCompanyContext() {
      try {
        const response = await fetch(
          `${API_BASE}/api/v2/companies/${activeCompanyId}?user_id=${encodeURIComponent(activeProfileId)}`
        );
        const data = await response.json();
        if (!response.ok || !data.success || !data.company) {
          throw new Error(data.error || "Falha ao carregar empresa.");
        }

        const company = data.company;
        const role: CompanyRole = (company.membership?.role || "viewer") as CompanyRole;
        setCurrentRole(role);
        setCompanyName(company.name || "");
        setSettingsName(company.name || "");
        setSettingsPhone(company.commercial_phone || "");
        const connection = company.company_settings?.chat_connection || {};
        setSettingsDisplayName(connection.display_name || "");
        setSettingsMetaBusinessId(connection.meta_business_id || "");
        setSettingsMetaPhoneId(connection.meta_phone_number_id || "");
        setCompanyMembers(Array.isArray(company.members) ? (company.members as CompanyMember[]) : []);
      } catch (error) {
        setCompanySettingsError(error instanceof Error ? error.message : "Falha ao carregar contexto da empresa.");
      }
    }

    void loadCompanyContext();
  }, [companyId, profileId]);

  async function loadTasks(activeCompanyId: string) {
    setLoadingTasks(true);
    setTasksError(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/v2/tasks?company_id=${encodeURIComponent(activeCompanyId)}`
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao carregar tasks.");
      }
      setTasks((data.tasks || []) as Task[]);
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : "Falha ao carregar tasks.");
    } finally {
      setLoadingTasks(false);
    }
  }

  async function moveLead(leadId: string, targetColumnId: string) {
    if (!canManageOperations) {
      setLeadsError("Seu perfil nao possui permissao para mover leads.");
      return;
    }
    if (!companyId) return;
    const target = KANBAN_COLUMNS.find((column) => column.id === targetColumnId);
    if (!target) return;

    const nextStatus = target.saveAs;
    if (!nextStatus) {
      setLeadsError("Coluna sem status de destino.");
      return;
    }
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
    if (!canManageOperations) {
      setLeadsError("Seu perfil nao possui permissao para criar leads.");
      return;
    }
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

  async function createTask() {
    if (!canWorkTasksCalendar) {
      setTasksError("Seu perfil nao possui permissao para criar tasks.");
      return;
    }
    if (!companyId) return;
    const title = newTaskTitle.trim();
    if (!title) {
      setTasksError("Informe o titulo da task.");
      return;
    }

    setCreatingTask(true);
    setTasksError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          title,
          due_date: newTaskDueDate || null,
          lead_id: newTaskLeadId || null,
          assigned_to: profileId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao criar task.");
      }

      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskLeadId("");
      await loadTasks(companyId);
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : "Falha ao criar task.");
    } finally {
      setCreatingTask(false);
    }
  }

  async function toggleTask(task: Task) {
    if (!canWorkTasksCalendar) {
      setTasksError("Seu perfil nao possui permissao para alterar tasks.");
      return;
    }
    if (!companyId) return;

    const previous = tasks;
    const next = tasks.map((item) =>
      item.id === task.id ? { ...item, is_completed: !item.is_completed } : item
    );
    setTasks(next);

    try {
      const response = await fetch(`${API_BASE}/api/v2/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          is_completed: !task.is_completed,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao atualizar task.");
      }
    } catch (error) {
      setTasks(previous);
      setTasksError(error instanceof Error ? error.message : "Falha ao atualizar task.");
    }
  }

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    localStorage.removeItem("crm_company_id");
    router.replace("/otp");
  }

  async function createCompanyOnboarding() {
    if (!profileId) {
      setCompanyOnboardingError("Perfil nao identificado para criar empresa.");
      return;
    }

    const name = newCompanyName.trim();
    const commercialPhone = newCompanyPhone.trim();
    if (!name || !commercialPhone) {
      setCompanyOnboardingError("Preencha nome da empresa e telefone comercial.");
      return;
    }

    setCreatingCompany(true);
    setCompanyOnboardingError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: profileId,
          name,
          commercial_phone: commercialPhone
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.companyId) {
        throw new Error(data.error || "Falha ao criar empresa.");
      }

      localStorage.setItem("crm_company_id", data.companyId);
      setCompanyId(data.companyId);
      setNewCompanyName("");
      setNewCompanyPhone("");
      setSelectedModule("inicio");
    } catch (error) {
      setCompanyOnboardingError(error instanceof Error ? error.message : "Falha ao criar empresa.");
    } finally {
      setCreatingCompany(false);
    }
  }

  const moduleAccessByRole: Record<CompanyRole, string[]> = {
    owner: ["inicio", "kanban", "agenda", "tasks", "chat", "conta", "config"],
    admin: ["inicio", "kanban", "agenda", "tasks", "chat", "conta", "config"],
    assistant_ops: ["inicio", "agenda", "tasks"],
    operator_chat: ["inicio", "chat"],
    viewer: ["inicio"],
  };
  const canManageOperations = currentRole === "owner" || currentRole === "admin";
  const canWorkTasksCalendar = canManageOperations || currentRole === "assistant_ops";
  const canWorkChat = canManageOperations || currentRole === "operator_chat";
  const allowedModules = moduleAccessByRole[currentRole] || ["inicio"];

  const modules = useMemo(
    () => [
      { id: "inicio", label: "Inicio", icon: "home" as IconName },
      { id: "kanban", label: "Kanban", icon: "kanban" as IconName },
      { id: "agenda", label: "Agenda", icon: "calendar" as IconName },
      { id: "tasks", label: "Tarefas", icon: "tasks" as IconName },
      { id: "chat", label: "Conversas", icon: "chat" as IconName },
    ],
    []
  );

  const accountItems = useMemo(
    () => [
      { id: "conta", label: "Empresa", icon: "user" as IconName },
      { id: "config", label: "Configuracoes", icon: "settings" as IconName },
    ],
    []
  );

  const leadsByColumn = KANBAN_COLUMNS.reduce<Record<string, Lead[]>>((acc, column) => {
    acc[column.id] = leads.filter((lead) => column.statuses.includes(lead.status));
    return acc;
  }, {});

  useEffect(() => {
    if (allowedModules.includes(selectedModule)) return;
    setSelectedModule("inicio");
  }, [allowedModules, selectedModule]);

  function getLeadById(leadId?: string | null) {
    if (!leadId) return null;
    return leads.find((lead) => lead.id === leadId) || null;
  }

  async function saveCompanySettings() {
    if (!companyId || !profileId) return;
    if (!canManageOperations) {
      setCompanySettingsError("Somente owner/admin podem alterar as configuracoes da empresa.");
      return;
    }

    setSavingCompanySettings(true);
    setCompanySettingsError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/companies/${companyId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profileId,
          name: settingsName,
          commercial_phone: settingsPhone,
          display_name: settingsDisplayName || null,
          meta_business_id: settingsMetaBusinessId || null,
          meta_phone_number_id: settingsMetaPhoneId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.company) {
        throw new Error(data.error || "Falha ao salvar configuracoes da empresa.");
      }
      setCompanyName(data.company.name || settingsName);
      await loadChatConnection(companyId);
    } catch (error) {
      setCompanySettingsError(error instanceof Error ? error.message : "Falha ao salvar configuracoes da empresa.");
    } finally {
      setSavingCompanySettings(false);
    }
  }

  const editableRoles: CompanyRole[] = ["admin", "assistant_ops", "operator_chat", "viewer"];

  async function updateMemberRole(memberId: string, nextRole: CompanyRole) {
    if (!companyId || !profileId) return;
    if (!canManageOperations) {
      setCompanySettingsError("Somente owner/admin podem editar membros.");
      return;
    }

    setUpdatingMemberId(memberId);
    setCompanySettingsError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/companies/${companyId}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profileId,
          role: nextRole,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.member) {
        throw new Error(data.error || "Falha ao atualizar papel do membro.");
      }

      setCompanyMembers((prev) =>
        prev.map((member) => (member.id === memberId ? { ...member, role: data.member.role as CompanyRole } : member))
      );
    } catch (error) {
      setCompanySettingsError(error instanceof Error ? error.message : "Falha ao atualizar papel do membro.");
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function createEvent() {
    if (!canWorkTasksCalendar) {
      setEventsError("Seu perfil nao possui permissao para criar eventos.");
      return;
    }
    if (!companyId) return;
    const title = eventTitle.trim();
    if (!title || !eventStart || !eventEnd) {
      setEventsError("Preencha titulo, inicio e fim do evento.");
      return;
    }

    setCreatingEvent(true);
    setEventsError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          title,
          start_time: new Date(eventStart).toISOString(),
          end_time: new Date(eventEnd).toISOString(),
          lead_id: eventLeadId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao criar evento.");
      }

      setEventTitle("");
      setEventStart("");
      setEventEnd("");
      setEventLeadId("");
      setShowEventModal(false);
      await loadEvents(companyId, calendarMonth);
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : "Falha ao criar evento.");
    } finally {
      setCreatingEvent(false);
    }
  }

  function resetEventForm() {
    setEditingEventId(null);
    setEventTitle("");
    setEventStart("");
    setEventEnd("");
    setEventLeadId("");
  }

  function openDayModal(day: number) {
    setSelectedDay(day);
    setShowDayModal(true);
    resetEventForm();
  }

  function startEditEvent(event: CalendarEvent) {
    setEditingEventId(event.id);
    setEventTitle(event.title || "");
    setEventStart(new Date(event.start_time).toISOString().slice(0, 16));
    setEventEnd(new Date(event.end_time).toISOString().slice(0, 16));
    setEventLeadId(event.lead_id || "");
  }

  async function saveEditedEvent() {
    if (!canWorkTasksCalendar) {
      setEventsError("Seu perfil nao possui permissao para editar eventos.");
      return;
    }
    if (!companyId || !editingEventId) return;
    const title = eventTitle.trim();
    if (!title || !eventStart || !eventEnd) {
      setEventsError("Preencha titulo, inicio e fim para salvar.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v2/events/${editingEventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          title,
          start_time: new Date(eventStart).toISOString(),
          end_time: new Date(eventEnd).toISOString(),
          lead_id: eventLeadId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao atualizar evento.");
      }
      resetEventForm();
      await loadEvents(companyId, calendarMonth);
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : "Falha ao atualizar evento.");
    }
  }

  async function deleteEvent(eventId: string) {
    if (!canWorkTasksCalendar) {
      setEventsError("Seu perfil nao possui permissao para remover eventos.");
      return;
    }
    if (!companyId) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v2/events/${eventId}?company_id=${encodeURIComponent(companyId)}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao excluir evento.");
      }
      if (editingEventId === eventId) resetEventForm();
      await loadEvents(companyId, calendarMonth);
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : "Falha ao excluir evento.");
    }
  }

  async function loadEvents(activeCompanyId: string, monthDate: Date) {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString();
      const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const response = await fetch(
        `${API_BASE}/api/v2/events?company_id=${encodeURIComponent(activeCompanyId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao carregar eventos.");
      }
      setEvents((data.events || []) as CalendarEvent[]);
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : "Falha ao carregar eventos.");
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadChatConnection(activeCompanyId: string) {
    setLoadingChatConnection(true);
    setChatConnectionError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/companies/${activeCompanyId}/chat-connection`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao carregar configuracao do chat.");
      }

      const connection = data.chat_connection as ChatConnection;
      setChatConnection(connection);
      setChatPhone(connection.phone_number || "");
      setChatDisplayName(connection.display_name || "");
      setChatMetaBusinessId(connection.meta_business_id || "");
      setChatMetaPhoneId(connection.meta_phone_number_id || "");
    } catch (error) {
      setChatConnectionError(error instanceof Error ? error.message : "Falha ao carregar configuracao do chat.");
    } finally {
      setLoadingChatConnection(false);
    }
  }

  async function saveChatConnection() {
    if (!canManageOperations) {
      setChatConnectionError("Somente owner/admin podem alterar a configuracao do chat da empresa.");
      return;
    }
    if (!companyId) return;
    setSavingChatConnection(true);
    setChatConnectionError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/companies/${companyId}/chat-connection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: chatPhone,
          display_name: chatDisplayName
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao salvar numero da empresa.");
      }
      await loadChatConnection(companyId);
    } catch (error) {
      setChatConnectionError(error instanceof Error ? error.message : "Falha ao salvar numero da empresa.");
    } finally {
      setSavingChatConnection(false);
    }
  }

  async function markChatConnected() {
    if (!canManageOperations) {
      setChatConnectionError("Somente owner/admin podem alterar a configuracao do chat da empresa.");
      return;
    }
    if (!companyId) return;
    setSavingChatConnection(true);
    setChatConnectionError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/companies/${companyId}/chat-connection/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "conectado",
          phone_number: chatPhone || null,
          meta_business_id: chatMetaBusinessId || null,
          meta_phone_number_id: chatMetaPhoneId || null
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao atualizar status da conexao.");
      }
      await loadChatConnection(companyId);
    } catch (error) {
      setChatConnectionError(error instanceof Error ? error.message : "Falha ao atualizar status da conexao.");
    } finally {
      setSavingChatConnection(false);
    }
  }

  const chatStatus = (chatConnection?.status || "").toString().trim().toLowerCase();
  const isChatConnected = chatStatus === "conectado";

  async function loadMessagesForLead(leadId: string) {
    if (!companyId) return;
    setLoadingChatMessages(true);
    setChatMessagesError(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/v2/chat/${leadId}/messages?company_id=${encodeURIComponent(companyId)}&limit=80`
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao carregar mensagens.");
      }
      setChatMessages((data.messages || []) as ChatMessage[]);
    } catch (error) {
      setChatMessagesError(error instanceof Error ? error.message : "Falha ao carregar mensagens.");
    } finally {
      setLoadingChatMessages(false);
    }
  }

  async function sendChatMessage() {
    if (!canWorkChat) {
      setChatMessagesError("Seu perfil nao possui permissao para enviar mensagens.");
      return;
    }
    if (!companyId || !selectedChatLeadId) return;
    const text = chatText.trim();
    if (!text) return;

    setSendingChat(true);
    setChatMessagesError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          lead_id: selectedChatLeadId,
          text,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        if (data?.error === "WINDOW_CLOSED") {
          throw new Error("WINDOW_CLOSED");
        }
        throw new Error(data.message || data.error || "Falha ao enviar mensagem.");
      }
      setChatText("");
      await loadMessagesForLead(selectedChatLeadId);
      await refreshLeads();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar mensagem.";
      if (message === "WINDOW_CLOSED") {
        setChatMessagesError("Janela de 24h fechada. Envie um template para reabrir a conversa.");
      } else {
        setChatMessagesError(message);
      }
    } finally {
      setSendingChat(false);
    }
  }

  async function sendRestartTemplate() {
    if (!canWorkChat) {
      setChatMessagesError("Seu perfil nao possui permissao para enviar mensagens de abertura.");
      return;
    }
    if (!companyId || !selectedChatLeadId || !selectedChatLead) return;

    setSendingChat(true);
    setChatMessagesError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/chat/send-restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          lead_id: selectedChatLeadId
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || "Falha ao enviar template.");
      }
      await loadMessagesForLead(selectedChatLeadId);
      await refreshLeads();
    } catch (error) {
      setChatMessagesError(error instanceof Error ? error.message : "Falha ao enviar template.");
    } finally {
      setSendingChat(false);
    }
  }

  useEffect(() => {
    if (selectedModule !== "chat") return;
    if (!isChatConnected) return;
    if (selectedChatLeadId) return;
    if (!leads.length) return;
    setSelectedChatLeadId(leads[0].id);
  }, [selectedModule, isChatConnected, selectedChatLeadId, leads]);

  useEffect(() => {
    if (selectedModule !== "chat") return;
    if (!isChatConnected) return;
    if (!selectedChatLeadId) return;
    void loadMessagesForLead(selectedChatLeadId);
  }, [selectedModule, isChatConnected, selectedChatLeadId, companyId]);

  const filteredTasks = tasks.filter((task) => {
    const lead = getLeadById(task.lead_id);
    const query = taskSearch.trim().toLowerCase();
    const title = (task.title || "").toLowerCase();
    const leadName = (lead?.name || "").toLowerCase();
    const leadPhone = (lead?.phone || "").toLowerCase();

    const matchesSearch =
      !query ||
      title.includes(query) ||
      leadName.includes(query) ||
      leadPhone.includes(query);

    return matchesSearch;
  });

  const sortedTasks = filteredTasks.slice().sort((a, b) => {
    const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    return taskDateAsc ? dateA - dateB : dateB - dateA;
  });

  const pendingTasks = sortedTasks.filter((task) => !task.is_completed);
  const completedTasks = sortedTasks.filter((task) => task.is_completed);
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstWeekDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthLabel = calendarMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const eventsByDay = events.reduce<Record<number, CalendarEvent[]>>((acc, event) => {
    const day = new Date(event.start_time).getDate();
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {});
  const upcomingEvents = events
    .filter((event) => new Date(event.end_time).getTime() >= Date.now())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 8);
  const upcomingEventsDashboard = upcomingEvents.slice(0, 5);
  const leadsTrendPoints = useMemo(() => {
    const current = summary?.cards.leads_active.value ?? 0;
    const trend = summary?.cards.leads_active.trend_pct ?? 0;
    const base = Math.max(1, current / (1 + trend / 100 || 1));
    return Array.from({ length: 8 }, (_, index) => {
      const step = index / 7;
      return Math.max(1, base + (current - base) * step);
    });
  }, [summary?.cards.leads_active.value, summary?.cards.leads_active.trend_pct]);
  const revenueTrendPoints = useMemo(() => {
    const current = summary?.cards.revenue.value ?? 0;
    const trend = summary?.cards.revenue.trend_pct ?? 0;
    const base = Math.max(1, current / (1 + trend / 100 || 1));
    return Array.from({ length: 8 }, (_, index) => {
      const step = index / 7;
      return Math.max(1, base + (current - base) * step);
    });
  }, [summary?.cards.revenue.value, summary?.cards.revenue.trend_pct]);
  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];
  const filteredChatLeads = leads.filter((lead) => {
    const query = chatLeadSearch.trim().toLowerCase();
    if (!query) return true;
    return (lead.name || "").toLowerCase().includes(query) || (lead.phone || "").toLowerCase().includes(query);
  });
  const selectedChatLead = selectedChatLeadId ? leads.find((lead) => lead.id === selectedChatLeadId) || null : null;
  const latestInboundMessage = chatMessages
    .filter((message) => message.direction === "inbound")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const selectedLeadWindowOpen = latestInboundMessage
    ? Date.now() - new Date(latestInboundMessage.created_at).getTime() < 24 * 60 * 60 * 1000
    : false;

  if (!sessionChecked || bootstrapping) return <AppBootstrapSkeleton />;
  if (!session) return null;

  return (
    <main className="hero-glow min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className={`${sidebarCollapsed ? "w-[84px]" : "w-[270px]"} border-r border-[var(--line)] bg-white/90 px-3 py-6 backdrop-blur-sm transition-all duration-300 ease-out`}>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
            {sidebarCollapsed ? "CRM" : "CRM GVG"}
          </p>
          <p className={`mt-2 overflow-hidden text-sm text-[var(--muted)] transition-all duration-300 ${sidebarCollapsed ? "max-h-0 opacity-0" : "max-h-10 opacity-100"}`}>
            {session.phone}
          </p>
          <button
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg border border-[var(--line)] text-xs"
          >
            {sidebarCollapsed ? "»" : "«"}
          </button>

          <nav className="mt-8 space-y-2">
            {modules.filter((item) => allowedModules.includes(item.id)).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedModule(item.id)}
                title={item.label}
                className={`flex h-11 w-full items-center ${sidebarCollapsed ? "justify-center" : ""} rounded-xl px-3 text-left text-sm font-medium transition-all duration-300 ${
                  selectedModule === item.id
                    ? "bg-pink-100 text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:bg-pink-50"
                }`}
              >
                <span className="text-[var(--muted)]"><NavIcon name={item.icon} /></span>
                <span className={`ml-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "max-w-0 translate-x-1 opacity-0" : "max-w-[140px] translate-x-0 opacity-100"}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-8 border-t border-[var(--line)] pt-6">
            {accountItems.filter((item) => allowedModules.includes(item.id)).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedModule(item.id)}
                title={item.label}
                className={`mb-2 flex h-11 w-full items-center ${sidebarCollapsed ? "justify-center" : ""} rounded-xl px-3 text-left text-sm font-medium transition-all duration-300 ${
                  selectedModule === item.id
                    ? "bg-pink-100 text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:bg-pink-50"
                }`}
              >
                <span className="text-[var(--muted)]"><NavIcon name={item.icon} /></span>
                <span className={`ml-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "max-w-0 translate-x-1 opacity-0" : "max-w-[140px] translate-x-0 opacity-100"}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={logout}
            className="mt-8 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[var(--line)] text-sm font-semibold text-[var(--foreground)]"
          >
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-[100px] opacity-100"}`}>
              Sair
            </span>
            <span className={`text-[var(--muted)] transition-all duration-300 ${sidebarCollapsed ? "opacity-100" : "opacity-0 absolute"}`}>⎋</span>
          </button>
        </aside>

        <section className="flex-1 p-6 md:p-8">
          {!companyId ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-xl font-semibold text-amber-900">Voce ainda nao esta vinculado a uma empresa</h2>
              <p className="mt-1 text-sm text-amber-800">
                O chat e os demais modulos operacionais precisam de uma empresa ativa. Crie sua empresa para continuar.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Nome da empresa"
                  className="h-11 rounded-xl border border-amber-200 bg-white px-3"
                />
                <input
                  value={newCompanyPhone}
                  onChange={(e) => setNewCompanyPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                  className="h-11 rounded-xl border border-amber-200 bg-white px-3"
                />
              </div>
              {companyOnboardingError ? (
                <p className="mt-3 text-sm text-rose-700">{companyOnboardingError}</p>
              ) : null}
              <button
                onClick={createCompanyOnboarding}
                disabled={creatingCompany}
                className="mt-4 h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70"
              >
                {creatingCompany ? "Criando empresa..." : "Criar minha empresa"}
              </button>
            </div>
          ) : null}

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
                <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
                  <p className="text-sm font-medium text-[var(--foreground)]">Leads ao longo do tempo</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Tendencia estimada com base nos ultimos 30 dias.</p>
                  <TrendLine points={leadsTrendPoints} />
                </article>

                <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
                  <p className="text-sm font-medium text-[var(--foreground)]">Faturamento ao longo do tempo</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Tendencia estimada com base nos ultimos 30 dias.</p>
                  <TrendLine points={revenueTrendPoints} />
                </article>

                <article className="rounded-2xl border border-[var(--line)] bg-white p-5 xl:col-span-1">
                  <p className="text-sm font-medium text-[var(--foreground)]">Proximos compromissos</p>
                  <ul className="mt-4 space-y-3 text-sm text-[var(--foreground)]">
                    {upcomingEventsDashboard.length === 0 ? (
                      <li className="rounded-lg bg-pink-50 px-3 py-2 text-[var(--muted)]">
                        Sem compromissos futuros.
                      </li>
                    ) : (
                      upcomingEventsDashboard.map((event) => (
                        <li key={event.id} className="rounded-lg bg-pink-50 px-3 py-2">
                          {new Date(event.start_time).toLocaleDateString("pt-BR")}{" "}
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
          ) : selectedModule === "agenda" ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-[180px]">
                  <h2 className="text-2xl font-semibold text-[var(--foreground)]">Agenda</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Sua agenda local do CRM.</p>
                </div>
                <div className="flex flex-1 items-center justify-center gap-2">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    className="h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm"
                  >
                    ←
                  </button>
                  <p className="min-w-[170px] text-center text-sm font-semibold capitalize text-[var(--foreground)]">
                    {monthLabel}
                  </p>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    className="h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm"
                  >
                    →
                  </button>
                </div>
                <div className="min-w-[180px] text-right">
                  <button
                    onClick={() => setShowEventModal(true)}
                    className="h-10 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white"
                  >
                    Novo evento
                  </button>
                </div>
              </div>

              {eventsError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {eventsError}
                </div>
              ) : null}

              <div className={`grid gap-4 transition-all duration-300 ease-out ${upcomingCollapsed ? "xl:grid-cols-[1fr_64px]" : "xl:grid-cols-[1fr_320px]"}`}>
                <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--muted)]">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: firstWeekDay }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="min-h-[100px] rounded-xl bg-pink-50/40" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const day = idx + 1;
                      const dayEvents = eventsByDay[day] || [];
                      return (
                        <button
                          key={day}
                          onClick={() => openDayModal(day)}
                          className="min-h-[100px] rounded-xl border border-pink-100 bg-pink-50/50 p-2 text-left transition hover:bg-pink-100/60"
                        >
                          <p className="text-xs font-semibold text-[var(--foreground)]">{day}</p>
                          <div className="mt-1 space-y-1">
                            {loadingEvents ? null : dayEvents.slice(0, 2).map((ev) => (
                              <div key={ev.id} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-[var(--foreground)]">
                                {new Date(ev.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 ? (
                              <p className="text-[10px] text-[var(--muted)]">+{dayEvents.length - 2} mais</p>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <aside className="rounded-2xl border border-[var(--line)] bg-white p-3 transition-all duration-300 ease-out">
                  <button
                    onClick={() => setUpcomingCollapsed((prev) => !prev)}
                    className="mb-3 inline-flex h-8 w-full items-center justify-center rounded-lg border border-[var(--line)] text-xs"
                  >
                    {upcomingCollapsed ? "«" : "»"}
                  </button>
                  {upcomingCollapsed ? (
                    <div className="mx-auto text-center text-xs text-[var(--muted)] [writing-mode:vertical-rl] rotate-180">
                      Proximos eventos
                    </div>
                  ) : (
                    <div>
                      <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Proximos eventos</p>
                      <div className="space-y-2">
                        {upcomingEvents.length === 0 ? (
                          <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">
                            Sem eventos futuros.
                          </div>
                        ) : (
                          upcomingEvents.map((event) => (
                            <div key={event.id} className="rounded-xl border border-pink-100 bg-pink-50/60 px-3 py-2">
                              <p className="text-sm font-medium text-[var(--foreground)]">{event.title}</p>
                              <p className="text-xs text-[var(--muted)]">
                                {new Date(event.start_time).toLocaleDateString("pt-BR")}{" "}
                                {new Date(event.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </aside>
              </div>

              {showEventModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6">
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Novo evento</h3>
                    <div className="mt-4 space-y-3">
                      <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Titulo" className="h-11 w-full rounded-xl border border-[var(--line)] px-3" />
                      <input type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3" />
                      <input type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3" />
                      <select value={eventLeadId} onChange={(e) => setEventLeadId(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm">
                        <option value="">Sem lead vinculado</option>
                        {leads.map((lead) => (
                          <option key={lead.id} value={lead.id}>
                            {(lead.name || "Sem nome") + " - " + lead.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                      <button onClick={() => setShowEventModal(false)} className="h-10 rounded-xl border border-[var(--line)] px-4 text-sm">Cancelar</button>
                      <button onClick={createEvent} disabled={creatingEvent} className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70">
                        {creatingEvent ? "Salvando..." : "Salvar evento"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {showDayModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                  <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-[var(--foreground)]">
                        Eventos do dia {selectedDay}/{calendarMonth.getMonth() + 1}
                      </h3>
                      <button onClick={() => { setShowDayModal(false); resetEventForm(); }} className="text-sm text-[var(--muted)]">Fechar</button>
                    </div>

                    <div className="max-h-[280px] space-y-2 overflow-auto pr-1">
                      {selectedDayEvents.length === 0 ? (
                        <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">
                          <div className="flex items-center justify-between gap-3">
                            <span>Sem eventos neste dia.</span>
                            <button
                              onClick={() => {
                                setEditingEventId("new");
                                const baseDay = selectedDay || 1;
                                const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), baseDay, 9, 0, 0);
                                const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), baseDay, 10, 0, 0);
                                setEventTitle("");
                                setEventStart(start.toISOString().slice(0, 16));
                                setEventEnd(end.toISOString().slice(0, 16));
                                setEventLeadId("");
                              }}
                              className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs text-[var(--foreground)]"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      ) : (
                        selectedDayEvents.map((event) => (
                          <div key={event.id} className="rounded-xl border border-pink-100 bg-pink-50/50 p-3">
                            <p className="text-sm font-semibold text-[var(--foreground)]">{event.title}</p>
                            <p className="text-xs text-[var(--muted)]">
                              {new Date(event.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {new Date(event.end_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button onClick={() => startEditEvent(event)} className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs">Editar</button>
                              <button onClick={() => deleteEvent(event.id)} className="h-8 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs text-rose-700">Excluir</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {editingEventId ? (
                      <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-4">
                        <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                          {editingEventId === "new" ? "Novo evento" : "Editar evento"}
                        </p>
                        <div className="space-y-2">
                          <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Titulo" className="h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm" />
                          <input type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm" />
                          <input type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm" />
                          <select value={eventLeadId} onChange={(e) => setEventLeadId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm">
                            <option value="">Sem lead vinculado</option>
                            {leads.map((lead) => (
                              <option key={lead.id} value={lead.id}>
                                {(lead.name || "Sem nome") + " - " + lead.phone}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button onClick={resetEventForm} className="h-9 rounded-lg border border-[var(--line)] px-3 text-xs">Cancelar</button>
                          <button
                            onClick={editingEventId === "new" ? createEvent : saveEditedEvent}
                            className="h-9 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : selectedModule === "tasks" ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">Tarefas</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Lista inteligente para manter rotina e entregas em dia.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.35)]">
                <div className="grid gap-3 md:grid-cols-[1fr_190px_1fr_auto]">
                  <input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Nova tarefa..."
                    className="h-11 rounded-xl border border-[var(--line)] px-3"
                  />
                  <input
                    type="datetime-local"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="h-11 rounded-xl border border-[var(--line)] px-3"
                  />
                  <select
                    value={newTaskLeadId}
                    onChange={(e) => setNewTaskLeadId(e.target.value)}
                    className="h-11 rounded-xl border border-[var(--line)] px-3 text-sm"
                  >
                    <option value="">Sem lead vinculado</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {(lead.name || "Sem nome") + " - " + lead.phone}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={createTask}
                    disabled={creatingTask}
                    className="h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:opacity-70"
                  >
                    {creatingTask ? "Salvando..." : "Adicionar"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Buscar por titulo, nome do lead ou telefone..."
                  className="h-11 rounded-xl border border-[var(--line)] bg-white px-3"
                />
                <button
                  onClick={() => setTaskDateAsc((prev) => !prev)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--foreground)]"
                >
                  <span>{`Data: ${taskDateAsc ? "asc" : "desc"}`}</span>
                  <span
                    className={`inline-block transition-transform duration-200 ${
                      taskDateAsc ? "rotate-0" : "rotate-180"
                    }`}
                  >
                    ↑
                  </span>
                </button>
              </div>

              {tasksError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {tasksError}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Pendentes</p>
                  <div className="space-y-2">
                    {loadingTasks ? (
                      <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">Carregando...</div>
                    ) : pendingTasks.length === 0 ? (
                      <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">Sem tasks pendentes.</div>
                    ) : (
                      pendingTasks.map((task) => (
                          <label key={task.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-pink-100 bg-pink-50/60 px-3 py-3">
                            <input
                              type="checkbox"
                              checked={task.is_completed}
                              onChange={() => toggleTask(task)}
                              className="mt-1 h-4 w-4 accent-[var(--primary)]"
                            />
                            <div>
                              <p className="text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                              <p className="text-xs text-[var(--muted)]">
                                {task.due_date ? new Date(task.due_date).toLocaleString("pt-BR") : "-"}
                              </p>
                              <p className="mt-2 text-xs text-[var(--muted)]">
                                Lead: {getLeadById(task.lead_id)?.name || "-"} {getLeadById(task.lead_id)?.phone ? `(${getLeadById(task.lead_id)?.phone})` : ""}
                              </p>
                            </div>
                          </label>
                        ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Concluidas</p>
                  <div className="space-y-2">
                    {completedTasks.length === 0 ? (
                      <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">Sem tasks concluidas.</div>
                    ) : (
                      completedTasks.map((task) => (
                          <label key={task.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-pink-100 bg-white px-3 py-3">
                            <input
                              type="checkbox"
                              checked={task.is_completed}
                              onChange={() => toggleTask(task)}
                              className="mt-1 h-4 w-4 accent-[var(--primary)]"
                            />
                            <div>
                              <p className="text-sm font-medium text-[var(--muted)] line-through">{task.title}</p>
                              <p className="text-xs text-[var(--muted)]">
                                {task.due_date ? new Date(task.due_date).toLocaleString("pt-BR") : "-"}
                              </p>
                              <p className="mt-2 text-xs text-[var(--muted)]">
                                Lead: {getLeadById(task.lead_id)?.name || "-"} {getLeadById(task.lead_id)?.phone ? `(${getLeadById(task.lead_id)?.phone})` : ""}
                              </p>
                            </div>
                          </label>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedModule === "chat" ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">Conversas</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {isChatConnected
                    ? "Conversas liberadas para uso."
                    : "As conversas so funcionam quando o numero da empresa estiver conectado com a Meta."}
                </p>
              </div>

              {chatConnectionError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {chatConnectionError}
                </div>
              ) : null}

              {!companyId ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-amber-900">Chat indisponivel sem empresa</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Para liberar o chat, primeiro crie sua empresa no onboarding no topo da tela.
                  </p>
                </div>
              ) : isChatConnected ? (
                <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                  <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Conversas</p>
                      <button
                        onClick={() => {
                          if (selectedChatLeadId) void loadMessagesForLead(selectedChatLeadId);
                        }}
                        className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]"
                      >
                        Atualizar
                      </button>
                    </div>
                    <input
                      value={chatLeadSearch}
                      onChange={(e) => setChatLeadSearch(e.target.value)}
                      placeholder="Buscar por nome ou telefone"
                      className="mb-3 h-10 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
                    />
                    <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                      {filteredChatLeads.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-[var(--line)] p-3 text-xs text-[var(--muted)]">
                          Nenhum lead encontrado.
                        </p>
                      ) : (
                        filteredChatLeads.map((lead) => {
                          const active = selectedChatLeadId === lead.id;
                          return (
                            <button
                              key={lead.id}
                              onClick={() => setSelectedChatLeadId(lead.id)}
                              className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                                active
                                  ? "border-[var(--primary)] bg-pink-50"
                                  : "border-[var(--line)] bg-white hover:bg-pink-50/40"
                              }`}
                            >
                              <p className="truncate text-sm font-semibold text-[var(--foreground)]">{lead.name || "Sem nome"}</p>
                              <p className="truncate text-xs text-[var(--muted)]">{lead.phone}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                    {selectedChatLead ? (
                      <>
                        <div className="border-b border-[var(--line)] pb-3">
                          <p className="text-sm font-semibold text-[var(--foreground)]">{selectedChatLead.name || "Sem nome"}</p>
                          <p className="text-xs text-[var(--muted)]">{selectedChatLead.phone}</p>
                          <p className={`mt-1 text-xs ${selectedLeadWindowOpen ? "text-emerald-700" : "text-amber-700"}`}>
                            {selectedLeadWindowOpen ? "Janela 24h: aberta" : "Janela 24h: fechada (use template)"}
                          </p>
                        </div>

                        <div className="mt-3 h-[430px] space-y-2 overflow-y-auto rounded-xl border border-[var(--line)] bg-[#fffdfd] p-3">
                          {loadingChatMessages ? (
                            <p className="text-xs text-[var(--muted)]">Carregando mensagens...</p>
                          ) : chatMessages.length === 0 ? (
                            <p className="text-xs text-[var(--muted)]">Sem mensagens nesta conversa.</p>
                          ) : (
                            chatMessages.map((message) => {
                              const outbound = message.direction === "outbound";
                              return (
                                <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                                  <div
                                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                                      outbound
                                        ? "bg-[var(--primary)] text-white"
                                        : "border border-[var(--line)] bg-white text-[var(--foreground)]"
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words">{message.content || message.body || "-"}</p>
                                    <p className={`mt-1 text-[10px] ${outbound ? "text-white/80" : "text-[var(--muted)]"}`}>
                                      {new Date(message.created_at).toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {chatMessagesError ? (
                          <p className="mt-2 text-xs text-rose-600">{chatMessagesError}</p>
                        ) : null}

                        {!selectedLeadWindowOpen ? (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs text-amber-800">
                              Janela fechada. Use a mensagem de abertura para reativar a conversa.
                            </p>
                            <button
                              onClick={sendRestartTemplate}
                              disabled={sendingChat}
                              className="mt-2 h-10 rounded-xl border border-amber-300 bg-white px-3 text-sm font-medium text-amber-800 disabled:opacity-60"
                            >
                              Enviar mensagem de abertura
                            </button>
                          </div>
                        ) : null}

                        <div className="mt-3 flex gap-2">
                          <input
                            value={chatText}
                            onChange={(e) => setChatText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void sendChatMessage();
                              }
                            }}
                            placeholder="Digite uma mensagem..."
                            disabled={!selectedLeadWindowOpen}
                            className="h-11 flex-1 rounded-xl border border-[var(--line)] px-3 text-sm disabled:bg-zinc-100"
                          />
                          <button
                            onClick={sendChatMessage}
                            disabled={sendingChat || !chatText.trim() || !selectedLeadWindowOpen}
                            className="h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Enviar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-[520px] items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">
                        Selecione uma conversa na lista ao lado.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Status atual:{" "}
                    <span className="text-[var(--primary)]">
                      {loadingChatConnection
                        ? "carregando..."
                        : chatConnection?.status || "nao_configurado"}
                    </span>
                  </p>
                  <div className="mt-4 rounded-xl border border-[var(--line)] bg-pink-50/50 p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Onboarding simplificado (manual)</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
                      <li>Cadastre o numero comercial no CRM.</li>
                      <li>No Meta Business Suite, conecte esse numero ao WhatsApp Business.</li>
                      <li>Copie os IDs da Meta e cole abaixo.</li>
                      <li>Marque como conectado para liberar o chat.</li>
                    </ol>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href="https://business.facebook.com/latest/home"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs leading-8 text-[var(--foreground)]"
                      >
                        Abrir Meta Business Suite
                      </a>
                      <a
                        href="https://business.facebook.com/latest/whatsapp_manager"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs leading-8 text-[var(--foreground)]"
                      >
                        Abrir WhatsApp Manager
                      </a>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      value={chatPhone}
                      onChange={(e) => setChatPhone(e.target.value)}
                      placeholder="+55..."
                      className="h-11 rounded-xl border border-[var(--line)] px-3"
                    />
                    <input
                      value={chatDisplayName}
                      onChange={(e) => setChatDisplayName(e.target.value)}
                      placeholder="Nome exibicao no WhatsApp"
                      className="h-11 rounded-xl border border-[var(--line)] px-3"
                    />
                    <input
                      value={chatMetaBusinessId}
                      onChange={(e) => setChatMetaBusinessId(e.target.value)}
                      placeholder="Meta business id (opcional)"
                      className="h-11 rounded-xl border border-[var(--line)] px-3"
                    />
                    <input
                      value={chatMetaPhoneId}
                      onChange={(e) => setChatMetaPhoneId(e.target.value)}
                      placeholder="Meta phone number id (opcional)"
                      className="h-11 rounded-xl border border-[var(--line)] px-3"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => void copyToClipboard(chatMetaBusinessId)}
                      className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs"
                    >
                      Copiar business id
                    </button>
                    <button
                      onClick={() => void copyToClipboard(chatMetaPhoneId)}
                      className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs"
                    >
                      Copiar phone number id
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={saveChatConnection}
                      disabled={savingChatConnection}
                      className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium"
                    >
                      Salvar e marcar pendente Meta
                    </button>
                    <button
                      onClick={markChatConnected}
                      disabled={savingChatConnection}
                      className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      Marcar como conectado
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : selectedModule === "conta" ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Empresa</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Empresa ativa: <span className="font-semibold text-[var(--foreground)]">{companyName || "-"}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Seu nivel: <span className="font-semibold text-[var(--foreground)]">{currentRole}</span>
              </p>
            </div>
          ) : selectedModule === "config" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">Configuracoes da Empresa</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Ajuste nome da empresa, numero comercial e dados da conexao com a Meta.
                </p>
                {!canManageOperations ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Somente owner/admin podem editar estas configuracoes.
                  </p>
                ) : null}
                {companySettingsError ? (
                  <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {companySettingsError}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input value={settingsName} onChange={(e) => setSettingsName(e.target.value)} placeholder="Nome da empresa" className="h-11 rounded-xl border border-[var(--line)] px-3" disabled={!canManageOperations} />
                  <input value={settingsPhone} onChange={(e) => setSettingsPhone(e.target.value)} placeholder="Numero comercial" className="h-11 rounded-xl border border-[var(--line)] px-3" disabled={!canManageOperations} />
                  <input value={settingsDisplayName} onChange={(e) => setSettingsDisplayName(e.target.value)} placeholder="Nome de exibicao no WhatsApp" className="h-11 rounded-xl border border-[var(--line)] px-3" disabled={!canManageOperations} />
                  <input value={settingsMetaBusinessId} onChange={(e) => setSettingsMetaBusinessId(e.target.value)} placeholder="Meta business id" className="h-11 rounded-xl border border-[var(--line)] px-3" disabled={!canManageOperations} />
                  <input value={settingsMetaPhoneId} onChange={(e) => setSettingsMetaPhoneId(e.target.value)} placeholder="Meta phone number id" className="h-11 rounded-xl border border-[var(--line)] px-3 md:col-span-2" disabled={!canManageOperations} />
                </div>
                <button onClick={saveCompanySettings} disabled={savingCompanySettings || !canManageOperations} className="mt-4 h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70">
                  {savingCompanySettings ? "Salvando..." : "Salvar configuracoes"}
                </button>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Membros e permissoes</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Apenas owner/admin podem alterar o papel dos membros.
                </p>
                <div className="mt-4 space-y-2">
                  {companyMembers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--line)] p-3 text-sm text-[var(--muted)]">
                      Nenhum membro encontrado.
                    </p>
                  ) : (
                    companyMembers.map((member) => {
                      const isOwner = member.role === "owner";
                      const isEditing = updatingMemberId === member.id;
                      return (
                        <div key={member.id} className="grid gap-2 rounded-xl border border-[var(--line)] p-3 md:grid-cols-[1fr_220px] md:items-center">
                          <div>
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {member.profile?.full_name || "Sem nome"}
                            </p>
                            <p className="text-xs text-[var(--muted)]">{member.profile?.phone || "-"}</p>
                          </div>
                          <select
                            value={member.role}
                            disabled={!canManageOperations || isOwner || isEditing}
                            onChange={(e) => void updateMemberRole(member.id, e.target.value as CompanyRole)}
                            className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm disabled:bg-zinc-100"
                          >
                            {isOwner ? (
                              <option value="owner">owner</option>
                            ) : (
                              editableRoles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Tema pessoal</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">Este ajuste vale apenas para voce neste navegador.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setThemeMode("rosa")} className={`h-10 rounded-xl border px-4 text-sm ${themeMode === "rosa" ? "border-[var(--primary)] bg-pink-50 text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--foreground)]"}`}>Rosa</button>
                  <button onClick={() => setThemeMode("grafite")} className={`h-10 rounded-xl border px-4 text-sm ${themeMode === "grafite" ? "border-[var(--primary)] bg-pink-50 text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--foreground)]"}`}>Grafite</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                {selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)}
              </h2>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
