export const STATUS_CONFIG = {
  1: {
    value: 1,
    label: 'Possível Cliente',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  2: {
    value: 2,
    label: 'Contato Realizado',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  3: {
    value: 3,
    label: 'Em Negociação',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  4: {
    value: 4,
    label: 'Proposta Enviada',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  5: {
    value: 5,
    label: 'Cliente Convertido',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  6: {
    value: 6,
    label: 'Não Convertido',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
} as const;

export type StatusValue = keyof typeof STATUS_CONFIG;

export const getAllStatuses = () => Object.values(STATUS_CONFIG);
