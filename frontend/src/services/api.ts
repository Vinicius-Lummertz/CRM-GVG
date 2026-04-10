const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://crm-gvg-production.up.railway.app';

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
 * FUTURO: quando GET /api/v2/leads existir
 * Busca lista de leads/clientes
 */
export async function getLeads(token: string | null = null) {
  // Placeholder para quando endpoint existir
  throw new Error('Endpoint GET /api/v2/leads não implementado no backend ainda');
}

/**
 * FUTURO: quando GET /api/v2/messages existir
 * Busca mensagens de um lead
 */
export async function getMessagesByLeadId(
  leadId: string,
  token: string | null = null
) {
  // Placeholder para quando endpoint existir
  throw new Error(
    'Endpoint GET /api/v2/messages não implementado no backend ainda'
  );
}

/**
 * FUTURO: quando PUT /api/v2/leads/{id}/status existir
 * Atualiza status de um lead
 */
export async function updateLeadStatus(
  leadId: string,
  status: number,
  token: string | null = null
) {
  // Placeholder para quando endpoint existir
  throw new Error(
    'Endpoint PUT /api/v2/leads/{id}/status não implementado no backend ainda'
  );
}
