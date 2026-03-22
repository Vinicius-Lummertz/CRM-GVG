import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MessageSquare, Plus, LogOut, X, Send, ChevronDown } from 'lucide-react';
import { mockClients, type Client } from '../data/mockData';
import { STATUS_CONFIG, getAllStatuses, type StatusValue } from '../data/statusConfig';

export default function CRM() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [filterType, setFilterType] = useState<'nome' | 'numero'>('nome');
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesText =
        filterType === 'nome'
          ? client.name.toLowerCase().includes(filterText.toLowerCase())
          : client.phone.includes(filterText);
      
      const matchesStatus = filterStatus === 'todos' || client.status.toString() === filterStatus;
      
      return matchesText && matchesStatus;
    });
  }, [clients, filterType, filterText, filterStatus]);

  // Close dropdown when clicking outside
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
    router.push('/');
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
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

  const handleChangeStatus = (clientId: string, newStatus: StatusValue) => {
    setClients(prevClients =>
      prevClients.map(client =>
        client.id === clientId ? { ...client, status: newStatus } : client
      )
    );
    setEditingStatusId(null);
  };

  const handleSendNewMessage = () => {
    if (!newPhone || !newMessage) return;

    // Check if client already exists
    const existingClient = clients.find(c => c.phone === newPhone);
    
    if (existingClient) {
      // Add message to existing client
      const updatedClients = clients.map(c => {
        if (c.phone === newPhone) {
          return {
            ...c,
            messages: [
              ...c.messages,
              {
                id: `m${Date.now()}`,
                text: newMessage,
                timestamp: new Date(),
                fromMe: true,
              },
            ],
          };
        }
        return c;
      });
      setClients(updatedClients);
    } else {
      // Create new client
      const newClient: Client = {
        id: `${Date.now()}`,
        name: newPhone, // In real app, would be extracted from WhatsApp API
        phone: newPhone,
        photo: 'https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHBlcnNvbnxlbnwxfHx8fDE3NzI5MDgzMzh8MA&ixlib=rb-4.1.0&q=80&w=1080',
        status: 1,
        messages: [
          {
            id: `m${Date.now()}`,
            text: newMessage,
            timestamp: new Date(),
            fromMe: true,
          },
        ],
      };
      setClients([newClient, ...clients]);
    }

    setShowNewMessageModal(false);
    setNewPhone('');
    setNewMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Image src="/logogvg.png" alt="GVG CRM" width={48} height={48} className="h-12 object-cover" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'nome' | 'numero')}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none bg-white"
              >
                <option value="nome">Nome</option>
                <option value="numero">Número</option>
              </select>
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={`Buscar por ${filterType}...`}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none bg-white"
            >
              <option value="todos">Todos os Status</option>
              {getAllStatuses().map(status => (
                <option key={status.value} value={status.value.toString()}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Cliente</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Número</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left text-sm text-gray-600">Última Mensagem</th>
                  <th className="px-6 py-3 text-center text-sm text-gray-600">Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((client) => {
                  const lastMessage = client.messages[client.messages.length - 1];
                  const statusConfig = STATUS_CONFIG[client.status];
                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={client.photo}
                            alt={client.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <span>{client.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{client.phone}</td>
                      <td className="px-6 py-4 relative">
                        <button
                          onClick={() => setEditingStatusId(editingStatusId === client.id ? null : client.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs border transition-all hover:shadow-sm ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        
                        {editingStatusId === client.id && (
                          <div
                            ref={dropdownRef}
                            className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] py-1"
                          >
                            {getAllStatuses().map(status => (
                              <button
                                key={status.value}
                                onClick={() => handleChangeStatus(client.id, status.value)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                                  client.status === status.value ? 'bg-gray-50' : ''
                                }`}
                              >
                                <span className={`w-3 h-3 rounded-full ${status.color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                {status.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-gray-600 text-sm truncate max-w-xs">
                            {lastMessage.text}
                          </p>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(lastMessage.timestamp)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => router.push(`/chat/${client.id}`)}
                          className="inline-flex items-center justify-center w-10 h-10 text-pink-500 hover:bg-pink-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Nenhum cliente encontrado
            </div>
          )}
        </div>
      </div>

      {/* New Message Button */}
      <button
        onClick={() => setShowNewMessageModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-pink-400 to-pink-500 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl text-white">Nova Mensagem</h2>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Número do WhatsApp
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+55 11 98765-4321"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none resize-none"
                />
              </div>
              <button
                onClick={handleSendNewMessage}
                disabled={!newPhone || !newMessage}
                className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Enviar Mensagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
