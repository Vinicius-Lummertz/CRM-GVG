import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreVertical } from 'lucide-react';
import * as api from '../../services/api';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  fromMe: boolean;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  last_message?: string;
}

interface ChatPageProps {
  params: {
    clientId: string;
  };
}

export default function Chat({ params }: ChatPageProps) {
  const { clientId } = React.use(params);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar lead e mensagens ao inicializar
  useEffect(() => {
    const loadChatData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Buscar lead pelo ID: backend atual pesquisa nome/número, então usa lista completa
        const leadsResponse = await api.getLeads('', 'auto', token);
        const foundLead = leadsResponse.leads?.find((l: any) => l.id === clientId);
        
        if (foundLead) {
          setLead({
            id: foundLead.id,
            name: foundLead.name || 'Sem nome',
            phone: foundLead.phone || '',
            photo: 'https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHBlcnNvbnxlbnwxfHx8fDE3NzI5MDgzMzh8MA&ixlib=rb-4.1.0&q=80&w=1080',
          });
          
          // Tentar carregar mensagens se o endpoint existir
          try {
            const messagesResponse = await api.getMessagesByLeadId(clientId, token);
            if (messagesResponse.messages) {
              const formattedMessages = messagesResponse.messages.map((msg: any) => ({
                id: msg.id,
                text: msg.body || msg.text,
                timestamp: msg.created_at || new Date().toISOString(),
                fromMe: msg.direction === 'outbound' || msg.sent_by_customer === 0,
              }));
              setMessages(formattedMessages);
            }
          } catch (error) {
            console.log('Endpoint de mensagens ainda não implementado, exibindo sem histórico');
            setMessages([]);
          }
        } else {
          router.push('/crm');
        }
      } catch (error) {
        console.error('Erro ao carregar chat:', error);
        router.push('/crm');
      } finally {
        setLoading(false);
      }
    };

    loadChatData();
  }, [clientId, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !lead) return;

    setSendingMessage(true);

    try {
      const token = localStorage.getItem('token');

      const message: Message = {
        id: `m${Date.now()}`,
        text: newMessage,
        timestamp: new Date().toISOString(),
        fromMe: true,
      };

      // Adicionar mensagem localmente de forma otimista
      setMessages([...messages, message]);

      // Tentar enviar para API
      await api.sendChatMessage(lead.id, newMessage, token);

      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Remover a mensagem local se o envio falhar
      setMessages(messages => messages.slice(0, -1));
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMessageDate = (dateString: string) => {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return messageDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach((message) => {
      const date = formatMessageDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando conversa...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Cliente não encontrado</div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => router.push('/crm')}
          className="hover:bg-gray-100 rounded-lg p-2 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <img
          src={lead.photo}
          alt={lead.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <h2 className="text-gray-900">{lead.name}</h2>
          <p className="text-sm text-gray-500">{lead.phone}</p>
        </div>
        <button className="hover:bg-gray-100 rounded-lg p-2 transition-colors">
          <MoreVertical className="w-6 h-6 text-gray-700" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex justify-center mb-4">
              <span className="bg-white text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm border border-gray-100">
                {date}
              </span>
            </div>
            {msgs.map((message) => (
              <div
                key={message.id}
                className={`flex mb-2 ${message.fromMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm ${
                    message.fromMe
                      ? 'bg-pink-500 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                  }`}
                >
                  <p className="break-words">{message.text}</p>
                  <span
                    className={`text-xs mt-1 block text-right ${
                      message.fromMe ? 'text-pink-100' : 'text-gray-500'
                    }`}
                  >
                    {formatMessageTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-full focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sendingMessage}
            className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}