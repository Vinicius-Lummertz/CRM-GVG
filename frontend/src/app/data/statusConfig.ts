export const STATUS_CONFIG = {
  lead: {
    value: 'lead',
    label: 'Possivel Cliente',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  contacted: {
    value: 'contacted',
    label: 'Contato Realizado',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  negotiating: {
    value: 'negotiating',
    label: 'Em Negociacao',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  proposal_sent: {
    value: 'proposal_sent',
    label: 'Proposta Enviada',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  converted: {
    value: 'converted',
    label: 'Cliente Convertido',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  not_converted: {
    value: 'not_converted',
    label: 'Nao Convertido',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
} as const;

export type StatusValue = keyof typeof STATUS_CONFIG;

export const getAllStatuses = () => Object.values(STATUS_CONFIG);
