type ChatModuleProps = {
  isChatConnected: boolean;
  chatConnectionError: string | null;
  companyId: string | null;
  selectedChatLeadId: string | null;
  loadMessagesForLead: (leadId: string) => void | Promise<void>;
  chatLeadSearch: string;
  setChatLeadSearch: (value: string) => void;
  filteredChatLeads: Array<any>;
  setSelectedChatLeadId: (value: string) => void;
  selectedChatLead: any | null;
  selectedLeadWindowOpen: boolean;
  loadingChatMessages: boolean;
  chatMessages: Array<any>;
  chatMessagesError: string | null;
  sendRestartTemplate: () => void | Promise<void>;
  sendingChat: boolean;
  chatText: string;
  setChatText: (value: string) => void;
  sendChatMessage: () => void | Promise<void>;
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
  copyToClipboard: (value: string) => void | Promise<void>;
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
  chatLeadSearch,
  setChatLeadSearch,
  filteredChatLeads,
  setSelectedChatLeadId,
  selectedChatLead,
  selectedLeadWindowOpen,
  loadingChatMessages,
  chatMessages,
  chatMessagesError,
  sendRestartTemplate,
  sendingChat,
  chatText,
  setChatText,
  sendChatMessage,
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
  copyToClipboard,
  saveChatConnection,
  markChatConnected,
  savingChatConnection,
}: ChatModuleProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Conversas</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {isChatConnected
            ? "Conversas liberadas para uso."
            : "As conversas so funcionam quando o numero da empresa estiver conectado com a Meta."}
        </p>
      </div>

      {chatConnectionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {chatConnectionError}
        </div>
      ) : null}

      {!companyId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">Chat indisponivel sem empresa</p>
          <p className="mt-1 text-sm text-amber-800">
            Para liberar o chat, primeiro crie sua empresa no onboarding no topo da tela.
          </p>
        </div>
      ) : isChatConnected ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">Conversas</p>
              <button
                onClick={() => {
                  if (selectedChatLeadId) void loadMessagesForLead(selectedChatLeadId);
                }}
                className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]"
              >
                Atualizar
              </button>
            </div>
            <input
              value={chatLeadSearch}
              onChange={(e) => setChatLeadSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone"
              className="mb-3 h-10 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
            />
            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {filteredChatLeads.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] p-3 text-xs text-[var(--muted)]">
                  Nenhum lead encontrado.
                </p>
              ) : (
                filteredChatLeads.map((lead) => {
                  const active = selectedChatLeadId === lead.id;
                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedChatLeadId(lead.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-[var(--primary)] bg-pink-50"
                          : "border-[var(--line)] bg-white hover:bg-pink-50/40"
                      }`}
                    >
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{lead.name || "Sem nome"}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{lead.phone}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
            {selectedChatLead ? (
              <>
                <div className="border-b border-[var(--line)] pb-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{selectedChatLead.name || "Sem nome"}</p>
                  <p className="text-xs text-[var(--muted)]">{selectedChatLead.phone}</p>
                  <p className={`mt-1 text-xs ${selectedLeadWindowOpen ? "text-emerald-700" : "text-amber-700"}`}>
                    {selectedLeadWindowOpen ? "Janela 24h: aberta" : "Janela 24h: fechada (use template)"}
                  </p>
                </div>

                <div className="mt-3 h-[430px] space-y-2 overflow-y-auto rounded-xl border border-[var(--line)] bg-[#fffdfd] p-3">
                  {loadingChatMessages ? (
                    <p className="text-xs text-[var(--muted)]">Carregando mensagens...</p>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">Sem mensagens nesta conversa.</p>
                  ) : (
                    chatMessages.map((message) => {
                      const outbound = message.direction === "outbound";
                      return (
                        <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                              outbound
                                ? "bg-[var(--primary)] text-white"
                                : "border border-[var(--line)] bg-white text-[var(--foreground)]"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content || message.body || "-"}</p>
                            <p className={`mt-1 text-[10px] ${outbound ? "text-white/80" : "text-[var(--muted)]"}`}>
                              {new Date(message.created_at).toLocaleString("pt-BR")}
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
                    <p className="text-xs text-amber-800">
                      Janela fechada. Use a mensagem de abertura para reativar a conversa.
                    </p>
                    <button
                      onClick={sendRestartTemplate}
                      disabled={sendingChat}
                      className="mt-2 h-10 rounded-xl border border-amber-300 bg-white px-3 text-sm font-medium text-amber-800 disabled:opacity-60"
                    >
                      Enviar mensagem de abertura
                    </button>
                  </div>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendChatMessage();
                      }
                    }}
                    placeholder="Digite uma mensagem..."
                    disabled={!selectedLeadWindowOpen}
                    className="h-11 flex-1 rounded-xl border border-[var(--line)] px-3 text-sm disabled:bg-zinc-100"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={sendingChat || !chatText.trim() || !selectedLeadWindowOpen}
                    className="h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Enviar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-[520px] items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">
                Selecione uma conversa na lista ao lado.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Status atual:{" "}
            <span className="text-[var(--primary)]">
              {loadingChatConnection
                ? "carregando..."
                : chatConnection?.status || "nao_configurado"}
            </span>
          </p>
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-pink-50/50 p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Onboarding simplificado (manual)</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
              <li>Cadastre o numero comercial no CRM.</li>
              <li>No Meta Business Suite, conecte esse numero ao WhatsApp Business.</li>
              <li>Copie os IDs da Meta e cole abaixo.</li>
              <li>Marque como conectado para liberar o chat.</li>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://business.facebook.com/latest/home"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs leading-8 text-[var(--foreground)]"
              >
                Abrir Meta Business Suite
              </a>
              <a
                href="https://business.facebook.com/latest/whatsapp_manager"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs leading-8 text-[var(--foreground)]"
              >
                Abrir WhatsApp Manager
              </a>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={chatPhone}
              onChange={(e) => setChatPhone(e.target.value)}
              placeholder="+55..."
              className="h-11 rounded-xl border border-[var(--line)] px-3"
            />
            <input
              value={chatDisplayName}
              onChange={(e) => setChatDisplayName(e.target.value)}
              placeholder="Nome exibicao no WhatsApp"
              className="h-11 rounded-xl border border-[var(--line)] px-3"
            />
            <input
              value={chatMetaBusinessId}
              onChange={(e) => setChatMetaBusinessId(e.target.value)}
              placeholder="Meta business id (opcional)"
              className="h-11 rounded-xl border border-[var(--line)] px-3"
            />
            <input
              value={chatMetaPhoneId}
              onChange={(e) => setChatMetaPhoneId(e.target.value)}
              placeholder="Meta phone number id (opcional)"
              className="h-11 rounded-xl border border-[var(--line)] px-3"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => void copyToClipboard(chatMetaBusinessId)}
              className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs"
            >
              Copiar business id
            </button>
            <button
              onClick={() => void copyToClipboard(chatMetaPhoneId)}
              className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs"
            >
              Copiar phone number id
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={saveChatConnection}
              disabled={savingChatConnection}
              className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium"
            >
              Salvar e marcar pendente Meta
            </button>
            <button
              onClick={markChatConnected}
              disabled={savingChatConnection}
              className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70"
            >
              Marcar como conectado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
