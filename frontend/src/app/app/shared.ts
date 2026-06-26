export type IconName = "home" | "kanban" | "calendar" | "tasks" | "notes" | "chat" | "user" | "settings";

export type DocumentType = "cpf" | "cnpj";

// Campos cadastrais do lead que sao editaveis no painel de detalhes.
export type LeadDetails = {
  name: string | null;
  email: string | null;
  document: string | null;
  document_type: DocumentType | null;
  birthday: string | null;
  zip_code: string | null;
  street: string | null;
  address_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

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
