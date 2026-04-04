import type { StatusValue } from './statusConfig';

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  fromMe: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  photo: string;
  status: StatusValue;
  messages: Message[];
}

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Maria Silva',
    phone: '+55 11 98765-4321',
    photo: 'https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHBlcnNvbnxlbnwxfHx8fDE3NzI5MDgzMzh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    status: 1,
    messages: [
      {
        id: 'm1',
        text: 'Olá, gostaria de saber mais sobre os seus serviços',
        timestamp: new Date('2026-03-08T10:30:00'),
        fromMe: false,
      },
      {
        id: 'm2',
        text: 'Olá Maria! Claro, ficarei feliz em ajudar.',
        timestamp: new Date('2026-03-08T10:35:00'),
        fromMe: true,
      },
    ],
  },
  {
    id: '2',
    name: 'João Santos',
    phone: '+55 11 99876-5432',
    photo: 'https://images.unsplash.com/photo-1656313826909-1f89d1702a81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjBwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzI5NDE4NjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    status: 3,
    messages: [
      {
        id: 'm3',
        text: 'Bom dia! Quando podemos agendar uma reunião?',
        timestamp: new Date('2026-03-07T14:20:00'),
        fromMe: false,
      },
      {
        id: 'm4',
        text: 'Bom dia João! Que tal amanhã às 15h?',
        timestamp: new Date('2026-03-07T14:25:00'),
        fromMe: true,
      },
      {
        id: 'm5',
        text: 'Perfeito! Confirmo presença.',
        timestamp: new Date('2026-03-07T14:30:00'),
        fromMe: false,
      },
    ],
  },
  {
    id: '3',
    name: 'Ana Costa',
    phone: '+55 11 97654-3210',
    photo: 'https://images.unsplash.com/photo-1758599543154-76ec1c4257df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGV4ZWN1dGl2ZSUyMGhlYWRzaG90fGVufDF8fHx8MTc3MjkwNjQ3Nnww&ixlib=rb-4.1.0&q=80&w=1080',
    status: 5,
    messages: [
      {
        id: 'm6',
        text: 'Obrigada pelo atendimento!',
        timestamp: new Date('2026-03-06T16:00:00'),
        fromMe: false,
      },
      {
        id: 'm7',
        text: 'Por nada! Estamos sempre à disposição.',
        timestamp: new Date('2026-03-06T16:05:00'),
        fromMe: true,
      },
    ],
  },
  {
    id: '4',
    name: 'Carlos Oliveira',
    phone: '+55 11 96543-2109',
    photo: 'https://images.unsplash.com/photo-1762341118920-0b65e8d88aa2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMG9mZmljZXxlbnwxfHx8fDE3NzI4ODA4Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    status: 2,
    messages: [
      {
        id: 'm8',
        text: 'Oi, vi seu anúncio e me interessei',
        timestamp: new Date('2026-03-08T09:15:00'),
        fromMe: false,
      },
    ],
  },
  {
    id: '5',
    name: 'Paula Ferreira',
    phone: '+55 11 95432-1098',
    photo: 'https://images.unsplash.com/photo-1524538198441-241ff79d153b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMG1hbnxlbnwxfHx8fDE3NzI5MDk4MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    status: 4,
    messages: [
      {
        id: 'm9',
        text: 'Preciso de uma proposta personalizada',
        timestamp: new Date('2026-03-05T11:00:00'),
        fromMe: false,
      },
      {
        id: 'm10',
        text: 'Claro! Vou preparar e envio ainda hoje.',
        timestamp: new Date('2026-03-05T11:10:00'),
        fromMe: true,
      },
      {
        id: 'm11',
        text: 'Aguardo ansiosamente!',
        timestamp: new Date('2026-03-05T11:15:00'),
        fromMe: false,
      },
    ],
  },
];

export const MOCK_VERIFICATION_CODE = '111111';