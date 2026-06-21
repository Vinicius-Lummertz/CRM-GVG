import { useEffect, useRef, useState } from "react";

type ChatModuleProps = {
  isChatConnected: boolean;
  chatConnectionError: string | null;
  companyId: string | null;
  selectedChatLeadId: string | null;
  loadMessagesForLead: (leadId: string) => void | Promise<void>;
  refreshLeads: () => void | Promise<void>;
  createChatConversation: (name: string, phone: string) => Promise<boolean>;
  chatLeadSearch: string;
  setChatLeadSearch: (value: string) => void;
  filteredChatLeads: Array<any>;
  setSelectedChatLeadId: (value: string) => void;
  selectedChatLead: any | null;
  selectedLeadWindowOpen: boolean;
  loadingChatMessages: boolean;
  chatMessages: Array<any>;
  chatMessagesError: string | null;
  chatTemplates: Array<any>;
  loadingTemplates: boolean;
  syncingTemplates: boolean;
  syncTemplates: () => void | Promise<void>;
  selectedTemplateId: string | null;
  setSelectedTemplateId: (value: string | null) => void;
  templateVars: Record<string, string>;
  setTemplateVars: (value: Record<string, string>) => void;
  sendSelectedTemplate: () => void | Promise<void>;
  sendingChat: boolean;
  chatText: string;
  setChatText: (value: string) => void;
  sendChatMessage: () => void | Promise<void>;
  sendChatMedia: (file: File, caption?: string) => Promise<boolean>;
  loadingChatConnection: boolean;
  chatConnection: any | null;
  chatPhone: string;
  setChatPhone: (value: string) => void;
  chatDisplayName: string;
  setChatDisplayName: (value: string) => void;
  chatMetaBusinessId: string;
  setChatMetaBusinessId: (value: string) => void;
  chatMetaPhoneId: string;
  setChatMetaPhoneId: (value: string) => void;
  saveChatConnection: () => void | Promise<void>;
  markChatConnected: () => void | Promise<void>;
  savingChatConnection: boolean;
};

export function ChatModule({
  isChatConnected,
  chatConnectionError,
  companyId,
  selectedChatLeadId,
  loadMessagesForLead,
  refreshLeads,
  createChatConversation,
  chatLeadSearch,
  setChatLeadSearch,
  filteredChatLeads,
  setSelectedChatLeadId,
  selectedChatLead,
  selectedLeadWindowOpen,
  loadingChatMessages,
  chatMessages,
  chatMessagesError,
  chatTemplates,
  loadingTemplates,
  syncingTemplates,
  syncTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
  templateVars,
  setTemplateVars,
  sendSelectedTemplate,
  sendingChat,
  chatText,
  setChatText,
  sendChatMessage,
  sendChatMedia,
  loadingChatConnection,
  chatConnection,
  chatPhone,
  setChatPhone,
  chatDisplayName,
  setChatDisplayName,
  chatMetaBusinessId,
  setChatMetaBusinessId,
  chatMetaPhoneId,
  setChatMetaPhoneId,
  saveChatConnection,
  markChatConnected,
  savingChatConnection,
}: ChatModuleProps) {
  const [onboardingStep, setOnboardingStep] = useState(1);
  const phoneSaved = chatPhone.trim().length > 0;

  // Anexos e emojis da barra de envio.
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiBoxRef = useRef<HTMLDivElement | null>(null);

  const EMOJIS = [
    "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤔", "😴",
    "👍", "👎", "👏", "🙏", "💪", "🙌", "🤝", "👋", "✌️", "🤙",
    "❤️", "🔥", "🎉", "✅", "❌", "⭐", "💯", "📎", "📅", "💰",
  ];

  // Fecha o seletor de emojis ao clicar fora dele.
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClickOutside(event: MouseEvent) {
      if (emojiBoxRef.current && !emojiBoxRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // Libera a URL de preview quando o arquivo muda ou some.
  useEffect(() => {
    return () => {
      if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview);
    };
  }, [pendingFilePreview]);

  function handlePickFile(file: File | null) {
    if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview);
    setPendingFile(file);
    setPendingFilePreview(file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  }

  function clearPendingFile() {
    if (pendingFilePreview) URL.revokeObjectURL(pendingFilePreview);
    setPendingFile(null);
    setPendingFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    if (pendingFile) {
      const ok = await sendChatMedia(pendingFile, chatText);
      if (ok) {
        clearPendingFile();
        setChatText("");
      }
      return;
    }
    void sendChatMessage();
  }

  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationName, setNewConversationName] = useState("");
  const [newConversationPhone, setNewConversationPhone] = useState("");
  const [creatingConversation, setCreatingConversation] = useState(false);

  async function handleCreateConversation() {
    setCreatingConversation(true);
    const ok = await createChatConversation(newConversationName, newConversationPhone);
    setCreatingConversation(false);
    if (ok) {
      setNewConversationName("");
      setNewConversationPhone("");
      setShowNewConversation(false);
    }
  }

  const selectedTemplate = chatTemplates.find((t) => t.id === selectedTemplateId) || null;

  // Extrai os placeholders {{1}}, {{2}}... do corpo do template, em ordem e sem repetir.
  function templatePlaceholders(body: string): string[] {
    const found = new Set<string>();
    const regex = /{{\s*(\d+)\s*}}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(body || "")) !== null) {
      found.add(match[1]);
    }
    return Array.from(found).sort((a, b) => Number(a) - Number(b));
  }

  // Substitui os placeholders pela previa do que sera enviado (variaveis ja preenchidas).
  function renderTemplatePreview(body: string, vars: Record<string, string>): string {
    return (body || "").replace(/{{\s*(\d+)\s*}}/g, (full, key) => {
      const value = vars[key];
      return value && value.trim() ? value : full;
    });
  }

  const selectedPlaceholders = selectedTemplate ? templatePlaceholders(selectedTemplate.body) : [];
  const missingVars = selectedPlaceholders.filter((key) => !(templateVars[key] && templateVars[key].trim()));

  // Indicador de entrega no estilo WhatsApp para mensagens enviadas por nós.
  function deliveryIndicator(status?: string | null) {
    switch ((status || "").toLowerCase()) {
      case "read":
        return { mark: "✓✓", className: "text-sky-300", label: "Lida" };
      case "delivered":
        return { mark: "✓✓", className: "text-white/80", label: "Entregue" };
      case "sent":
      case "queued":
        return { mark: "✓", className: "text-white/80", label: "Enviada" };
      case "failed":
        return { mark: "✕", className: "text-rose-200", label: "Falhou" };
      default:
        return null;
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Conversas</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {isChatConnected
            ? "Conversas liberadas para uso."
            : "As conversas só funcionam quando o número da empresa estiver conectado com a Meta."}
        </p>
      </div>

      {chatConnectionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {chatConnectionError}
        </div>
      ) : null}

      {!companyId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">Chat indisponível sem empresa</p>
          <p className="mt-1 text-sm text-amber-800">
            Para liberar o chat, primeiro crie sua empresa no onboarding no topo da tela.
          </p>
        </div>
      ) : isChatConnected ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:h-[calc(100vh-220px)]">
          <div className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">Conversas</p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    void refreshLeads();
                    if (selectedChatLeadId) void loadMessagesForLead(selectedChatLeadId);
                  }}
                  title="Atualizar"
                  aria-label="Atualizar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:bg-pink-50/40"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-current fill-none" strokeWidth="1.8">
                    <path d="M4 4v6h6" />
                    <path d="M20 20v-6h-6" />
                    <path d="M20 10a8 8 0 0 0-14.3-3.3L4 10" />
                    <path d="M4 14a8 8 0 0 0 14.3 3.3L20 14" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowNewConversation(true)}
                  title="Nova conversa"
                  aria-label="Nova conversa"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white hover:opacity-90"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-current fill-none" strokeWidth="1.8">
                    <path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />
                    <path d="M12 8.5v5M9.5 11h5" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="mb-3 text-[10px] text-[var(--muted)]">Atualiza automaticamente a cada poucos segundos.</p>
            <input
              value={chatLeadSearch}
              onChange={(e) => setChatLeadSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone"
              className="mb-3 h-10 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
            />
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 lg:max-h-none max-h-[560px]">
              {filteredChatLeads.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] p-3 text-xs text-[var(--muted)]">
                  Nenhum lead encontrado.
                </p>
              ) : (
                filteredChatLeads.map((lead) => {
                  const active = selectedChatLeadId === lead.id;
                  const displayName = lead.name || "Sem nome";
                  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
                  const windowOpen = lead.conversation_window?.is_open === true;
                  const preview = (lead.last_conversation_summary || "").trim();
                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedChatLeadId(lead.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-[var(--primary)] bg-pink-50"
                          : "border-[var(--line)] bg-white hover:bg-pink-50/40"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-semibold text-[var(--primary)]">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{displayName}</p>
                          {windowOpen ? (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              24h
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {preview || lead.phone}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-white p-4">
            {selectedChatLead ? (
              <>
                <div className="border-b border-[var(--line)] pb-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{selectedChatLead.name || "Sem nome"}</p>
                  <p className="text-xs text-[var(--muted)]">{selectedChatLead.phone}</p>
                  <p className={`mt-1 text-xs ${selectedLeadWindowOpen ? "text-emerald-700" : "text-amber-700"}`}>
                    {selectedLeadWindowOpen ? "Janela 24h: aberta" : "Janela 24h: fechada (use template)"}
                  </p>
                </div>

                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-[var(--line)] bg-[#fffdfd] p-3 lg:h-auto h-[430px]">
                  {loadingChatMessages ? (
                    <p className="text-xs text-[var(--muted)]">Carregando mensagens...</p>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">Sem mensagens nesta conversa.</p>
                  ) : (
                    chatMessages.map((message) => {
                      const outbound = message.direction === "outbound";
                      const indicator = outbound ? deliveryIndicator(message.delivery_status) : null;
                      return (
                        <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                              outbound
                                ? "bg-[var(--primary)] text-white"
                                : "border border-[var(--line)] bg-white text-[var(--foreground)]"
                            }`}
                          >
                            {(() => {
                              const label = (message.content || message.body || "").trim();
                              const hasMedia = message.has_media && message.media_url;
                              // O tipo da midia nao e gravado no banco; inferimos pelo rotulo
                              // ([Imagem], [Vídeo]...) que o webhook salva em content.
                              const isImage = /\[(Imagem|GIF|Figurinha)\]/i.test(label);
                              const isVideo = /\[Vídeo\]/i.test(label);
                              const isAudio = /\[Áudio\]/i.test(label);
                              return (
                                <>
                                  {!hasMedia || (!isImage && !isVideo && !isAudio) ? (
                                    <p className="whitespace-pre-wrap break-words">{label || "-"}</p>
                                  ) : null}
                                  {hasMedia ? (
                                    <div className="mt-1">
                                      {isImage ? (
                                        <img
                                          src={message.media_url || undefined}
                                          alt={label || "Imagem recebida"}
                                          className="max-h-60 max-w-full rounded-lg border border-black/5 object-contain"
                                          loading="lazy"
                                        />
                                      ) : isVideo ? (
                                        <video
                                          src={message.media_url || undefined}
                                          controls
                                          className="max-h-60 max-w-full rounded-lg border border-black/5"
                                        />
                                      ) : isAudio ? (
                                        <audio src={message.media_url || undefined} controls className="w-full" />
                                      ) : (
                                        <a
                                          href={message.media_url || undefined}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`inline-flex items-center gap-1 text-xs underline ${
                                            outbound ? "text-white/90" : "text-[var(--primary)]"
                                          }`}
                                        >
                                          Abrir mídia ↗
                                        </a>
                                      )}
                                    </div>
                                  ) : null}
                                </>
                              );
                            })()}
                            <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${outbound ? "text-white/80" : "text-[var(--muted)]"}`}>
                              <span>{new Date(message.created_at).toLocaleString("pt-BR")}</span>
                              {indicator ? (
                                <span className={indicator.className} title={indicator.label}>
                                  {indicator.mark}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {chatMessagesError ? (
                  <p className="mt-2 text-xs text-rose-600">{chatMessagesError}</p>
                ) : null}

                {!selectedLeadWindowOpen ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-amber-800">
                        A janela de 24h está fechada. Para reabrir a conversa, escolha um template
                        aprovado pela Meta abaixo.
                      </p>
                      <button
                        onClick={syncTemplates}
                        disabled={syncingTemplates}
                        className="shrink-0 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-800 disabled:opacity-60"
                        title="Buscar templates aprovados na Meta/Twilio"
                      >
                        {syncingTemplates ? "Sincronizando..." : "Sincronizar"}
                      </button>
                    </div>

                    {loadingTemplates ? (
                      <p className="mt-3 text-xs text-amber-800">Carregando templates...</p>
                    ) : chatTemplates.length === 0 ? (
                      <p className="mt-3 text-xs text-amber-800">
                        Nenhum template encontrado. Clique em "Sincronizar" para buscar os
                        aprovados na Meta.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <select
                          value={selectedTemplateId || ""}
                          onChange={(e) => {
                            setSelectedTemplateId(e.target.value || null);
                            setTemplateVars({});
                          }}
                          className="h-10 w-full rounded-xl border border-amber-300 bg-white px-3 text-sm text-amber-900"
                        >
                          <option value="">Selecione um template...</option>
                          {chatTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>

                        {selectedTemplate ? (
                          <>
                            {selectedPlaceholders.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-[11px] font-medium text-amber-900">
                                  Preencha as variáveis do template:
                                </p>
                                {selectedPlaceholders.map((key) => (
                                  <div key={key}>
                                    <label className="mb-1 block text-[11px] text-amber-800">
                                      Variável {`{{${key}}}`}
                                    </label>
                                    <input
                                      value={templateVars[key] || ""}
                                      onChange={(e) =>
                                        setTemplateVars({ ...templateVars, [key]: e.target.value })
                                      }
                                      placeholder={`Valor para {{${key}}}`}
                                      className="h-9 w-full rounded-lg border border-amber-300 bg-white px-2 text-sm"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            <div className="rounded-lg border border-amber-200 bg-white p-2">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
                                Prévia da mensagem
                              </p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">
                                {renderTemplatePreview(selectedTemplate.body, templateVars)}
                              </p>
                            </div>

                            <button
                              onClick={sendSelectedTemplate}
                              disabled={sendingChat || missingVars.length > 0}
                              className="h-10 w-full rounded-xl bg-[var(--primary)] px-3 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {sendingChat
                                ? "Enviando..."
                                : missingVars.length > 0
                                  ? `Preencha ${missingVars.length} variável(is)`
                                  : "Enviar template e reabrir conversa"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                {pendingFile ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-pink-50/40 p-2">
                    {pendingFilePreview ? (
                      <img
                        src={pendingFilePreview}
                        alt={pendingFile.name}
                        className="h-12 w-12 shrink-0 rounded-lg border border-black/5 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-pink-100 text-[var(--primary)]">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-current fill-none" strokeWidth="1.8">
                          <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{pendingFile.name}</p>
                      <p className="text-[11px] text-[var(--muted)]">
                        {(pendingFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={clearPendingFile}
                      aria-label="Remover anexo"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:bg-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}

                <div className="relative mt-3 flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handlePickFile(file);
                    }}
                  />

                  <button
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    disabled={!selectedLeadWindowOpen}
                    title="Emojis"
                    aria-label="Emojis"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--muted)] hover:bg-pink-50/40 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-current fill-none" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8 14a4 4 0 0 0 8 0" />
                      <path d="M9 9h.01M15 9h.01" />
                    </svg>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedLeadWindowOpen}
                    title="Anexar arquivo"
                    aria-label="Anexar arquivo"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--muted)] hover:bg-pink-50/40 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-current fill-none" strokeWidth="1.8">
                      <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>

                  {showEmojiPicker ? (
                    <div
                      ref={emojiBoxRef}
                      className="absolute bottom-14 left-0 z-10 grid w-64 grid-cols-8 gap-1 rounded-xl border border-[var(--line)] bg-white p-2 shadow-lg"
                    >
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setChatText(chatText + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-pink-50"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={pendingFile ? "Adicione uma legenda (opcional)..." : "Digite uma mensagem..."}
                    disabled={!selectedLeadWindowOpen}
                    className="h-11 flex-1 rounded-xl border border-[var(--line)] px-3 text-sm disabled:bg-zinc-100"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sendingChat || (!chatText.trim() && !pendingFile) || !selectedLeadWindowOpen}
                    className="h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {sendingChat ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)] lg:h-auto h-[520px]">
                Selecione uma conversa na lista ao lado.
              </div>
            )}
          </div>

          {showNewConversation ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-[var(--foreground)]">Nova conversa</p>
                  <button
                    onClick={() => setShowNewConversation(false)}
                    aria-label="Fechar"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:bg-pink-50/40"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">Nome</label>
                    <input
                      value={newConversationName}
                      onChange={(e) => setNewConversationName(e.target.value)}
                      placeholder="Nome do contato"
                      className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">Telefone</label>
                    <input
                      value={newConversationPhone}
                      onChange={(e) => setNewConversationPhone(e.target.value)}
                      placeholder="+55 (11) 90000-0000"
                      className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setShowNewConversation(false)}
                    className="h-11 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--muted)]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateConversation}
                    disabled={creatingConversation || !newConversationName.trim() || !newConversationPhone.trim()}
                    className="h-11 flex-1 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {creatingConversation ? "Criando..." : "Iniciar conversa"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <div className="text-center">
              <p className="text-base font-semibold text-[var(--foreground)]">
                Conecte seu WhatsApp em 3 passos
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Leva poucos minutos. Vamos te guiar em cada etapa.
              </p>
            </div>

            {/* Indicador de passos */}
            <div className="mt-5 flex items-center justify-center gap-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      step === onboardingStep
                        ? "bg-[var(--primary)] text-white"
                        : step < onboardingStep
                          ? "bg-pink-100 text-[var(--primary)]"
                          : "border border-[var(--line)] text-[var(--muted)]"
                    }`}
                  >
                    {step < onboardingStep ? "✓" : step}
                  </div>
                  {step < 3 ? (
                    <div className={`h-px w-8 ${step < onboardingStep ? "bg-[var(--primary)]" : "bg-[var(--line)]"}`} />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-6">
              {/* PASSO 1: número comercial */}
              {onboardingStep === 1 ? (
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Passo 1 — Cadastre seu número comercial
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Informe o número que sua empresa usa no WhatsApp e o nome que aparece para os clientes.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">
                        Número do WhatsApp
                      </label>
                      <input
                        value={chatPhone}
                        onChange={(e) => setChatPhone(e.target.value)}
                        placeholder="+55 (11) 90000-0000"
                        className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">
                        Nome de exibição
                      </label>
                      <input
                        value={chatDisplayName}
                        onChange={(e) => setChatDisplayName(e.target.value)}
                        placeholder="Como o cliente vê sua empresa"
                        className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await saveChatConnection();
                      setOnboardingStep(2);
                    }}
                    disabled={savingChatConnection || !phoneSaved}
                    className="mt-5 h-11 w-full rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingChatConnection ? "Salvando..." : "Salvar e continuar"}
                  </button>
                </div>
              ) : null}

              {/* PASSO 2: conectar na Meta */}
              {onboardingStep === 2 ? (
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Passo 2 — Conecte o número à Meta
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    No Meta Business Suite, conecte o número ao WhatsApp Business. Use os botões abaixo para abrir as telas certas.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <a
                      href="https://business.facebook.com/latest/home"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--foreground)] hover:bg-pink-50/40"
                    >
                      Abrir Meta Business Suite ↗
                    </a>
                    <a
                      href="https://business.facebook.com/latest/whatsapp_manager"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--foreground)] hover:bg-pink-50/40"
                    >
                      Abrir WhatsApp Manager ↗
                    </a>
                  </div>

                  <div className="mt-4 rounded-xl border border-[var(--line)] bg-pink-50/30 p-3">
                    <p className="text-xs font-medium text-[var(--foreground)]">
                      Não sabe por onde começar?
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      A Meta tem um guia passo a passo para iniciantes configurarem o WhatsApp Business.
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      <a
                        href="https://www.facebook.com/business/help/2058515294227817"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
                      >
                        Guia para iniciantes (Central de Ajuda) ↗
                      </a>
                      <a
                        href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
                      >
                        Documentação técnica (Cloud API) ↗
                      </a>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => setOnboardingStep(1)}
                      className="h-11 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--muted)]"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(3)}
                      className="h-11 flex-1 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white"
                    >
                      Já conectei na Meta
                    </button>
                  </div>
                </div>
              ) : null}

              {/* PASSO 3: finalizar */}
              {onboardingStep === 3 ? (
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Passo 3 — Finalizar conexão
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Pronto! Marque como conectado para liberar as conversas.
                  </p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">
                        Meta business ID
                      </label>
                      <input
                        value={chatMetaBusinessId}
                        onChange={(e) => setChatMetaBusinessId(e.target.value)}
                        placeholder="Cole o business ID da Meta"
                        className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">
                        Meta phone number ID
                      </label>
                      <input
                        value={chatMetaPhoneId}
                        onChange={(e) => setChatMetaPhoneId(e.target.value)}
                        placeholder="Cole o phone number ID da Meta"
                        className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => setOnboardingStep(2)}
                      className="h-11 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--muted)]"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={markChatConnected}
                      disabled={savingChatConnection || !chatMetaBusinessId.trim() || !chatMetaPhoneId.trim()}
                      className="h-11 flex-1 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {savingChatConnection ? "Conectando..." : "Marcar como conectado"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <p className="mt-5 text-center text-xs text-[var(--muted)]">
              Status atual:{" "}
              <span className="font-medium text-[var(--primary)]">
                {loadingChatConnection ? "carregando..." : chatConnection?.status || "não configurado"}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
