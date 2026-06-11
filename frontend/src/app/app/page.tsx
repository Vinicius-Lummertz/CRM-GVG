"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyOnboarding } from "./components/CompanyOnboarding";
import { Sidebar } from "./components/Sidebar";
import { AgendaModule } from "./modules/AgendaModule";
import { ChatModule } from "./modules/ChatModule";
import { ConfigModule } from "./modules/ConfigModule";
import { ContaModule } from "./modules/ContaModule";
import { InicioModule } from "./modules/InicioModule";
import { KanbanModule } from "./modules/KanbanModule";
import { NotesModule } from "./modules/NotesModule";
import { TasksModule } from "./modules/TasksModule";
import { KANBAN_COLUMNS, type IconName } from "./shared";

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
type NoteNotebook = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};
type NoteItem = {
  id: string;
  company_id: string;
  notebook_id: string;
  title: string;
  content_json: Record<string, unknown>;
  content_html: string;
  content_text: string;
  color: string | null;
  is_pinned: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  notebook?: {
    id: string;
    title: string;
    color: string;
    icon: string;
  } | null;
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
const NOTEBOOK_COLORS = ["#2563eb", "#e63978", "#059669", "#d97706", "#7c3aed", "#0f766e"];

function htmlToPlainText(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const element = document.createElement("div");
  element.innerHTML = html;
  return (element.textContent || element.innerText || "").replace(/\s+/g, " ").trim();
}

function sanitizeNoteHtml(rawHtml: string) {
  if (typeof document === "undefined") return rawHtml;
  const template = document.createElement("template");
  template.innerHTML = rawHtml;
  template.content.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.toLowerCase();
      if (name.startsWith("on") || value.includes("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return template.innerHTML;
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
  const [noteNotebooks, setNoteNotebooks] = useState<NoteNotebook[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [newNotebookTitle, setNewNotebookTitle] = useState("");
  const [newNotebookColor, setNewNotebookColor] = useState(NOTEBOOK_COLORS[0]);
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noteEditorTitle, setNoteEditorTitle] = useState("");
  const [noteEditorHtml, setNoteEditorHtml] = useState("");
  const [noteEditorText, setNoteEditorText] = useState("");
  const [noteDirty, setNoteDirty] = useState(false);
  const [noteSaveStatus, setNoteSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteDirtyRef = useRef(false);
  const savingNoteRef = useRef(false);
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
    void loadNotesWorkspace(companyId);
  }, [companyId]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

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

  async function loadNotesWorkspace(activeCompanyId: string) {
    setLoadingNotes(true);
    setNotesError(null);
    try {
      const [notebooksResponse, notesResponse] = await Promise.all([
        fetch(`${API_BASE}/api/v2/note-notebooks?company_id=${encodeURIComponent(activeCompanyId)}`),
        fetch(`${API_BASE}/api/v2/notes?company_id=${encodeURIComponent(activeCompanyId)}`)
      ]);
      const notebooksData = await notebooksResponse.json();
      const notesData = await notesResponse.json();

      if (!notebooksResponse.ok || !notebooksData.success) {
        throw new Error(notebooksData.error || "Falha ao carregar cadernos.");
      }
      if (!notesResponse.ok || !notesData.success) {
        throw new Error(notesData.error || "Falha ao carregar notas.");
      }

      const nextNotebooks = (notebooksData.notebooks || []) as NoteNotebook[];
      const nextNotes = (notesData.notes || []) as NoteItem[];
      setNoteNotebooks(nextNotebooks);
      setNotes(nextNotes);

      const notebookExists = selectedNotebookId
        ? nextNotebooks.some((notebook) => notebook.id === selectedNotebookId)
        : false;
      const nextNotebookId = notebookExists ? selectedNotebookId : null;
      setSelectedNotebookId(nextNotebookId);

      const noteExists = selectedNoteId
        ? nextNotes.some((note) => note.id === selectedNoteId && (!nextNotebookId || note.notebook_id === nextNotebookId))
        : false;
      const nextNote = noteExists
        ? nextNotes.find((note) => note.id === selectedNoteId) || null
        : nextNotes.find((note) => !nextNotebookId || note.notebook_id === nextNotebookId) || null;
      selectNote(nextNote);
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Falha ao carregar notas.");
    } finally {
      setLoadingNotes(false);
    }
  }

  async function createNotebook() {
    if (!canWorkNotes) {
      setNotesError("Seu perfil nao possui permissao para criar cadernos.");
      return;
    }
    if (!companyId) return;
    const title = newNotebookTitle.trim();
    if (!title) {
      setNotesError("Informe o nome do caderno.");
      return;
    }

    setCreatingNotebook(true);
    setNotesError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v2/note-notebooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          title,
          color: newNotebookColor,
          created_by: profileId || null
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao criar caderno.");
      }

      setNewNotebookTitle("");
      setNewNotebookColor(NOTEBOOK_COLORS[0]);
      setShowNotebookModal(false);
      await loadNotesWorkspace(companyId);
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Falha ao criar caderno.");
    } finally {
      setCreatingNotebook(false);
    }
  }

  // Salva imediatamente a nota atual se houver alteracoes pendentes.
  // Usado antes de trocar de nota/pagina para nao perder o auto-save em voo.
  async function flushPendingSave() {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (noteDirtyRef.current) {
      await saveCurrentNote({ silent: true });
    }
  }

  // selectNote NAO controla o innerHTML via render (isso resetava o cursor).
  // O conteudo do editor e setado imperativamente aqui, so na troca de nota.
  function selectNote(note: NoteItem | null) {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const html = sanitizeNoteHtml(note?.content_html || "");
    setSelectedNoteId(note?.id || null);
    setNoteEditorTitle(note?.title || "");
    setNoteEditorHtml(html);
    setNoteEditorText(note?.content_text || "");
    setNoteDirty(false);
    noteDirtyRef.current = false;
    setNoteSaveStatus("idle");
    if (editorRef.current) {
      editorRef.current.innerHTML = html || "<p></p>";
    }
  }

  async function startNewNote() {
    // Garante que a nota em edicao seja persistida antes de abrir uma nova.
    await flushPendingSave();

    if (!selectedNotebookId && noteNotebooks[0]?.id) {
      setSelectedNotebookId(noteNotebooks[0].id);
    }
    setSelectedNoteId(null);
    setNoteEditorTitle("Nova nota");
    setNoteEditorHtml("<p></p>");
    setNoteEditorText("");
    if (editorRef.current) editorRef.current.innerHTML = "<p></p>";
    setNoteDirty(true);
    noteDirtyRef.current = true;
    setNoteSaveStatus("idle");
    setTimeout(() => editorRef.current?.focus(), 0);
    // Cria a pagina no servidor imediatamente (resolve o estado "vazio" fantasma).
    void saveCurrentNote({ silent: true });
  }

  function syncEditorContent() {
    const html = sanitizeNoteHtml(editorRef.current?.innerHTML || "");
    setNoteEditorText(htmlToPlainText(html));
    markNoteDirty();
  }

  function markNoteDirty() {
    setNoteDirty(true);
    noteDirtyRef.current = true;
    setNoteSaveStatus("idle");
    if (!canWorkNotes) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void saveCurrentNote({ silent: true });
    }, 3000);
  }

  function handleNoteTitleChange(value: string) {
    setNoteEditorTitle(value);
    markNoteDirty();
  }

  function formatNote(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  }

  async function saveCurrentNote(options: { silent?: boolean } = {}) {
    const silent = options.silent === true;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (!canWorkNotes) {
      if (!silent) setNotesError("Seu perfil nao possui permissao para salvar notas.");
      return;
    }
    if (!companyId) return;
    // Evita requisicoes concorrentes (ex.: auto-save disparando 2x cria nota duplicada).
    if (savingNoteRef.current) return;
    const notebookId = selectedNotebookId || noteNotebooks[0]?.id;
    if (!notebookId) {
      if (!silent) setNotesError("Crie um caderno antes de salvar notas.");
      return;
    }

    const title = noteEditorTitle.trim();
    if (!title) {
      if (!silent) setNotesError("Informe um titulo para a nota.");
      return;
    }

    const html = sanitizeNoteHtml(editorRef.current?.innerHTML || noteEditorHtml);
    const text = htmlToPlainText(html);
    const isUpdate = Boolean(selectedNoteId);
    const endpoint = isUpdate
      ? `${API_BASE}/api/v2/notes/${selectedNoteId}`
      : `${API_BASE}/api/v2/notes`;

    savingNoteRef.current = true;
    setSavingNote(true);
    setNoteSaveStatus("saving");
    if (!silent) setNotesError(null);
    try {
      const response = await fetch(endpoint, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          notebook_id: notebookId,
          title,
          content_json: { type: "html", version: 1 },
          content_html: html,
          content_text: text,
          updated_by: profileId || null,
          created_by: profileId || null
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao salvar nota.");
      }

      const savedNote = data.note as NoteItem;
      setSelectedNoteId(savedNote.id);
      // NAO sobrescrevemos o innerHTML do editor aqui (resetaria o cursor).
      // Mantemos o que o usuario ja tem; o backend so confirma o que enviamos.

      // Se o conteudo nao mudou desde o envio, esta tudo salvo.
      // Se o usuario continuou digitando, mantem dirty e reagenda o save.
      const currentHtml = sanitizeNoteHtml(editorRef.current?.innerHTML || "");
      const stillDirty = currentHtml !== html || noteEditorTitle.trim() !== title;
      if (stillDirty) {
        noteDirtyRef.current = true;
        setNoteDirty(true);
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => void saveCurrentNote({ silent: true }), 3000);
      } else {
        noteDirtyRef.current = false;
        setNoteDirty(false);
        setNoteSaveStatus("saved");
      }

      // Atualizacao otimista da lista — sem recarregar o workspace inteiro.
      setNotes((previous) => {
        const exists = previous.some((note) => note.id === savedNote.id);
        return exists
          ? previous.map((note) => (note.id === savedNote.id ? savedNote : note))
          : [savedNote, ...previous];
      });
    } catch (error) {
      setNoteSaveStatus("error");
      setNotesError(error instanceof Error ? error.message : "Falha ao salvar nota.");
    } finally {
      savingNoteRef.current = false;
      setSavingNote(false);
    }
  }

  async function toggleNotePinned(note: NoteItem) {
    if (!companyId || !canWorkNotes) return;
    const nextPinned = !note.is_pinned;
    // Otimista: reflete na hora, reverte se falhar.
    setNotes((previous) =>
      previous.map((item) => (item.id === note.id ? { ...item, is_pinned: nextPinned } : item))
    );
    try {
      const response = await fetch(`${API_BASE}/api/v2/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          is_pinned: nextPinned,
          updated_by: profileId || null
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao fixar nota.");
      }
    } catch (error) {
      setNotes((previous) =>
        previous.map((item) => (item.id === note.id ? { ...item, is_pinned: note.is_pinned } : item))
      );
      setNotesError(error instanceof Error ? error.message : "Falha ao fixar nota.");
    }
  }

  async function deleteCurrentNote() {
    if (!companyId || !selectedNoteId || !canWorkNotes) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const removedId = selectedNoteId;
    const previousNotes = notes;
    setSavingNote(true);
    setNotesError(null);
    // Otimista: remove da lista e seleciona a proxima pagina do caderno.
    const remaining = notes.filter((note) => note.id !== removedId);
    setNotes(remaining);
    const nextNote = remaining.find((note) => !selectedNotebookId || note.notebook_id === selectedNotebookId) || null;
    selectNote(nextNote);
    try {
      const response = await fetch(`${API_BASE}/api/v2/notes/${removedId}?company_id=${encodeURIComponent(companyId)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao remover nota.");
      }
    } catch (error) {
      setNotes(previousNotes);
      setNotesError(error instanceof Error ? error.message : "Falha ao remover nota.");
    } finally {
      setSavingNote(false);
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
    owner: ["inicio", "kanban", "agenda", "tasks", "notes", "chat", "conta", "config"],
    admin: ["inicio", "kanban", "agenda", "tasks", "notes", "chat", "conta", "config"],
    assistant_ops: ["inicio", "agenda", "tasks", "notes"],
    operator_chat: ["inicio", "chat"],
    viewer: ["inicio"],
  };
  const canManageOperations = currentRole === "owner" || currentRole === "admin";
  const canWorkTasksCalendar = canManageOperations || currentRole === "assistant_ops";
  const canWorkNotes = canWorkTasksCalendar;
  const canWorkChat = canManageOperations || currentRole === "operator_chat";
  const allowedModules = moduleAccessByRole[currentRole] || ["inicio"];

  const modules = useMemo(
    () => [
      { id: "inicio", label: "Inicio", icon: "home" as IconName },
      { id: "kanban", label: "Kanban", icon: "kanban" as IconName },
      { id: "agenda", label: "Agenda", icon: "calendar" as IconName },
      { id: "tasks", label: "Tarefas", icon: "tasks" as IconName },
      { id: "notes", label: "Notas", icon: "notes" as IconName },
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
  const selectedNotebook = noteNotebooks.find((notebook) => notebook.id === selectedNotebookId) || null;
  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;
  const filteredNotes = notes.filter((note) => {
    const query = noteSearch.trim().toLowerCase();
    const notebookMatch = !selectedNotebookId || note.notebook_id === selectedNotebookId;
    const searchMatch =
      !query ||
      note.title.toLowerCase().includes(query) ||
      (note.content_text || "").toLowerCase().includes(query);
    return notebookMatch && searchMatch;
  });
  const sortedNotes = filteredNotes.slice().sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  const totalNotesInSelectedNotebook = selectedNotebookId
    ? notes.filter((note) => note.notebook_id === selectedNotebookId).length
    : notes.length;
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
        <Sidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          phone={session.phone}
          modules={modules}
          accountItems={accountItems}
          allowedModules={allowedModules}
          selectedModule={selectedModule}
          setSelectedModule={setSelectedModule}
          logout={logout}
        />

        <section className="flex-1 p-6 md:p-8">
          <CompanyOnboarding
            companyId={companyId}
            newCompanyName={newCompanyName}
            setNewCompanyName={setNewCompanyName}
            newCompanyPhone={newCompanyPhone}
            setNewCompanyPhone={setNewCompanyPhone}
            companyOnboardingError={companyOnboardingError}
            createCompanyOnboarding={createCompanyOnboarding}
            creatingCompany={creatingCompany}
          />

          {selectedModule === "inicio" ? (
            <InicioModule
              summaryError={summaryError}
              loadingSummary={loadingSummary}
              summary={summary}
              leadsTrendPoints={leadsTrendPoints}
              revenueTrendPoints={revenueTrendPoints}
              upcomingEventsDashboard={upcomingEventsDashboard}
            />
          ) : selectedModule === "kanban" ? (
            <KanbanModule
              leadsError={leadsError}
              loadingLeads={loadingLeads}
              leadsByColumn={leadsByColumn}
              moveLead={moveLead}
              showLeadModal={showLeadModal}
              setShowLeadModal={setShowLeadModal}
              leadName={leadName}
              setLeadName={setLeadName}
              leadPhone={leadPhone}
              setLeadPhone={setLeadPhone}
              createLeadManually={createLeadManually}
              creatingLead={creatingLead}
            />
          ) : selectedModule === "agenda" ? (
            <AgendaModule
              calendarMonth={calendarMonth}
              setCalendarMonth={setCalendarMonth}
              monthLabel={monthLabel}
              setShowEventModal={setShowEventModal}
              eventsError={eventsError}
              upcomingCollapsed={upcomingCollapsed}
              setUpcomingCollapsed={setUpcomingCollapsed}
              firstWeekDay={firstWeekDay}
              daysInMonth={daysInMonth}
              eventsByDay={eventsByDay}
              loadingEvents={loadingEvents}
              openDayModal={openDayModal}
              upcomingEvents={upcomingEvents}
              showEventModal={showEventModal}
              eventTitle={eventTitle}
              setEventTitle={setEventTitle}
              eventStart={eventStart}
              setEventStart={setEventStart}
              eventEnd={eventEnd}
              setEventEnd={setEventEnd}
              eventLeadId={eventLeadId}
              setEventLeadId={setEventLeadId}
              leads={leads}
              createEvent={createEvent}
              creatingEvent={creatingEvent}
              showDayModal={showDayModal}
              selectedDay={selectedDay}
              resetEventForm={resetEventForm}
              setShowDayModal={setShowDayModal}
              selectedDayEvents={selectedDayEvents}
              setEditingEventId={setEditingEventId}
              startEditEvent={startEditEvent}
              deleteEvent={deleteEvent}
              editingEventId={editingEventId}
              saveEditedEvent={saveEditedEvent}
            />
          ) : selectedModule === "tasks" ? (
            <TasksModule
              newTaskTitle={newTaskTitle}
              setNewTaskTitle={setNewTaskTitle}
              newTaskDueDate={newTaskDueDate}
              setNewTaskDueDate={setNewTaskDueDate}
              newTaskLeadId={newTaskLeadId}
              setNewTaskLeadId={setNewTaskLeadId}
              leads={leads}
              createTask={createTask}
              creatingTask={creatingTask}
              taskSearch={taskSearch}
              setTaskSearch={setTaskSearch}
              taskDateAsc={taskDateAsc}
              setTaskDateAsc={setTaskDateAsc}
              tasksError={tasksError}
              loadingTasks={loadingTasks}
              pendingTasks={pendingTasks}
              completedTasks={completedTasks}
              toggleTask={toggleTask}
              getLeadById={getLeadById}
            />
          ) : selectedModule === "notes" ? (
            <NotesModule
              startNewNote={startNewNote}
              canWorkNotes={canWorkNotes}
              noteNotebooks={noteNotebooks}
              savingNote={savingNote}
              noteDirty={noteDirty}
              noteSaveStatus={noteSaveStatus}
              notesError={notesError}
              loadingNotes={loadingNotes}
              selectedNotebookId={selectedNotebookId}
              notes={notes}
              setSelectedNotebookId={setSelectedNotebookId}
              selectNote={selectNote}
              newNotebookTitle={newNotebookTitle}
              setNewNotebookTitle={setNewNotebookTitle}
              notebookColors={NOTEBOOK_COLORS}
              setNewNotebookColor={setNewNotebookColor}
              newNotebookColor={newNotebookColor}
              createNotebook={createNotebook}
              creatingNotebook={creatingNotebook}
              showNotebookModal={showNotebookModal}
              setShowNotebookModal={setShowNotebookModal}
              flushPendingSave={flushPendingSave}
              selectedNotebook={selectedNotebook}
              totalNotesInSelectedNotebook={totalNotesInSelectedNotebook}
              companyId={companyId}
              loadNotesWorkspace={loadNotesWorkspace}
              noteSearch={noteSearch}
              setNoteSearch={setNoteSearch}
              sortedNotes={sortedNotes}
              selectedNoteId={selectedNoteId}
              formatNote={formatNote}
              selectedNote={selectedNote}
              toggleNotePinned={toggleNotePinned}
              deleteCurrentNote={deleteCurrentNote}
              noteEditorTitle={noteEditorTitle}
              setNoteEditorTitle={handleNoteTitleChange}
              editorRef={editorRef}
              syncEditorContent={syncEditorContent}
              noteEditorHtml={noteEditorHtml}
              noteEditorText={noteEditorText}
            />
          ) : selectedModule === "chat" ? (
            <ChatModule
              isChatConnected={isChatConnected}
              chatConnectionError={chatConnectionError}
              companyId={companyId}
              selectedChatLeadId={selectedChatLeadId}
              loadMessagesForLead={loadMessagesForLead}
              chatLeadSearch={chatLeadSearch}
              setChatLeadSearch={setChatLeadSearch}
              filteredChatLeads={filteredChatLeads}
              setSelectedChatLeadId={setSelectedChatLeadId}
              selectedChatLead={selectedChatLead}
              selectedLeadWindowOpen={selectedLeadWindowOpen}
              loadingChatMessages={loadingChatMessages}
              chatMessages={chatMessages}
              chatMessagesError={chatMessagesError}
              sendRestartTemplate={sendRestartTemplate}
              sendingChat={sendingChat}
              chatText={chatText}
              setChatText={setChatText}
              sendChatMessage={sendChatMessage}
              loadingChatConnection={loadingChatConnection}
              chatConnection={chatConnection}
              chatPhone={chatPhone}
              setChatPhone={setChatPhone}
              chatDisplayName={chatDisplayName}
              setChatDisplayName={setChatDisplayName}
              chatMetaBusinessId={chatMetaBusinessId}
              setChatMetaBusinessId={setChatMetaBusinessId}
              chatMetaPhoneId={chatMetaPhoneId}
              setChatMetaPhoneId={setChatMetaPhoneId}
              copyToClipboard={copyToClipboard}
              saveChatConnection={saveChatConnection}
              markChatConnected={markChatConnected}
              savingChatConnection={savingChatConnection}
            />
          ) : selectedModule === "conta" ? (
            <ContaModule companyName={companyName} currentRole={currentRole} />
          ) : selectedModule === "config" ? (
            <ConfigModule
              canManageOperations={canManageOperations}
              companySettingsError={companySettingsError}
              settingsName={settingsName}
              setSettingsName={setSettingsName}
              settingsPhone={settingsPhone}
              setSettingsPhone={setSettingsPhone}
              settingsDisplayName={settingsDisplayName}
              setSettingsDisplayName={setSettingsDisplayName}
              settingsMetaBusinessId={settingsMetaBusinessId}
              setSettingsMetaBusinessId={setSettingsMetaBusinessId}
              settingsMetaPhoneId={settingsMetaPhoneId}
              setSettingsMetaPhoneId={setSettingsMetaPhoneId}
              saveCompanySettings={saveCompanySettings}
              savingCompanySettings={savingCompanySettings}
              companyMembers={companyMembers}
              updatingMemberId={updatingMemberId}
              updateMemberRole={updateMemberRole}
              editableRoles={editableRoles}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
            />
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
