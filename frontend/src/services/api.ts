export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://crm-gvg.onrender.com';
const SANDBOX_API_KEY = process.env.NEXT_PUBLIC_SANDBOX_API_KEY ?? '';

export type ApiMode = 'real' | 'sandbox';

// Função auxiliar para adicionar token em headers
const getAuthHeaders = (token: string | null) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
  const isSandbox = mode === 'sandbox';
  const response = await fetch(`${API_BASE_URL}${isSandbox ? '/api/sandbox/otp/send' : '/api/v2/otp/send'}`, {
    method: 'POST',
    headers: isSandbox ? getSandboxHeaders() : getAuthHeaders(null),
    body: JSON.stringify({ phone }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao enviar codigo');
  }

  return data;
}

export async function verifyOtp(phone: string, code: string, mode: ApiMode = 'real') {
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
 * Busca templates disponíveis
 * GET /api/v2/templates
 */
export async function getAvailableTemplates(token: string | null = null) {
  try {
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
    const response = await fetch(
      `${API_BASE_URL}/api/v2/chat/${encodeURIComponent(leadId)}/messages`,
      {
        method: 'GET',
        headers: getAuthHeaders(token),
      }
    );

    if (!response.ok) {
      // Se o endpoint não estiver implementado ou não retornar mensagens,
      // tratamos como lista vazia para não quebrar a tela de chat.
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
