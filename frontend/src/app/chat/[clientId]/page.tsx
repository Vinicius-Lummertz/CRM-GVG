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
};

function isInbound(message: ChatMessage) {
  if (message.direction) return message.direction === 'inbound';
  return message.sent_by_customer === 1 || message.sent_by_customer === true;
}

function hasOpenWindow(messages: ChatMessage[]) {
  const lastInbound = [...messages]
    .reverse()
    .find((message) => isInbound(message) && Boolean(message.created_at));

  if (!lastInbound) return false;

  const diffMs = Date.now() - new Date(lastInbound.created_at).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours < 24;
}

export default function ChatPage() {
  const API_BASE = 'https://crm-gvg.onrender.com';
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();

  const clientId = params?.clientId?.toString() ?? '';
  const leadName = searchParams.get('name') ?? 'Contato';
  const leadPhone = searchParams.get('phone') ?? '';
  const leadWaId = searchParams.get('wa_id') ?? '';

  const [authPhone] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('auth_phone') : null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messageError, setMessageError] = useState('');
  const [text, setText] = useState('');
  const [sendingText, setSendingText] = useState(false);

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [sendingTemplate, setSendingTemplate] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  const windowOpen = useMemo(() => hasOpenWindow(messages), [messages]);
  const normalizedPhone = useMemo(() => {
    if (leadPhone.trim()) return leadPhone.trim();
    if (leadWaId.trim()) return leadWaId.trim();
    return '';
  }, [leadPhone, leadWaId]);

  const fetchMessages = useCallback(async () => {
    if (!clientId) return;

    try {
      const query = new URLSearchParams({
        lead_id: clientId,
        phone: normalizedPhone,
      });

      const response = await fetch(`${API_BASE}/api/v2/chat/messages?${query.toString()}`, {
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setMessageError(payload.error || 'Nao foi possivel carregar as mensagens.');
        return;
      }

      setMessageError('');
      setMessages((payload.messages || []) as ChatMessage[]);
    } catch {
      setMessageError('Falha de conexao ao carregar mensagens.');
    } finally {
      setLoadingMessages(false);
    }
  }, [API_BASE, clientId, normalizedPhone]);

  const fetchTemplates = useCallback(async () => {
    if (templates.length > 0) return;

    setLoadingTemplates(true);
    setTemplateError('');

    try {
      const response = await fetch(`${API_BASE}/api/v2/templates`, {
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
        setSelectedTemplateId(fetchedTemplates[0].id);
      }
    } catch {
      setTemplateError('Falha de conexao ao carregar templates.');
    } finally {
      setLoadingTemplates(false);
    }
  }, [API_BASE, selectedTemplateId, templates.length]);

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
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  );

  async function handleSendText(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || sendingText) return;

    if (!windowOpen) {
      setMessageError(
        'Janela de 24h fechada. Envie um template aprovado para iniciar a conversa.'
      );
      setShowTemplatesModal(true);
      void fetchTemplates();
      return;
    }

    if (!normalizedPhone) {
      setMessageError('Telefone do lead nao encontrado para envio.');
      return;
    }

    setSendingText(true);
    setMessageError('');

    try {
      const response = await fetch(`${API_BASE}/api/v2/chat/send`, {
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
        setMessageError(payload.error || 'Nao foi possivel enviar a mensagem.');
        return;
      }

      setText('');
      await fetchMessages();
    } catch {
      setMessageError('Falha de conexao no envio da mensagem.');
    } finally {
      setSendingText(false);
    }
  }

  async function handleSendTemplate() {
    if (!selectedTemplate || !normalizedPhone || sendingTemplate) return;

    setSendingTemplate(true);
    setTemplateError('');

    try {
      const response = await fetch(`${API_BASE}/api/v2/templates/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          lead_id: clientId,
          template_id: selectedTemplate.id,
          content_sid: selectedTemplate.content_sid,
          contentVariables: {},
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setTemplateError(payload.error || 'Nao foi possivel enviar o template.');
        return;
      }

      setShowTemplatesModal(false);
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
      <div className="card p-0" style={{ overflow: 'hidden' }}>
        <div
          className="flex justify-between items-center p-4"
          style={{ borderBottom: '1px solid var(--panel-border)' }}
        >
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

          <div className="flex items-center gap-2">
            <span className={`badge ${windowOpen ? '' : 'border-danger'}`}>
              {windowOpen ? 'Janela 24h aberta' : 'Janela 24h fechada'}
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
              Usar template
            </button>
          </div>
        </div>

        {messageError ? (
          <div className="bg-danger-light text-danger p-3 text-sm">{messageError}</div>
        ) : null}

        <div
          ref={listRef}
          className="p-4"
          style={{
            height: '58vh',
            overflowY: 'auto',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(250,249,246,0.75) 100%)',
          }}
        >
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
              {messages.map((message) => {
                const incoming = isInbound(message);
                return (
                  <div
                    key={message.id}
                    className="flex"
                    style={{ justifyContent: incoming ? 'flex-start' : 'flex-end' }}
                  >
                    <div
                      className="rounded-xl p-3 shadow-sm"
                      style={{
                        maxWidth: '78%',
                        backgroundColor: incoming ? '#FFFFFF' : 'rgba(16, 185, 129, 0.16)',
                        border: incoming
                          ? '1px solid var(--panel-border)'
                          : '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <p className="text-sm text-primary" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {message.body || '(sem texto)'}
                      </p>
                      <div className="text-xs text-secondary mt-2 text-right">
                        {new Date(message.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSendText}
          className="p-4"
          style={{ borderTop: '1px solid var(--panel-border)', backgroundColor: 'rgba(255,255,255,0.55)' }}
        >
          <div className="flex gap-3 items-center">
            <input
              className="input-field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                windowOpen
                  ? 'Digite sua mensagem...'
                  : 'Janela fechada: use o botao "Usar template"'
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
        <div
          className="fixed-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div className="card p-6 w-full max-w-5xl" style={{ maxHeight: '85vh', overflow: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl text-primary m-0">Templates de inicializacao</h3>
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
              <div className="grid grid-cols-fill gap-4">
                {templates.map((template) => {
                  const active = template.id === selectedTemplateId;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      className="card p-4 text-left"
                      onClick={() => setSelectedTemplateId(template.id)}
                      style={{
                        borderColor: active ? 'var(--accent-primary)' : 'var(--panel-border)',
                        boxShadow: active ? '0 0 0 2px var(--accent-light)' : undefined,
                      }}
                    >
                      <div className="text-sm font-semibold text-primary mb-2">{template.name}</div>
                      <div className="text-sm text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                        {template.body || 'Template sem corpo cadastrado.'}
                      </div>
                      <div className="text-xs text-secondary mt-3">Content SID: {template.content_sid || '-'}</div>
                    </button>
                  );
                })}
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

            {selectedTemplate ? (
              <p className="text-xs text-secondary mt-3">
                Selecionado: <strong>{selectedTemplate.name}</strong>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
