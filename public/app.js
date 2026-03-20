const state = {
  auth: {
    accessToken: null,
    refreshToken: null,
    user: null,
    challengeId: null
  },
  conversations: [],
  nextConversationCursor: null,
  selectedConversationId: null,
  selectedConversation: null,
  messages: [],
  operators: [],
  templates: [],
  metrics: null,
  pollingTimer: null,
  eventSource: null,
  loading: {
    conversations: false,
    messages: false
  }
};

const el = {
  notice: document.getElementById("notice"),

  authScreen: document.getElementById("auth-screen"),
  appScreen: document.getElementById("app-screen"),
  authPhone: document.getElementById("auth-phone"),
  authRequestBtn: document.getElementById("auth-request-btn"),
  authVerifyBlock: document.getElementById("auth-verify-block"),
  authChallengeLabel: document.getElementById("auth-challenge-label"),
  authCode: document.getElementById("auth-code"),
  authVerifyBtn: document.getElementById("auth-verify-btn"),

  authUserLabel: document.getElementById("auth-user-label"),
  logoutBtn: document.getElementById("logout-btn"),
  refreshAllBtn: document.getElementById("refresh-all-btn"),

  metricTotal: document.getElementById("metric-total"),
  metricHot: document.getElementById("metric-hot"),
  metricWon: document.getElementById("metric-won"),
  metricLost: document.getElementById("metric-lost"),

  filterQ: document.getElementById("filter-q"),
  filterStatus: document.getElementById("filter-status"),
  filterTemperature: document.getElementById("filter-temperature"),
  filterOwner: document.getElementById("filter-owner"),
  filterAttention: document.getElementById("filter-attention"),
  applyFiltersBtn: document.getElementById("apply-filters-btn"),
  clearFiltersBtn: document.getElementById("clear-filters-btn"),

  conversationCount: document.getElementById("conversation-count"),
  conversationList: document.getElementById("conversation-list"),
  loadMoreConversationsBtn: document.getElementById("load-more-conversations-btn"),

  conversationEmpty: document.getElementById("conversation-empty"),
  conversationPanel: document.getElementById("conversation-panel"),
  conversationName: document.getElementById("conversation-name"),
  conversationPhone: document.getElementById("conversation-phone"),
  conversationStatus: document.getElementById("conversation-status"),
  conversationOwner: document.getElementById("conversation-owner"),
  saveStatusBtn: document.getElementById("save-status-btn"),
  saveOwnerBtn: document.getElementById("save-owner-btn"),

  insightStatus: document.getElementById("insight-status"),
  insightTemp: document.getElementById("insight-temp"),
  insightConfidence: document.getElementById("insight-confidence"),
  insightBudget: document.getElementById("insight-budget"),
  insightSummary: document.getElementById("insight-summary"),

  messageList: document.getElementById("message-list"),
  reloadMessagesBtn: document.getElementById("reload-messages-btn"),

  sendType: document.getElementById("send-type"),
  sendMode: document.getElementById("send-mode"),
  sendIdempotency: document.getElementById("send-idempotency"),
  sendBody: document.getElementById("send-body"),
  sendTextBlock: document.getElementById("send-text-block"),
  sendTemplateBlock: document.getElementById("send-template-block"),
  sendTemplateId: document.getElementById("send-template-id"),
  sendTemplateVars: document.getElementById("send-template-vars"),
  sendMessageBtn: document.getElementById("send-message-btn"),

  tplName: document.getElementById("tpl-name"),
  tplLanguage: document.getElementById("tpl-language"),
  tplCategory: document.getElementById("tpl-category"),
  tplVars: document.getElementById("tpl-vars"),
  tplBody: document.getElementById("tpl-body"),
  tplSelect: document.getElementById("tpl-select"),
  tplCreateBtn: document.getElementById("tpl-create-btn"),
  tplUpdateBtn: document.getElementById("tpl-update-btn")
};

function showNotice(message, kind = "info") {
  if (!el.notice) return;
  const className =
    kind === "error"
      ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
      : kind === "success"
      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
      : "bg-slate-900 text-white";

  el.notice.className = `fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${className}`;
  el.notice.textContent = message;
  el.notice.classList.remove("hidden");

  window.clearTimeout(showNotice._timer);
  showNotice._timer = window.setTimeout(() => {
    el.notice.classList.add("hidden");
  }, 3200);
}

function formatDateTime(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAuthHeader() {
  return state.auth.accessToken ? { Authorization: `Bearer ${state.auth.accessToken}` } : {};
}

function setSession(tokens) {
  state.auth.accessToken = tokens.accessToken;
  state.auth.refreshToken = tokens.refreshToken;
  state.auth.user = tokens.user;
  localStorage.setItem("crm_v1_access_token", state.auth.accessToken || "");
  localStorage.setItem("crm_v1_refresh_token", state.auth.refreshToken || "");
}

function clearSession() {
  state.auth.accessToken = null;
  state.auth.refreshToken = null;
  state.auth.user = null;
  localStorage.removeItem("crm_v1_access_token");
  localStorage.removeItem("crm_v1_refresh_token");
}

async function tryRefreshToken() {
  if (!state.auth.refreshToken) return false;
  const response = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: state.auth.refreshToken })
  });

  if (!response.ok) return false;
  const payload = await response.json();
  state.auth.accessToken = payload.access_token;
  state.auth.refreshToken = payload.refresh_token;
  localStorage.setItem("crm_v1_access_token", state.auth.accessToken || "");
  localStorage.setItem("crm_v1_refresh_token", state.auth.refreshToken || "");
  return true;
}

async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  const auth = options.auth !== false;
  const retry = Boolean(options.retry);
  const headers = { ...(options.headers || {}) };

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (auth && state.auth.accessToken) {
    headers.Authorization = `Bearer ${state.auth.accessToken}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body)
  });

  if (response.status === 401 && auth && !retry && state.auth.refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiRequest(path, { ...options, retry: true });
    }
  }

  let payload = null;
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (isJson) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => "");
  }

  if (!response.ok) {
    const message = (payload && payload.error) || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function setAuthScreenVisible(visible) {
  if (visible) {
    el.authScreen.classList.remove("hidden");
    el.appScreen.classList.add("hidden");
  } else {
    el.authScreen.classList.add("hidden");
    el.appScreen.classList.remove("hidden");
  }
}

function hydrateUserLabel() {
  const user = state.auth.user;
  if (!user) {
    el.authUserLabel.textContent = "-";
    return;
  }
  const name = user.name || "Operator";
  el.authUserLabel.textContent = `${name} (${user.phone || ""})`;
}

function setMetrics(metrics) {
  el.metricTotal.textContent = String(metrics?.totalLeads ?? "-");
  el.metricHot.textContent = String(metrics?.hotLeads ?? "-");
  el.metricWon.textContent = String(metrics?.wonLeads ?? "-");
  el.metricLost.textContent = String(metrics?.lostLeads ?? "-");
}

function renderOwnerSelects() {
  const options = ['<option value="">Sem owner</option>']
    .concat(
      state.operators.map((op) => `<option value="${escapeHtml(op.id)}">${escapeHtml(op.name || op.phone)}</option>`)
    )
    .join("");

  el.filterOwner.innerHTML = `<option value="">Owner: todos</option>${state.operators
    .map((op) => `<option value="${escapeHtml(op.id)}">${escapeHtml(op.name || op.phone)}</option>`)
    .join("")}`;

  el.conversationOwner.innerHTML = options;
}

function renderTemplateSelectors() {
  const options = ['<option value="">Selecione um template</option>']
    .concat(state.templates.map((tpl) => `<option value="${escapeHtml(tpl.id)}">${escapeHtml(tpl.name)}</option>`))
    .join("");
  el.sendTemplateId.innerHTML = options;

  el.tplSelect.innerHTML = ['<option value="">Selecionar template existente</option>']
    .concat(state.templates.map((tpl) => `<option value="${escapeHtml(tpl.id)}">${escapeHtml(tpl.name)}</option>`))
    .join("");
}

function renderConversationList() {
  el.conversationCount.textContent = String(state.conversations.length);
  if (!state.conversations.length) {
    el.conversationList.innerHTML = '<p class="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Nenhuma conversa encontrada.</p>';
    return;
  }

  el.conversationList.innerHTML = state.conversations
    .map((item) => {
      const isActive = item.id === state.selectedConversationId;
      return `
        <button
          type="button"
          data-conv-id="${escapeHtml(item.id)}"
          class="w-full rounded-xl border p-3 text-left transition ${
            isActive ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
          }"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="truncate text-sm font-semibold text-slate-900">${escapeHtml(item.contact.name || "Sem nome")}</p>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">${escapeHtml(
              item.pipeline.status || "lead"
            )}</span>
          </div>
          <p class="mt-1 truncate text-xs text-slate-500">${escapeHtml(item.contact.phone || "-")}</p>
          <p class="mt-1 line-clamp-2 text-xs text-slate-700">${escapeHtml(item.lastMessage.preview || "Sem mensagem")}</p>
          <div class="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>${escapeHtml(item.pipeline.temperature || "cold")}</span>
            <span>${escapeHtml(formatDateTime(item.lastMessage.at))}</span>
          </div>
        </button>
      `;
    })
    .join("");

  el.loadMoreConversationsBtn.classList.toggle("hidden", !state.nextConversationCursor);
}

function renderConversationPanel() {
  const c = state.selectedConversation;
  if (!c) {
    el.conversationEmpty.classList.remove("hidden");
    el.conversationPanel.classList.add("hidden");
    return;
  }

  el.conversationEmpty.classList.add("hidden");
  el.conversationPanel.classList.remove("hidden");

  el.conversationName.textContent = c.contact.name || "Sem nome";
  el.conversationPhone.textContent = c.contact.phone || "-";
  el.conversationStatus.value = c.pipeline.status || "lead";
  el.conversationOwner.value = c.pipeline.ownerId || "";

  el.insightStatus.textContent = c.insights.status || c.pipeline.status || "-";
  el.insightTemp.textContent = c.insights.temperature || c.pipeline.temperature || "-";
  el.insightConfidence.textContent = `${Math.round(Number(c.insights.confidence || 0) * 100)}%`;
  el.insightBudget.textContent = c.insights.budgetText || "Nao informado.";
  el.insightSummary.textContent = c.insights.summary || c.insights.shortSummary || "Sem resumo.";
}

function renderMessages() {
  if (!state.messages.length) {
    el.messageList.innerHTML = '<p class="rounded-lg bg-white p-3 text-sm text-slate-500">Sem mensagens ainda.</p>';
    return;
  }

  el.messageList.innerHTML = state.messages
    .map((m) => {
      const outbound = m.direction === "outbound";
      const bubbleClass = outbound
        ? "ml-auto bg-emerald-600 text-white"
        : "mr-auto bg-white text-slate-800 border border-slate-200";

      return `
        <article class="max-w-[85%] rounded-xl px-3 py-2 text-sm ${bubbleClass}">
          <p class="whitespace-pre-wrap break-words">${escapeHtml(m.body || m.preview || "(sem conteudo)")}</p>
          <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] ${
            outbound ? "text-emerald-100" : "text-slate-500"
          }">
            <span>${escapeHtml(m.type || "text")} • ${escapeHtml(m.mode || "real")}</span>
            <span>${escapeHtml(m.deliveryStatus || "received")}</span>
            <span>${escapeHtml(formatDateTime(m.timestamps?.createdAt))}</span>
          </div>
        </article>
      `;
    })
    .join("");

  el.messageList.scrollTop = el.messageList.scrollHeight;
}

function selectedFilterValues() {
  return {
    q: el.filterQ.value.trim(),
    status: el.filterStatus.value,
    temperature: el.filterTemperature.value,
    ownerId: el.filterOwner.value,
    attentionRequired: Boolean(el.filterAttention.checked)
  };
}

async function loadOperators() {
  const response = await apiRequest("/api/v1/operators");
  state.operators = Array.isArray(response.items) ? response.items : [];
  renderOwnerSelects();
}

async function loadTemplates() {
  const response = await apiRequest("/api/v1/templates?limit=100");
  state.templates = Array.isArray(response.items) ? response.items : [];
  renderTemplateSelectors();
}

async function loadMetrics() {
  const filters = selectedFilterValues();
  const query = new URLSearchParams();
  if (filters.ownerId) query.set("owner_id", filters.ownerId);
  const response = await apiRequest(`/api/v1/dashboard/metrics?${query.toString()}`);
  state.metrics = response.metrics || null;
  setMetrics(state.metrics || {});
}

async function loadConversations({ reset = false } = {}) {
  if (state.loading.conversations) return;
  state.loading.conversations = true;

  try {
    if (reset) {
      state.nextConversationCursor = null;
      state.conversations = [];
    }

    const filters = selectedFilterValues();
    const query = new URLSearchParams();
    query.set("limit", "20");
    if (!reset && state.nextConversationCursor) query.set("cursor", state.nextConversationCursor);
    if (filters.q) query.set("q", filters.q);
    if (filters.status) query.set("status", filters.status);
    if (filters.temperature) query.set("temperature", filters.temperature);
    if (filters.ownerId) query.set("owner_id", filters.ownerId);
    if (filters.attentionRequired) query.set("attention_required", "true");

    const response = await apiRequest(`/api/v1/conversations?${query.toString()}`);
    const items = Array.isArray(response.items) ? response.items : [];

    if (reset) {
      state.conversations = items;
    } else {
      const existing = new Map(state.conversations.map((item) => [item.id, item]));
      for (const item of items) {
        existing.set(item.id, item);
      }
      state.conversations = [...existing.values()];
    }

    state.nextConversationCursor = response.next_cursor || null;
    renderConversationList();

    if (!state.selectedConversationId && state.conversations[0]) {
      await selectConversation(state.conversations[0].id);
    }
  } finally {
    state.loading.conversations = false;
  }
}

async function loadConversationDetails(conversationId) {
  const response = await apiRequest(`/api/v1/conversations/${encodeURIComponent(conversationId)}`);
  const conv = response.conversation;
  if (!conv) return null;

  const insightsResponse = await apiRequest(`/api/v1/conversations/${encodeURIComponent(conversationId)}/insights`);
  conv.insights = insightsResponse.insights || conv.insights || {};

  state.selectedConversation = conv;
  renderConversationPanel();
  return conv;
}

async function loadMessages(conversationId) {
  if (state.loading.messages) return;
  state.loading.messages = true;

  try {
    const response = await apiRequest(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages?limit=80`);
    state.messages = Array.isArray(response.items) ? response.items : [];
    renderMessages();
  } finally {
    state.loading.messages = false;
  }
}

async function selectConversation(conversationId) {
  state.selectedConversationId = conversationId;
  renderConversationList();
  await loadConversationDetails(conversationId);
  await loadMessages(conversationId);
}

async function applyFilters() {
  state.selectedConversationId = null;
  state.selectedConversation = null;
  state.messages = [];
  renderConversationPanel();
  await loadConversations({ reset: true });
  await loadMetrics();
}

function clearFilters() {
  el.filterQ.value = "";
  el.filterStatus.value = "";
  el.filterTemperature.value = "";
  el.filterOwner.value = "";
  el.filterAttention.checked = false;
}

async function updateStatus() {
  if (!state.selectedConversationId) return;
  const status = el.conversationStatus.value;
  await apiRequest(`/api/v1/conversations/${encodeURIComponent(state.selectedConversationId)}/status`, {
    method: "PATCH",
    body: { status }
  });
  showNotice("Status atualizado.", "success");
  await loadConversations({ reset: true });
  await loadConversationDetails(state.selectedConversationId);
}

async function updateOwner() {
  if (!state.selectedConversationId) return;
  const ownerId = el.conversationOwner.value || null;
  await apiRequest(`/api/v1/conversations/${encodeURIComponent(state.selectedConversationId)}/owner`, {
    method: "PATCH",
    body: { owner_id: ownerId }
  });
  showNotice("Owner atualizado.", "success");
  await loadConversations({ reset: true });
  await loadConversationDetails(state.selectedConversationId);
}

function ensureIdempotencyKey() {
  const current = el.sendIdempotency.value.trim();
  if (current) return current;
  const generated = `ui-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  el.sendIdempotency.value = generated;
  return generated;
}

function parseTemplateVariables() {
  const raw = el.sendTemplateVars.value.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Template vars precisa ser um objeto JSON.");
    }
    return parsed;
  } catch (err) {
    throw new Error(`Variaveis do template invalidas: ${err.message}`);
  }
}

async function sendMessage() {
  if (!state.selectedConversationId) {
    throw new Error("Selecione uma conversa antes de enviar.");
  }

  const type = el.sendType.value;
  const mode = el.sendMode.value;
  const idempotencyKey = ensureIdempotencyKey();

  if (type === "text") {
    const body = el.sendBody.value.trim();
    if (!body) throw new Error("Mensagem de texto vazia.");
    await apiRequest(`/api/v1/conversations/${encodeURIComponent(state.selectedConversationId)}/messages`, {
      method: "POST",
      body: {
        type,
        body,
        mode,
        idempotency_key: idempotencyKey
      }
    });
  } else {
    const templateId = el.sendTemplateId.value;
    if (!templateId) throw new Error("Selecione um template.");
    const variables = parseTemplateVariables();
    await apiRequest(`/api/v1/templates/${encodeURIComponent(templateId)}/send`, {
      method: "POST",
      body: {
        conversation_id: state.selectedConversationId,
        variables,
        mode,
        idempotency_key: idempotencyKey
      }
    });
  }

  el.sendBody.value = "";
  showNotice("Mensagem enviada.", "success");
  await loadMessages(state.selectedConversationId);
  await loadConversations({ reset: true });
  await loadMetrics();
}

async function createTemplate() {
  const name = el.tplName.value.trim();
  const body = el.tplBody.value.trim();
  if (!name) throw new Error("Nome do template e obrigatorio.");
  if (!body) throw new Error("Corpo do template e obrigatorio.");

  const variables = el.tplVars.value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  await apiRequest("/api/v1/templates", {
    method: "POST",
    body: {
      name,
      body,
      language: el.tplLanguage.value.trim() || "pt_BR",
      category: el.tplCategory.value.trim() || "utility",
      variables,
      is_active: true
    }
  });

  showNotice("Template criado.", "success");
  await loadTemplates();
}

async function updateTemplate() {
  const templateId = el.tplSelect.value;
  if (!templateId) throw new Error("Selecione um template para atualizar.");

  const variables = el.tplVars.value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  await apiRequest(`/api/v1/templates/${encodeURIComponent(templateId)}`, {
    method: "PATCH",
    body: {
      name: el.tplName.value.trim() || undefined,
      body: el.tplBody.value.trim() || undefined,
      language: el.tplLanguage.value.trim() || undefined,
      category: el.tplCategory.value.trim() || undefined,
      variables
    }
  });

  showNotice("Template atualizado.", "success");
  await loadTemplates();
}

async function performLogout() {
  try {
    await apiRequest("/api/v1/auth/logout", { method: "POST" });
  } catch (_err) {
    // noop
  }
  clearSession();
  stopRealtime();
  setAuthScreenVisible(true);
  showNotice("Sessao encerrada.", "success");
}

function normalizePhoneForValidation(raw) {
  return String(raw || "").replace(/\s+/g, "").trim();
}

async function requestOtp() {
  const phone = normalizePhoneForValidation(el.authPhone.value);
  if (!phone.startsWith("+") || phone.length < 10) {
    throw new Error("Telefone invalido. Use formato +55... (E.164).");
  }

  const response = await apiRequest("/api/v1/auth/otp/request", {
    method: "POST",
    auth: false,
    body: { phone_e164: phone }
  });

  state.auth.challengeId = response.challenge_id;
  el.authChallengeLabel.textContent = response.challenge_id;
  el.authVerifyBlock.classList.remove("hidden");

  if (response.debug_code) {
    el.authCode.value = response.debug_code;
    showNotice("OTP em modo debug preenchido automaticamente.", "info");
  } else {
    showNotice("Codigo OTP enviado.", "success");
  }
}

async function verifyOtp() {
  const code = String(el.authCode.value || "").trim();
  if (!state.auth.challengeId) throw new Error("Solicite um codigo primeiro.");
  if (!/^\d{4,8}$/.test(code)) throw new Error("Codigo OTP invalido.");

  const response = await apiRequest("/api/v1/auth/otp/verify", {
    method: "POST",
    auth: false,
    body: {
      challenge_id: state.auth.challengeId,
      code
    }
  });

  setSession({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    user: response.user
  });

  showNotice("Login concluido.", "success");
  await startApp();
}

function stopRealtime() {
  if (state.pollingTimer) {
    window.clearInterval(state.pollingTimer);
    state.pollingTimer = null;
  }
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
}

function startRealtime() {
  stopRealtime();

  state.pollingTimer = window.setInterval(async () => {
    if (!state.auth.accessToken) return;
    try {
      await loadConversations({ reset: true });
      await loadMetrics();
      if (state.selectedConversationId) {
        await loadMessages(state.selectedConversationId);
        await loadConversationDetails(state.selectedConversationId);
      }
    } catch (_err) {
      // noop
    }
  }, 15000);

  // Legacy stream can still signal inbound updates quickly.
  state.eventSource = new EventSource("/api/events");
  state.eventSource.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === "lead.updated") {
        await loadConversations({ reset: true });
        if (state.selectedConversationId) {
          await loadMessages(state.selectedConversationId);
          await loadConversationDetails(state.selectedConversationId);
        }
      }
    } catch (_err) {
      // noop
    }
  };
}

async function validateStoredSession() {
  const access = localStorage.getItem("crm_v1_access_token");
  const refresh = localStorage.getItem("crm_v1_refresh_token");
  if (!access || !refresh) return false;

  state.auth.accessToken = access;
  state.auth.refreshToken = refresh;

  try {
    const me = await apiRequest("/api/v1/auth/me");
    state.auth.user = me.user;
    return true;
  } catch (_err) {
    clearSession();
    return false;
  }
}

async function startApp() {
  setAuthScreenVisible(false);
  hydrateUserLabel();

  await Promise.all([loadOperators(), loadTemplates()]);
  await Promise.all([loadMetrics(), loadConversations({ reset: true })]);

  if (state.selectedConversationId) {
    await loadConversationDetails(state.selectedConversationId);
    await loadMessages(state.selectedConversationId);
  }

  startRealtime();
}

function bindEvents() {
  el.authRequestBtn.addEventListener("click", async () => {
    try {
      await requestOtp();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.authVerifyBtn.addEventListener("click", async () => {
    try {
      await verifyOtp();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.logoutBtn.addEventListener("click", async () => {
    await performLogout();
  });

  el.refreshAllBtn.addEventListener("click", async () => {
    try {
      await Promise.all([loadConversations({ reset: true }), loadTemplates(), loadOperators(), loadMetrics()]);
      if (state.selectedConversationId) {
        await loadConversationDetails(state.selectedConversationId);
        await loadMessages(state.selectedConversationId);
      }
      showNotice("Dados atualizados.", "success");
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.applyFiltersBtn.addEventListener("click", async () => {
    try {
      await applyFilters();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.clearFiltersBtn.addEventListener("click", async () => {
    try {
      clearFilters();
      await applyFilters();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.loadMoreConversationsBtn.addEventListener("click", async () => {
    try {
      await loadConversations({ reset: false });
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.conversationList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-conv-id]");
    if (!button) return;
    const conversationId = button.getAttribute("data-conv-id");
    if (!conversationId) return;

    try {
      await selectConversation(conversationId);
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.saveStatusBtn.addEventListener("click", async () => {
    try {
      await updateStatus();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.saveOwnerBtn.addEventListener("click", async () => {
    try {
      await updateOwner();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.reloadMessagesBtn.addEventListener("click", async () => {
    if (!state.selectedConversationId) return;
    try {
      await loadMessages(state.selectedConversationId);
      showNotice("Mensagens recarregadas.", "success");
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.sendType.addEventListener("change", () => {
    const isTemplate = el.sendType.value === "template";
    el.sendTextBlock.classList.toggle("hidden", isTemplate);
    el.sendTemplateBlock.classList.toggle("hidden", !isTemplate);
  });

  el.sendMessageBtn.addEventListener("click", async () => {
    try {
      await sendMessage();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.tplCreateBtn.addEventListener("click", async () => {
    try {
      await createTemplate();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.tplUpdateBtn.addEventListener("click", async () => {
    try {
      await updateTemplate();
    } catch (err) {
      showNotice(err.message, "error");
    }
  });

  el.tplSelect.addEventListener("change", () => {
    const templateId = el.tplSelect.value;
    const tpl = state.templates.find((item) => item.id === templateId);
    if (!tpl) return;
    el.tplName.value = tpl.name || "";
    el.tplLanguage.value = tpl.language || "pt_BR";
    el.tplCategory.value = tpl.category || "utility";
    el.tplBody.value = tpl.body || "";
    el.tplVars.value = Array.isArray(tpl.variables) ? tpl.variables.join(",") : "";
  });
}

async function init() {
  bindEvents();

  const hasSession = await validateStoredSession();
  if (!hasSession) {
    setAuthScreenVisible(true);
    return;
  }

  try {
    await startApp();
  } catch (err) {
    showNotice(err.message, "error");
    clearSession();
    setAuthScreenVisible(true);
  }
}

init();
