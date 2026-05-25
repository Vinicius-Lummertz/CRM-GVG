export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const SANDBOX_API_KEY = process.env.NEXT_PUBLIC_SANDBOX_API_KEY ?? '';

export type ApiMode = 'real' | 'sandbox';

// Feature flag to toggle between backend APIs and mocked data
import { USE_MOCKS } from '../config/appConfig';
import { mockClients, MOCK_VERIFICATION_CODE } from '../app/data/mockData';

// FunÃ§Ã£o auxiliar para adicionar token em headers
const getAuthHeaders = (token: string | null) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (typeof window !== 'undefined') {
    const selectedCompanyId = localStorage.getItem('selected_company_id');
    if (selectedCompanyId) {
      headers['x-company-id'] = selectedCompanyId;
    }
  }

  return headers;
};

const getSandboxHeaders = () => ({
  'Content-Type': 'application/json',
  'x-sandbox-key': SANDBOX_API_KEY,
});

/**
 * Envia uma mensagem de chat via API
 * POST /api/v2/chat/send
 */
export async function sendChatMessage(
  leadId: string,
  message: string,
  token: string | null = null
) {
  // If mocks are enabled, simulate success without hitting backend
  if (USE_MOCKS) {
    try {
      const lead = mockClients.find((c: any) => c.id === leadId);
      if (lead) {
        // append message to mock (in-memory only)
        if (!('messages' in lead)) (lead as any).messages = [];
        (lead as any).messages.push({
          id: `m-mock-${Date.now()}`,
          text: message,
          timestamp: new Date().toISOString(),
          fromMe: true,
        });
      }
      return { success: true };
    } catch (err) {
      console.error('Mock sendChatMessage error', err);
      throw err;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v2/chat/send`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        lead_id: leadId,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao enviar mensagem');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro em sendChatMessage:', error);
    throw error;
  }
}

export async function sendOtp(phone: string, mode: ApiMode = 'real') {
  if (USE_MOCKS) {
    // Return sandbox code for UI display
    return { success: true, sandboxOtpCode: MOCK_VERIFICATION_CODE };
  }

  const isSandbox = mode === 'sandbox';
  const response = await fetch(`${API_BASE_URL}${isSandbox ? '/api/sandbox/otp/send' : '/api/v2/otp/send'}`, {
    method: 'POST',
    headers: isSandbox ? getSandboxHeaders() : getAuthHeaders(null),
    body: JSON.stringify({ phone }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
      console.error(data.error || 'Falha ao enviar codigo');
      return { success: false, error: data.error || 'Falha ao enviar codigo' };
  }

  return data;
}

export async function verifyOtp(phone: string, code: string, mode: ApiMode = 'real') {
  if (USE_MOCKS) {
    if (code === MOCK_VERIFICATION_CODE) {
      return { token: 'mock-token', refreshToken: 'mock-refresh-token', operator: { id: 'u1', name: 'Mock User' } };
    }
    const error = new Error('Codigo invalido');
    throw error;
  }

  const isSandbox = mode === 'sandbox';
  const response = await fetch(`${API_BASE_URL}${isSandbox ? '/api/sandbox/otp/verify' : '/api/v2/otp/verify'}`, {
    method: 'POST',
    headers: isSandbox ? getSandboxHeaders() : getAuthHeaders(null),
    body: JSON.stringify({ phone, code }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Codigo invalido');
    (error as Error & { attemptsLeft?: number }).attemptsLeft = data.attempts_left;
    throw error;
  }

  return data;
}

/**
 * Busca templates disponÃ­veis
 * GET /api/v2/templates
 */
export async function getAvailableTemplates(token: string | null = null) {
  try {
    if (USE_MOCKS) {
      return { success: true, templates: [] };
    }

    const response = await fetch(`${API_BASE_URL}/api/v2/templates`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao buscar templates');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro em getAvailableTemplates:', error);
    throw error;
  }
}

/**
 * Busca lista de leads/clientes
 * GET /api/v2/leads?search=termo&by=auto|name|number
 */
export async function getLeads(
  search: string = '',
  by: 'auto' | 'name' | 'number' = 'auto',
  token: string | null = null
) {
  try {
    if (USE_MOCKS) {
      // Basic filtering simulation
      let leads = mockClients.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        photo: c.photo,
        status: c.status,
        last_message_preview: c.messages?.[c.messages.length - 1]?.text || c.last_message || '',
        last_message_at: c.messages?.[c.messages.length - 1]?.timestamp || c.last_message_at || new Date().toISOString(),
      }));

      if (search) {
        const q = search.toLowerCase();
        leads = leads.filter((l: any) => l.name.toLowerCase().includes(q) || l.phone.includes(q));
      }

      return { success: true, leads };
    }

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (by) params.append('by', by);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/api/v2/leads${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao buscar leads');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro em getLeads:', error);
    throw error;
  }
}

/**
 * Cria um novo lead/cliente
 * POST /api/v2/leads
 */
export async function createLead(
  name: string,
  phone: string,
  token: string | null = null
) {
  if (USE_MOCKS) {
    // Simulate creation
    const newLead = {
      success: true,
      leadId: `mock-${Date.now()}`,
      lead: { id: `mock-${Date.now()}`, name, phone, status: 'lead' },
    } as any;
    // push to mockClients (in-memory)
    try {
      (mockClients as any).unshift(newLead.lead);
    } catch (e) {
      // ignore
    }
    return newLead;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v2/leads`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        name,
        phone,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao criar lead');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro em createLead:', error);
    throw error;
  }
}

/**
 * Busca mensagens de um lead
 * GET /api/v2/chat/{leadId}/messages
 */
export async function getMessagesByLeadId(
  leadId: string,
  token: string | null = null
) {
  try {
    if (USE_MOCKS) {
      const lead = mockClients.find((c: any) => c.id === leadId);
      if (!lead) return { success: false, messages: [] };
      const messages = (lead.messages || []).map((m: any) => ({
        id: m.id,
        body: m.text,
        created_at: m.timestamp,
        direction: m.fromMe ? 'outbound' : 'inbound',
      }));
      return { success: true, messages };
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v2/chat/${encodeURIComponent(leadId)}/messages`,
      {
        method: 'GET',
        headers: getAuthHeaders(token),
      }
    );

    if (!response.ok) {
      // Se o endpoint nÃ£o estiver implementado ou nÃ£o retornar mensagens,
      // tratamos como lista vazia para nÃ£o quebrar a tela de chat.
      return { success: false, messages: [] };
    }

    return await response.json();
  } catch (error) {
    console.error('Erro em getMessagesByLeadId:', error);
    return { success: false, messages: [] };
  }
}

/**
 * Atualiza status de um lead
 * PUT /api/v2/leads/{id}/status
 */
export async function updateLeadStatus(
  leadId: string,
  status: string,
  token: string | null = null
) {
  if (USE_MOCKS) {
    try {
      const lead = (mockClients as any).find((c: any) => c.id === leadId);
      if (lead) {
        lead.status = status;
        return { success: true };
      }
      return { success: false, error: 'Lead not found in mock' };
    } catch (e) {
      console.error('Mock updateLeadStatus error', e);
      throw e;
    }
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v2/leads/${encodeURIComponent(leadId)}/status`,
      {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao atualizar status');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro em updateLeadStatus:', error);
    throw error;
  }
}
