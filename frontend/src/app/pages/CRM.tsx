import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  List,
  Inbox,
  LayoutDashboard,
  CheckSquare,
  Users,
  CalendarDays,
  Settings,
  LogOut,
  MessageSquare,
  Plus,
  X,
  Send,
  ChevronDown,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { STATUS_CONFIG, getAllStatuses, type StatusValue } from '../data/statusConfig';
import * as api from '../../services/api';

interface Lead {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  status: StatusValue;
  last_message?: string;
  last_message_at?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  photo?: string;
  isActive: boolean;
}

interface TaskChecklistItem {
  id: string;
  title: string;
  done: boolean;
}

interface Task {
  id: string;
  title: string;
  assigneeId: string;
  checklist: TaskChecklistItem[];
}

type TabKey = 'leads' | 'inbox' | 'kanban' | 'tasks' | 'team' | 'agenda' | 'settings';

const sidebarTabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'leads', label: 'Leads', icon: <List className="w-4 h-4" /> },
  { key: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
  { key: 'kanban', label: 'Kanban', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'tasks', label: 'Tarefas', icon: <CheckSquare className="w-4 h-4" /> },
  { key: 'team', label: 'Equipe', icon: <Users className="w-4 h-4" /> },
  { key: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-4 h-4" /> },
  { key: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
];

// MOCKUP: equipe de usuários/números cadastrados usados na visão de Equipe e Tarefas
const initialTeamMembers: TeamMember[] = [
  { id: 'u1', name: 'Gabriel Ferreira', role: 'Gestor de CRM', phone: '+55 11 91234-5678', isActive: true },
  { id: 'u2', name: 'Luiza Santos', role: 'Analista de Vendas', phone: '+55 11 99876-5432', isActive: true },
  { id: 'u3', name: 'Marcelo Lima', role: 'Consultor', phone: '+55 11 98765-4321', isActive: false },
];

function normalizePhoneForApi(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
}

function onlyDigits(rawPhone: string) {
  return rawPhone.replace(/\D/g, '');
}

export default function CRM() {
  const router = useRouter();
  const [clients, setClients] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('leads');
  const [filterType, setFilterType] = useState<'nome' | 'numero'>('nome');
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState('');
  // MOCKUP: tarefas internas para o fluxo de Tarefas
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'task-1',
      title: 'Revisar proposta do cliente',
      assigneeId: 'u2',
      checklist: [
        { id: 'i1', title: 'Revisar valores', done: false },
        { id: 'i2', title: 'Confirmar prazo', done: true },
      ],
    },
  ]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(teamMembers[0]?.id || '');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskChecklistInputs, setTaskChecklistInputs] = useState<Array<{ id: string; value: string }>>([
    { id: '1', value: '' },
  ]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamModalStep, setTeamModalStep] = useState<'phone' | 'code'>('phone');
  const [newTeamPhone, setNewTeamPhone] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [editingTeamMemberId, setEditingTeamMemberId] = useState<string | null>(null);
  const [editingMemberData, setEditingMemberData] = useState<Partial<TeamMember>>({});
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [taskFilterText, setTaskFilterText] = useState('');
  const [taskFilterAssignee, setTaskFilterAssignee] = useState<string>('todos');
  const [teamFilterText, setTeamFilterText] = useState('');
  const [dragSource, setDragSource] = useState<{ clientId: string; status: StatusValue } | null>(null);
  const [draggedChecklistItem, setDraggedChecklistItem] = useState<{ taskId: string; itemId: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const checklistInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await api.getLeads('', 'auto', token);

        if (response.success && response.leads) {
          const mappedLeads = response.leads.map((lead: any) => ({
            id: lead.id,
            name: lead.name || 'Sem nome',
            phone: lead.phone || '',
            photo: `https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHBlcnNvbnxlbnwxfHx8fDE3NzI5MDgzMzh8MA&ixlib=rb-4.1.0&q=80&w=1080`,
            status: (lead.status || 'lead') as StatusValue,
            last_message: lead.last_message_preview || '',
            last_message_at: lead.last_message_at || new Date().toISOString(),
          }));
          setClients(mappedLeads);
        }
      } catch (error) {
        console.error('Erro ao carregar leads:', error);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesText =
        filterType === 'nome'
          ? client.name.toLowerCase().includes(filterText.toLowerCase())
          : client.phone.includes(filterText);

      const matchesStatus = filterStatus === 'todos' || client.status === filterStatus;

      return matchesText && matchesStatus;
    });
  }, [clients, filterType, filterText, filterStatus]);

  const inboxClients = useMemo(() => {
    return [...clients].sort((a, b) =>
      new Date(b.last_message_at || '').getTime() - new Date(a.last_message_at || '').getTime()
    );
  }, [clients]);

  const tasksByAssignee = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesText = task.title.toLowerCase().includes(taskFilterText.toLowerCase());
        const matchesAssignee = taskFilterAssignee === 'todos' || task.assigneeId === taskFilterAssignee;
        return matchesText && matchesAssignee;
      })
      .map((task) => ({
        ...task,
        assignee: teamMembers.find((member) => member.id === task.assigneeId),
      }))
      .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());
  }, [tasks, taskFilterText, taskFilterAssignee, teamMembers]);

  const filteredTeamMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      const matchesText =
        member.name.toLowerCase().includes(teamFilterText.toLowerCase()) ||
        member.phone.includes(teamFilterText);
      return matchesText;
    });
  }, [teamMembers, teamFilterText]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEditingStatusId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('userPhone');
    router.push('/');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';

    const now = new Date();
    const messageDate = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - messageDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      return messageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const handleChangeStatus = async (clientId: string, newStatus: StatusValue) => {
    try {
      const token = localStorage.getItem('token');
      await api.updateLeadStatus(clientId, newStatus, token);

      setClients((prevClients) =>
        prevClients.map((client) =>
          client.id === clientId ? { ...client, status: newStatus } : client
        )
      );
      setEditingStatusId(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do cliente');
    }
  };

  const handleSendNewMessage = async () => {
    const normalizedPhone = normalizePhoneForApi(newPhone);
    const normalizedMessage = newMessage.trim();

    if (!normalizedPhone || !normalizedMessage) return;

    if (normalizedPhone.length < 13) {
      setSendError('Informe um numero de WhatsApp valido com DDD.');
      return;
    }

    setSendingMessage(true);
    setSendError('');

    try {
      const token = localStorage.getItem('token');
      const existingClient = clients.find(
        (c) => onlyDigits(c.phone) === onlyDigits(normalizedPhone)
      );

      let clientId = existingClient?.id;

      if (!existingClient) {
        const createResponse = await api.createLead(normalizedPhone, normalizedPhone, token);
        if (createResponse.success) {
          clientId = createResponse.leadId;
        } else {
          throw new Error(createResponse.error || 'Erro ao criar cliente');
        }
      }

      await api.sendChatMessage(clientId, normalizedMessage, token);

      if (!existingClient && clientId) {
        const newLead: Lead = {
          id: clientId,
          name: normalizedPhone,
          phone: normalizedPhone,
          photo: 'https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHBlcnNvbnxlbnwxfHx8fDE3NzI5MDgzMzh8MA&ixlib=rb-4.1.0&q=80&w=1080',
          status: 'lead',
          last_message: normalizedMessage,
          last_message_at: new Date().toISOString(),
        };
        setClients([newLead, ...clients]);
      } else if (existingClient) {
        setClients((prevClients) =>
          prevClients.map((c) =>
            c.id === existingClient.id
              ? { ...c, last_message: normalizedMessage, last_message_at: new Date().toISOString() }
              : c
          )
        );
      }

      setShowNewMessageModal(false);
      setNewPhone('');
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setSendError(
        error instanceof Error ? error.message : 'Erro ao enviar mensagem. Tente novamente.'
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;

    const checklistItems = taskChecklistInputs
      .map((input, index) => ({
        id: input.id,
        title: input.value.trim(),
        done: false,
      }))
      .filter((item) => item.title);

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      assigneeId: newTaskAssignee,
      checklist: checklistItems,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
    setTaskChecklistInputs([{ id: '1', value: '' }]);
    setShowTaskModal(false);
  };

  const handleToggleChecklistItem = (taskId: string, itemId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id !== taskId
          ? task
          : {
              ...task,
              checklist: task.checklist.map((item) =>
                item.id !== itemId ? item : { ...item, done: !item.done }
              ),
            }
      )
    );
  };

  const handleChecklistKeyDown = (index: number, e: React.KeyboardEvent) => {
    const currentValue = taskChecklistInputs[index].value.trim();

    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (currentValue) {
        // Se há texto no input atual, focar no próximo
        if (index < taskChecklistInputs.length - 1) {
          // Próximo input existe, dar focus
          setTimeout(() => {
            checklistInputRefs.current[index + 1]?.focus();
          }, 0);
        } else {
          // Não há próximo, criar novo
          const newId = String(parseInt(taskChecklistInputs[taskChecklistInputs.length - 1].id) + 1);
          setTaskChecklistInputs([...taskChecklistInputs, { id: newId, value: '' }]);
          setTimeout(() => {
            checklistInputRefs.current[index + 1]?.focus();
          }, 0);
        }
      }
    } else if (e.key === 'Backspace') {
      // Se o input está vazio
      if (currentValue === '') {
        e.preventDefault();
        
        // Se há um input anterior, apagar o atual e focar no anterior
        if (index > 0) {
          setTaskChecklistInputs(taskChecklistInputs.filter((_, i) => i !== index));
          setTimeout(() => {
            checklistInputRefs.current[index - 1]?.focus();
          }, 0);
        }
      }
    }
  };

  const handleChecklistChange = (index: number, value: string) => {
    setTaskChecklistInputs(
      taskChecklistInputs.map((item, i) => (i === index ? { ...item, value } : item))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setEditingTaskId(null);
  };

  const handleAddTeamMember = () => {
    if (teamModalStep === 'phone') {
      if (newTeamPhone.trim()) {
        setTeamModalStep('code');
      }
    } else if (teamModalStep === 'code') {
      if (newTeamCode.trim()) {
        const newMember: TeamMember = {
          id: `u${Date.now()}`,
          name: newTeamPhone,
          role: 'Membro da Equipe',
          phone: normalizePhoneForApi(newTeamPhone),
          photo: undefined,
          isActive: true,
        };
        setTeamMembers((prev) => [newMember, ...prev]);
        setNewTeamPhone('');
        setNewTeamCode('');
        setTeamModalStep('phone');
        setShowTeamModal(false);
      }
    }
  };

  const handleEditTeamMember = (member: TeamMember) => {
    setEditingTeamMemberId(member.id);
    setEditingMemberData({ ...member });
    setShowEditTeamModal(true);
  };

  const handleSaveTeamMemberEdit = () => {
    if (editingTeamMemberId) {
      setTeamMembers((prev) =>
        prev.map((member) =>
          member.id === editingTeamMemberId ? { ...member, ...editingMemberData } : member
        )
      );
      setShowEditTeamModal(false);
      setEditingTeamMemberId(null);
      setEditingMemberData({});
    }
  };

  const handleDragStartChecklist = (taskId: string, itemId: string) => {
    setDraggedChecklistItem({ taskId, itemId });
  };

  const handleDropChecklist = (taskId: string, targetIndex: number) => {
    if (!draggedChecklistItem || draggedChecklistItem.taskId !== taskId) return;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const items = [...task.checklist];
        const draggedItemIndex = items.findIndex((item) => item.id === draggedChecklistItem.itemId);
        if (draggedItemIndex === -1) return task;

        const [draggedItem] = items.splice(draggedItemIndex, 1);
        items.splice(targetIndex, 0, draggedItem);

        return { ...task, checklist: items };
      })
    );

    setDraggedChecklistItem(null);
  };

  const handleDragStart = (clientId: string, status: StatusValue) => {
    setDragSource({ clientId, status });
  };

  const handleDrop = (targetStatus: StatusValue) => {
    if (!dragSource) return;

    setClients((prevClients) =>
      prevClients.map((client) =>
        client.id === dragSource.clientId ? { ...client, status: targetStatus } : client
      )
    );
    setDragSource(null);
  };

  const activeTabTitle = sidebarTabs.find((tab) => tab.key === activeTab)?.label ?? 'Leads';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 flex-col border-r border-gray-200 bg-white p-6 lg:flex">
          <div className="mb-8 flex items-center gap-3">
            <Image src="/logogvg.png" alt="GVG CRM" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            <div>
              <p className="text-sm text-gray-500">GVG CRM</p>
              <h1 className="text-lg font-semibold">Painel Principal</h1>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {sidebarTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                  activeTab === tab.key
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-6 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </aside>

        <main className="flex-1 p-4 lg:p-6">
          <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">Sessão atual</p>
              <h2 className="text-2xl font-semibold text-gray-900">{activeTabTitle}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">Visão principal</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>

          {activeTab === 'leads' && (
            <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Total de leads</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{clients.length}</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Leads em negociação</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">
                    {clients.filter((lead) => lead.status === 'negotiating').length}
                  </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Convertidos</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">
                    {clients.filter((lead) => lead.status === 'converted').length}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
                {loading ? (
                  <div className="px-6 py-12 text-center text-gray-500">Carregando clientes...</div>
                ) : (
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Número</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Última Mensagem</th>
                        <th className="px-6 py-4 text-center">Chat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredClients.map((client) => {
                        const statusConfig = STATUS_CONFIG[client.status] || STATUS_CONFIG.lead;
                        return (
                          <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={client.photo}
                                  alt={client.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                                <div>
                                  <p className="font-medium text-gray-900">{client.name}</p>
                                  <p className="text-xs text-gray-500">{client.phone}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{client.phone}</td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() =>
                                  setEditingStatusId(editingStatusId === client.id ? null : client.id)
                                }
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${statusConfig.color}`}
                              >
                                {statusConfig.label}
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {editingStatusId === client.id && (
                                <div
                                  ref={dropdownRef}
                                  className="absolute z-20 mt-2 w-[220px] rounded-2xl border border-gray-200 bg-white shadow-lg"
                                >
                                  {getAllStatuses().map((status) => (
                                    <button
                                      key={status.value}
                                      onClick={() => handleChangeStatus(client.id, status.value)}
                                      className={`flex w-full items-center gap-2 px-4 py-3 text-sm text-left transition hover:bg-gray-50 ${
                                        client.status === status.value ? 'bg-gray-50' : ''
                                      }`}
                                    >
                                      <span className={`h-2.5 w-2.5 rounded-full ${status.color.split(' ')[0].replace('bg-', 'bg-')}`} />
                                      {status.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <p className="max-w-xs truncate text-gray-600">{client.last_message || 'Sem mensagens'}</p>
                              <p className="mt-1 text-xs text-gray-400">{formatDate(client.last_message_at)}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => router.push(`/chat/${client.id}`)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 transition hover:bg-pink-100"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {activeTab === 'inbox' && (
            <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Conversas recentes</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{clients.length}</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Mensagens não lidas</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">
                    {clients.filter((lead) => lead.status !== 'converted').length}
                  </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Última atualização</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">
                    {clients.length ? formatDate(clients[0].last_message_at) : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {inboxClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => router.push(`/chat/${client.id}`)}
                    className="w-full rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-pink-300 hover:shadow-md text-left"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={client.photo}
                        alt={client.name}
                        className="h-14 w-14 rounded-2xl object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                            <p className="text-sm text-gray-500">{client.phone}</p>
                          </div>
                          <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
                            {client.status !== 'converted' ? 'Não lido' : 'Arquivado'}
                          </span>
                        </div>
                        <p className="mt-4 text-sm text-gray-600 line-clamp-2">{client.last_message || 'Nenhuma mensagem recente'}</p>
                        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                          <span>{formatDate(client.last_message_at)}</span>
                          <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">
                            Abrir chat →
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'kanban' && (
            <section className="space-y-6">
              <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white p-4 shadow-sm -mx-4 lg:-mx-6 px-4 lg:px-6">
                <div className="flex gap-4 min-w-min">
                  {getAllStatuses().map((status) => (
                    <div
                      key={status.value}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(status.value)}
                      className="flex-shrink-0 w-80 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">{status.label}</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {clients.filter((client) => client.status === status.value).length}
                          </p>
                        </div>
                        <span className="h-3 w-3 rounded-full bg-pink-500" />
                      </div>
                      <div className="space-y-3 min-h-[220px]">
                        {clients
                          .filter((client) => client.status === status.value)
                          .map((client) => (
                            <div
                              key={client.id}
                              draggable
                              onDragStart={() => handleDragStart(client.id, client.status)}
                              className="cursor-grab rounded-3xl border border-gray-200 bg-gray-50 p-4 shadow-sm transition hover:border-pink-300 hover:bg-white"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-gray-900">{client.name}</p>
                                  <p className="text-xs text-gray-500">{client.phone}</p>
                                </div>
                                <span className="text-xs text-gray-400">Arraste</span>
                              </div>
                              <p className="mt-3 text-sm text-gray-600 line-clamp-2">{client.last_message || 'Sem mensagem recente'}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'tasks' && (
            <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Tarefas ativas</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{tasks.length}</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Concluídas</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">
                    {tasks.filter((t) => t.checklist.every((item) => item.done)).length}
                  </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Membros</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{teamMembers.length}</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Pendentes</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">
                    {tasks.filter((t) => t.checklist.some((item) => !item.done)).length}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={taskFilterText}
                  onChange={(e) => setTaskFilterText(e.target.value)}
                  placeholder="Filtrar por título..."
                  className="flex-1 rounded-2xl border border-gray-200 px-4 py-2 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
                <select
                  value={taskFilterAssignee}
                  onChange={(e) => setTaskFilterAssignee(e.target.value)}
                  className="rounded-2xl border border-gray-200 px-4 py-2 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                >
                  <option value="todos">Todos os usuários</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                {tasksByAssignee.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => setEditingTaskId(editingTaskId === task.id ? null : task.id)}
                      className="w-full flex flex-wrap items-center justify-between gap-4 p-6 text-left cursor-pointer transition hover:bg-gray-50"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-500">
                          Atribuída a {task.assignee?.name ?? 'Sem responsável'}
                        </p>
                      </div>
                      <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
                        {task.checklist.filter((item) => item.done).length}/{task.checklist.length} concluídos
                      </span>
                    </button>

                    {editingTaskId === task.id && (
                      <div className="border-t border-gray-200 p-6 space-y-3 bg-gray-50">
                        {task.checklist.map((item, index) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={() => handleDragStartChecklist(task.id, item.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropChecklist(task.id, index)}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3 transition hover:border-pink-300 bg-white"
                          >
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <button
                              onClick={() => handleToggleChecklistItem(task.id, item.id)}
                              className={`flex-1 text-left ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                            >
                              {item.title}
                            </button>
                            <span className={`rounded-full px-2 py-1 text-xs whitespace-nowrap ${item.done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {item.done ? 'Feito' : 'Pendente'}
                            </span>
                          </div>
                        ))}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                          Deletar tarefa
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'team' && (
            <section className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <input
                  type="text"
                  value={teamFilterText}
                  onChange={(e) => setTeamFilterText(e.target.value)}
                  placeholder="Filtrar por nome ou número..."
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTeamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleEditTeamMember(member)}
                    className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-pink-300 hover:shadow-md text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-pink-50 text-pink-600 flex-shrink-0">
                        {member.name.split(' ').map((word) => word[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                        <p className="text-sm text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3 text-sm text-gray-600">
                      <p>Número: {member.phone}</p>
                      <p>Status: <span className={`font-medium ${member.isActive ? 'text-green-600' : 'text-gray-400'}`}>{member.isActive ? 'Ativo' : 'Inativo'}</span></p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'agenda' && (
            <section className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Agenda</h3>
                <p className="mt-4 text-gray-600">
                  Integração com o Google Agenda será adicionada em breve. Aqui você terá seus compromissos e próximos eventos em uma visualização única.
                </p>
                <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                  <p className="text-sm">Fazer depois: integração com Google Agenda</p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Configurações</h3>
                <p className="mt-3 text-gray-600">Ajuste preferências do sistema, controle de notificações e configurações da conta.</p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-800">Notificações</p>
                    <p className="mt-2 text-sm text-gray-600">Ative ou desative alertas de novas mensagens e lembretes.</p>
                  </div>
                  <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-800">Conta</p>
                    <p className="mt-2 text-sm text-gray-600">Gerencie informações de login e usuários autorizados.</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <button
        onClick={() => {
          if (activeTab === 'leads' || activeTab === 'inbox') {
            setShowNewMessageModal(true);
          } else if (activeTab === 'tasks') {
            setShowTaskModal(true);
          } else if (activeTab === 'team') {
            setShowTeamModal(true);
          }
        }}
        className={`fixed bottom-8 right-8 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-110 ${
          (activeTab === 'leads' || activeTab === 'inbox' || activeTab === 'tasks' || activeTab === 'team')
            ? 'bg-pink-500 hover:bg-pink-600 cursor-pointer'
            : 'bg-gray-300 cursor-not-allowed'
        }`}
        disabled={activeTab !== 'leads' && activeTab !== 'inbox' && activeTab !== 'tasks' && activeTab !== 'team'}
      >
        <Plus className="h-6 w-6" />
      </button>

      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-4 text-white">
              <h2 className="text-xl font-semibold">Criar Nova Tarefa</h2>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setNewTaskTitle('');
                  setTaskChecklistInputs([{ id: '1', value: '' }]);
                }}
                className="rounded-full p-2 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Título da tarefa</label>
                <input
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                  placeholder="Ex: Reunião com cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Atribuir a</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                >
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Checklist (Enter para novo item, Backspace para remover)</label>
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-2">
                  {taskChecklistInputs.map((input, index) => (
                    <input
                      key={input.id}
                      ref={(el) => {
                        if (el) checklistInputRefs.current[index] = el;
                      }}
                      value={input.value}
                      onChange={(e) => handleChecklistChange(index, e.target.value)}
                      onKeyDown={(e) => handleChecklistKeyDown(index, e)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                      placeholder={`Item ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 px-4 py-3 text-white transition hover:bg-pink-600 disabled:bg-gray-300"
              >
                <Plus className="h-5 w-5" />
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}

      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-4 text-white">
              <h2 className="text-xl font-semibold">
                {teamModalStep === 'phone' ? 'Adicionar Novo Membro' : 'Confirmar Código'}
              </h2>
              <button
                onClick={() => {
                  setShowTeamModal(false);
                  setTeamModalStep('phone');
                  setNewTeamPhone('');
                  setNewTeamCode('');
                }}
                className="rounded-full p-2 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              {teamModalStep === 'phone' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número do WhatsApp</label>
                    <input
                      type="tel"
                      autoFocus
                      value={newTeamPhone}
                      onChange={(e) => setNewTeamPhone(e.target.value)}
                      placeholder="+55 11 98765-4321"
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                    />
                  </div>
                  <button
                    onClick={() => setTeamModalStep('code')}
                    disabled={!newTeamPhone.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 px-4 py-3 text-white transition hover:bg-pink-600 disabled:bg-gray-300"
                  >
                    <Send className="h-5 w-5" />
                    Enviar Código
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Enviamos um código de confirmação para {newTeamPhone}. Digite o código abaixo:
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Código de Confirmação</label>
                    <input
                      type="text"
                      autoFocus
                      value={newTeamCode}
                      onChange={(e) => setNewTeamCode(e.target.value)}
                      placeholder="Digite o código"
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTeamModalStep('phone')}
                      className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-gray-700 transition hover:bg-gray-50"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleAddTeamMember}
                      disabled={!newTeamCode.trim()}
                      className="flex-1 rounded-2xl bg-pink-500 px-4 py-3 text-white transition hover:bg-pink-600 disabled:bg-gray-300"
                    >
                      Confirmar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-4 text-white">
              <h2 className="text-xl font-semibold">Editar Membro</h2>
              <button
                onClick={() => {
                  setShowEditTeamModal(false);
                  setEditingTeamMemberId(null);
                  setEditingMemberData({});
                }}
                className="rounded-full p-2 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  value={editingMemberData.name || ''}
                  onChange={(e) => setEditingMemberData({ ...editingMemberData, name: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cargo</label>
                <input
                  value={editingMemberData.role || ''}
                  onChange={(e) => setEditingMemberData({ ...editingMemberData, role: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={editingMemberData.isActive || false}
                  onChange={(e) => setEditingMemberData({ ...editingMemberData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label className="text-sm font-medium text-gray-700">Membro ativo</label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEditTeamModal(false);
                    setEditingTeamMemberId(null);
                    setEditingMemberData({});
                  }}
                  className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTeamMemberEdit}
                  className="flex-1 rounded-2xl bg-pink-500 px-4 py-3 text-white transition hover:bg-pink-600"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-4 text-white">
              <h2 className="text-xl font-semibold">Nova Mensagem</h2>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="rounded-full p-2 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Número do WhatsApp</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+55 11 98765-4321"
                  className="mt-2 w-full rounded-3xl border border-gray-200 px-4 py-3 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={6}
                  placeholder="Digite sua mensagem..."
                  className="mt-2 w-full rounded-3xl border border-gray-200 px-4 py-3 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <button
                onClick={handleSendNewMessage}
                disabled={!newPhone || !newMessage || sendingMessage}
                className="flex w-full items-center justify-center gap-2 rounded-3xl bg-pink-500 px-4 py-3 text-white transition hover:bg-pink-600 disabled:bg-gray-300"
              >
                <Send className="h-5 w-5" />
                {sendingMessage ? 'Enviando...' : 'Enviar Mensagem'}
              </button>

              {sendError && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {sendError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
