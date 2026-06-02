export type IconName = "home" | "kanban" | "calendar" | "tasks" | "notes" | "chat" | "user" | "settings";

export type KanbanColumn = {
  id: string;
  label: string;
  statuses: string[];
  saveAs: string | null;
};

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "contato", label: "Contato iniciado", statuses: ["contato_iniciado"], saveAs: "contato_iniciado" },
  { id: "negociacao", label: "Em negociacao", statuses: ["em_negociacao"], saveAs: "em_negociacao" },
  { id: "proposta", label: "Proposta enviada", statuses: ["proposta_enviada"], saveAs: "proposta_enviada" },
  { id: "fechado", label: "Orcamento fechado", statuses: ["orcamento_fechado"], saveAs: "orcamento_fechado" },
];
