'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

type ChatMessage = {
  id: string;
  lead_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  created_at: string;
  delivery_status?: string;
  message_type?: string;
  sent_by_customer?: number | boolean;
};

type Template = {
  id: string;
  name: string;
  body: string;
  content_sid: string;
  category?: string;
  language?: string;
};

type ConversationWindow = {
  is_open: boolean;
  expires_at: string | null;
};

function isInbound(message: ChatMessage) {
  if (message.direction) return message.direction === 'inbound';
  return message.sent_by_customer === 1 || message.sent_by_customer === true;
}

function getWindowFromMessages(messages: ChatMessage[]): ConversationWindow {
  const lastInbound = [...messages]
    .reverse()
    .find((message) => isInbound(message) && Boolean(message.created_at));

  if (!lastInbound) return { is_open: false, expires_at: null };

  const expiresAt = new Date(new Date(lastInbound.created_at).getTime() + 24 * 60 * 60 * 1000);

  return {
    is_open: expiresAt.getTime() > Date.now(),
    expires_at: expiresAt.toISOString(),
  };
}

function getTemplatePlaceholders(body: string) {
  const placeholders = new Set<string>();
  const regex = /{{\s*(\d+)\s*}}/g;
  let match;

  while ((match = regex.exec(body || '')) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders).sort((a, b) => Number(a) - Number(b));
}

function buildTemplateVariables(template: Template, current: Record<string, string> = {}) {
  return getTemplatePlaceholders(template.body).reduce<Record<string, string>>(
    (acc, key) => {
      acc[key] = current[key] || '';
      return acc;
    },
    {}
  );
}

function isAwaitingTemplateReply(messages: ChatMessage[], windowInfo: ConversationWindow) {
  if (windowInfo.is_open || messages.length === 0) return false;

  const lastMessage = messages[messages.length - 1];
  return lastMessage.direction === 'outbound' && lastMessage.message_type === 'template';
}

function formatWindow(windowInfo: ConversationWindow, messages: ChatMessage[]) {
  if (isAwaitingTemplateReply(messages, windowInfo)) return 'Aguardando resposta';
  if (!windowInfo.is_open || !windowInfo.expires_at) return 'Janela 24h fechada';

  const remainingMs = new Date(windowInfo.expires_at).getTime() - Date.now();
  const remainingHours = Math.max(0, Math.floor(remainingMs / 3600000));

  if (remainingHours <= 0) return 'Janela aberta';
  return `Janela aberta: ${remainingHours}h restantes`;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();

  const clientId = params?.clientId?.toString() ?? '';
  const leadName = searchParams.get('name') ?? 'Contato';
  const leadPhone = searchParams.get('phone') ?? '';
  const leadWaId = searchParams.get('wa_id') ?? '';
  const initialWindowOpen = searchParams.get('window_open') === '1';
  const initialWindowExpiresAt = searchParams.get('window_expires_at') || null;

  const [authPhone] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('auth_phone') : null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [text, setText] = useState('');
  const [sendingText, setSendingText] = useState(false);
  const [conversationWindow, setConversationWindow] = useState<ConversationWindow>({
    is_open: initialWindowOpen,
    expires_at: initialWindowExpiresAt,
  });

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [templateError, setTemplateError] = useState('');
  const [sendingTemplate, setSendingTemplate] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  const normalizedPhone = useMemo(() => {
    if (leadPhone.trim()) return leadPhone.trim();
    if (leadWaId.trim()) return leadWaId.trim();
    return '';
  }, [leadPhone, leadWaId]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  );

  const selectedPlaceholders = useMemo(
    () => getTemplatePlaceholders(selectedTemplate?.body || ''),
    [selectedTemplate]
  );

  const selectTemplate = useCallback((template: Template) => {
    setSelectedTemplateId(template.id);
    setTemplateVariables((current) => buildTemplateVariables(template, current));
    setTemplateError('');
  }, []);

  const fetchMessages = useCallback(async (options?: { before?: string; append?: boolean }) => {
    if (!clientId) return;

    if (options?.append) {
      setLoadingOlder(true);
    } else {
      setLoadingMessages(true);
    }

    try {
      const query = new URLSearchParams({ limit: '50' });
      if (options?.before) query.set('before', options.before);

      const response = await fetch(`/api/v2/chat/${clientId}/messages?${query.toString()}`, {
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setMessageError(payload.error || 'Nao foi possivel carregar as mensagens.');
        return;
      }

      const fetchedMessages = (payload.messages || []) as ChatMessage[];

      setMessageError('');
      setHasMoreMessages(Boolean(payload.hasMore));
      setNextBefore(payload.nextBefore || null);
      setMessages((current) => (
        options?.append ? [...fetchedMessages, ...current] : fetchedMessages
      ));

      if (!options?.append) {
        setConversationWindow(getWindowFromMessages(fetchedMessages));

        void fetch(`/api/v2/chat/${clientId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }
    } catch {
      setMessageError('Falha de conexao ao carregar mensagens.');
    } finally {
      setLoadingMessages(false);
      setLoadingOlder(false);
    }
  }, [clientId]);

  const fetchTemplates = useCallback(async () => {
    if (templates.length > 0) return;

    setLoadingTemplates(true);
    setTemplateError('');

    try {
      const response = await fetch('/api/v2/templates', {
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setTemplateError(payload.error || 'Nao foi possivel carregar templates.');
        return;
      }

      const fetchedTemplates = (payload.templates || []) as Template[];
      setTemplates(fetchedTemplates);
      if (!selectedTemplateId && fetchedTemplates[0]) {
        selectTemplate(fetchedTemplates[0]);
      }
    } catch {
      setTemplateError('Falha de conexao ao carregar templates.');
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectTemplate, selectedTemplateId, templates.length]);

  useEffect(() => {
    if (!authPhone) {
      router.push('/');
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchMessages();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authPhone, fetchMessages, router]);

  useEffect(() => {
    if (!authPhone) return;
    const interval = window.setInterval(() => {
      void fetchMessages();
    }, 6000);
    return () => window.clearInterval(interval);
  }, [authPhone, fetchMessages]);

  useEffect(() => {
    if (!listRef.current || loadingOlder) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [loadingOlder, messages]);

  async function handleSendText(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || sendingText) return;

    if (!conversationWindow.is_open) {
      setMessageError('Janela de 24h fechada. Envie um template aprovado para iniciar a conversa.');
      setShowTemplatesModal(true);
      void fetchTemplates();
      return;
    }

    setSendingText(true);
    setMessageError('');

    try {
      const response = await fetch('/api/v2/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          text: text.trim(),
          lead_id: clientId,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        if (payload.error === 'WINDOW_CLOSED') {
          setConversationWindow(payload.conversation_window || { is_open: false, expires_at: null });
          setShowTemplatesModal(true);
          void fetchTemplates();
        }

        setMessageError(payload.message || payload.error || 'Nao foi possivel enviar a mensagem.');
        return;
      }

      setText('');
      setConversationWindow(payload.conversation_window || conversationWindow);
      await fetchMessages();
    } catch {
      setMessageError('Falha de conexao no envio da mensagem.');
    } finally {
      setSendingText(false);
    }
  }

  async function handleSendTemplate() {
    if (!selectedTemplate || sendingTemplate) return;

    const missing = selectedPlaceholders.filter((key) => !templateVariables[key]?.trim());
    if (missing.length > 0) {
      setTemplateError(`Preencha as variaveis: ${missing.join(', ')}.`);
      return;
    }

    setSendingTemplate(true);
    setTemplateError('');

    try {
      const response = await fetch('/api/v2/chat/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          lead_id: clientId,
          template_id: selectedTemplate.id,
          variables: templateVariables,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setTemplateError(payload.message || payload.error || 'Nao foi possivel enviar o template.');
        return;
      }

      setShowTemplatesModal(false);
      setConversationWindow(payload.conversation_window || conversationWindow);
      await fetchMessages();
    } catch {
      setTemplateError('Falha de conexao no envio do template.');
    } finally {
      setSendingTemplate(false);
    }
  }

  if (!authPhone) return null;

  return (
    <div className="container w-full py-8 animate-fade-in">
      <div className="card p-0 chat-shell">
        <div className="chat-header">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" className="btn-ghost" onClick={() => router.push('/leads')}>
              Voltar
            </button>
            <div className="min-w-0">
              <h2 className="text-lg text-primary" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                {leadName || 'Contato'}
              </h2>
              <p className="text-sm text-secondary" style={{ margin: 0 }}>
                {normalizedPhone || 'Telefone indisponivel'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 chat-actions">
            <span className={`badge ${conversationWindow.is_open ? '' : 'border-danger'}`}>
              {formatWindow(conversationWindow, messages)}
            </span>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setShowTemplatesModal(true);
                void fetchTemplates();
              }}
              disabled={sendingTemplate}
            >
              Templates
            </button>
          </div>
        </div>

        {messageError ? (
          <div className="bg-danger-light text-danger p-3 text-sm">{messageError}</div>
        ) : null}

        <div ref={listRef} className="chat-messages">
          {loadingMessages ? (
            <div className="flex justify-center py-12">
              <div className="spinner spinner-lg"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-secondary py-12">
              Ainda nao ha mensagens nessa conversa.
              <br />
              Use um template para iniciar o contato.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {hasMoreMessages ? (
                <button
                  type="button"
                  className="btn-outline mx-auto"
                  onClick={() => nextBefore && void fetchMessages({ before: nextBefore, append: true })}
                  disabled={loadingOlder || !nextBefore}
                >
                  {loadingOlder ? 'Carregando...' : 'Carregar anteriores'}
                </button>
              ) : null}

              {messages.map((message) => {
                const incoming = isInbound(message);
                return (
                  <div
                    key={message.id}
                    className="flex"
                    style={{ justifyContent: incoming ? 'flex-start' : 'flex-end' }}
                  >
                    <div className={`chat-bubble ${incoming ? 'chat-bubble-in' : 'chat-bubble-out'}`}>
                      <p className="text-sm text-primary" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {message.body || '(sem texto)'}
                      </p>
                      <div className="text-xs text-secondary mt-2 text-right">
                        {new Date(message.created_at).toLocaleString('pt-BR')}
                        {message.delivery_status ? ` · ${message.delivery_status}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleSendText} className="chat-composer">
          <div className="flex gap-3 items-center">
            <input
              className="input-field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                conversationWindow.is_open
                  ? 'Digite sua mensagem...'
                  : 'Janela fechada: use Templates'
              }
              disabled={sendingText}
            />
            <button type="submit" className="btn-primary" disabled={sendingText || !text.trim()}>
              {sendingText ? <div className="spinner"></div> : 'Enviar'}
            </button>
          </div>
        </form>
      </div>

      {showTemplatesModal ? (
        <div className="modal-overlay">
          <div className="card p-6 w-full max-w-5xl template-modal">
            <div className="flex justify-between items-center mb-4 gap-3">
              <h3 className="text-xl text-primary m-0">Templates</h3>
              <button type="button" className="btn-ghost" onClick={() => setShowTemplatesModal(false)}>
                Fechar
              </button>
            </div>

            {templateError ? (
              <div className="bg-danger-light text-danger p-3 rounded-lg mb-4 text-sm">{templateError}</div>
            ) : null}

            {loadingTemplates ? (
              <div className="flex justify-center py-8">
                <div className="spinner spinner-lg"></div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-secondary text-center py-8">
                Nenhum template ativo encontrado.
              </div>
            ) : (
              <div className="template-grid">
                <div className="template-list">
                  {templates.map((template) => {
                    const active = template.id === selectedTemplateId;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        className="template-option"
                        onClick={() => selectTemplate(template)}
                        style={{
                          borderColor: active ? 'var(--accent-primary)' : 'var(--panel-border)',
                          boxShadow: active ? '0 0 0 2px var(--accent-light)' : undefined,
                        }}
                      >
                        <span className="text-sm font-semibold text-primary">{template.name}</span>
                        <span className="text-xs text-secondary">{template.category || 'template'} · {template.language || 'pt_BR'}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="template-preview">
                  {selectedTemplate ? (
                    <>
                      <div className="text-sm font-semibold text-primary mb-2">{selectedTemplate.name}</div>
                      <div className="template-body">{selectedTemplate.body || 'Template sem corpo cadastrado.'}</div>
                      <div className="text-xs text-secondary mt-3">Content SID: {selectedTemplate.content_sid || '-'}</div>

                      {selectedPlaceholders.length > 0 ? (
                        <div className="flex flex-col gap-3 mt-4">
                          {selectedPlaceholders.map((key) => (
                            <label key={key} className="text-sm text-secondary">
                              Variavel {key}
                              <input
                                className="input-field mt-2"
                                value={templateVariables[key] || ''}
                                onChange={(event) => {
                                  setTemplateVariables((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }));
                                }}
                                placeholder={`Valor para {{${key}}}`}
                              />
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-secondary mt-4">Este template nao possui variaveis.</p>
                      )}
                    </>
                  ) : (
                    <div className="text-secondary">Selecione um template.</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" className="btn-ghost" onClick={() => setShowTemplatesModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSendTemplate}
                disabled={!selectedTemplate || sendingTemplate}
              >
                {sendingTemplate ? <div className="spinner"></div> : 'Enviar template'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
