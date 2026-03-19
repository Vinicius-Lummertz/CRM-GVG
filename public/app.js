const totalLeadsEl = document.getElementById("total-leads");
const leadListEl = document.getElementById("lead-list");
const connectionPillEl = document.getElementById("connection-pill");
const filterStatusEl = document.getElementById("filter-status");
const filterTemperatureEl = document.getElementById("filter-temperature");
const filterAttentionEl = document.getElementById("filter-attention");

const mediaModalEl = document.getElementById("media-modal");
const mediaModalPanelEl = document.getElementById("media-modal-panel");
const mediaModalImageEl = document.getElementById("media-modal-image");
const mediaModalCloseEl = document.getElementById("media-modal-close");

const state = {
  leads: [],
  eventSource: null,
  filters: {
    status: "",
    temperature: "",
    attentionRequired: false
  }
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitials(name) {
  const raw = (name || "Sem nome").trim();
  if (!raw) return "SN";
  return raw
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDateTime(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function sortLeads(leads) {
  return [...leads].sort((a, b) => {
    const scoreA = Number(a.priorityScore || 0);
    const scoreB = Number(b.priorityScore || 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });
}

function getLatestMessage(lead) {
  if (!lead || !Array.isArray(lead.messages) || !lead.messages.length) return null;
  return lead.messages[0];
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "ganho":
      return "bg-emerald-100 text-emerald-700";
    case "negociando":
      return "bg-lime-100 text-lime-700";
    case "interessado":
      return "bg-sky-100 text-sky-700";
    case "proposta_enviada":
      return "bg-indigo-100 text-indigo-700";
    case "perdido":
      return "bg-rose-100 text-rose-700";
    case "inativo":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function getTemperatureBadgeClass(temperature) {
  switch (temperature) {
    case "hot":
      return "bg-rose-100 text-rose-700";
    case "warm":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-slate-200 text-slate-700";
  }
}

function buildMediaPreviewHtml(message) {
  if (!message || !Array.isArray(message.media) || !message.media.length) return "";

  const firstMedia = message.media[0] || {};
  const mediaUrl = firstMedia.url ? String(firstMedia.url) : "";
  const contentType = firstMedia.contentType ? String(firstMedia.contentType).toLowerCase() : "";
  if (!mediaUrl) {
    return `<p class="mt-2 text-xs text-slate-500">Midia sem URL no payload</p>`;
  }

  const proxyUrl = `/api/media-proxy?url=${encodeURIComponent(mediaUrl)}`;
  const safeProxyUrl = escapeHtml(proxyUrl);

  if (contentType.startsWith("image/")) {
    return `
      <button
        type="button"
        data-media-preview-src="${safeProxyUrl}"
        data-media-preview-alt="Midia recebida"
        class="mt-2 block w-full cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition hover:shadow-sm"
      >
        <img src="${safeProxyUrl}" alt="Midia recebida" loading="lazy" class="h-40 w-full object-contain" />
      </button>
    `;
  }

  if (contentType.startsWith("audio/")) {
    return `<audio controls class="mt-2 w-full"><source src="${safeProxyUrl}"></audio>`;
  }

  return `<a href="${safeProxyUrl}" target="_blank" rel="noreferrer" class="mt-2 inline-block text-xs font-medium text-sky-700 underline">Abrir arquivo recebido</a>`;
}

function openMediaModal(imageSrc, imageAlt) {
  if (!mediaModalEl || !mediaModalPanelEl || !mediaModalImageEl) return;
  mediaModalImageEl.src = imageSrc;
  mediaModalImageEl.alt = imageAlt || "Midia ampliada";
  mediaModalEl.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  requestAnimationFrame(() => {
    mediaModalEl.classList.remove("opacity-0");
    mediaModalEl.classList.add("opacity-100");
    mediaModalPanelEl.classList.remove("scale-95");
    mediaModalPanelEl.classList.add("scale-100");
  });
}

function closeMediaModal() {
  if (!mediaModalEl || !mediaModalPanelEl || !mediaModalImageEl) return;

  mediaModalEl.classList.remove("opacity-100");
  mediaModalEl.classList.add("opacity-0");
  mediaModalPanelEl.classList.remove("scale-100");
  mediaModalPanelEl.classList.add("scale-95");
  document.body.classList.remove("overflow-hidden");

  window.setTimeout(() => {
    mediaModalEl.classList.add("hidden");
    mediaModalImageEl.src = "";
  }, 200);
}

function setupMediaModalEvents() {
  leadListEl.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-media-preview-src]");
    if (!trigger) return;
    const imageSrc = trigger.getAttribute("data-media-preview-src") || "";
    const imageAlt = trigger.getAttribute("data-media-preview-alt") || "Midia ampliada";
    if (!imageSrc) return;
    openMediaModal(imageSrc, imageAlt);
  });

  if (mediaModalCloseEl) {
    mediaModalCloseEl.addEventListener("click", closeMediaModal);
  }

  if (mediaModalEl) {
    mediaModalEl.addEventListener("click", (event) => {
      if (event.target === mediaModalEl) closeMediaModal();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMediaModal();
  });
}

function setupFilterEvents() {
  filterStatusEl?.addEventListener("change", () => {
    state.filters.status = filterStatusEl.value;
    renderLeads();
  });

  filterTemperatureEl?.addEventListener("change", () => {
    state.filters.temperature = filterTemperatureEl.value;
    renderLeads();
  });

  filterAttentionEl?.addEventListener("change", () => {
    state.filters.attentionRequired = Boolean(filterAttentionEl.checked);
    renderLeads();
  });
}

function setStreamStatus(connected) {
  if (connected) {
    connectionPillEl.className = "rounded-xl bg-emerald-100 px-4 py-3 text-emerald-700";
    connectionPillEl.textContent = "Stream conectado";
    return;
  }
  connectionPillEl.className = "rounded-xl bg-amber-100 px-4 py-3 text-amber-800";
  connectionPillEl.textContent = "Reconectando stream...";
}

function applyFilters(leads) {
  return leads.filter((lead) => {
    if (state.filters.status && lead.status !== state.filters.status) return false;
    if (state.filters.temperature && lead.temperature !== state.filters.temperature) return false;
    if (state.filters.attentionRequired && !lead.attentionRequired) return false;
    return true;
  });
}

function renderLeads() {
  const sortedLeads = sortLeads(state.leads);
  const leads = applyFilters(sortedLeads);
  totalLeadsEl.textContent = String(leads.length);

  if (!leads.length) {
    leadListEl.innerHTML = `
      <article class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 md:col-span-2 lg:col-span-3">
        Nenhum lead encontrado com os filtros atuais.
      </article>
    `;
    return;
  }

  const cards = leads.map((lead) => {
    const safeName = escapeHtml(lead.name || "Sem nome");
    const safePhone = escapeHtml(lead.phone || "-");
    const safeStatus = escapeHtml(lead.status || "lead");
    const safeTemperature = escapeHtml(lead.temperature || "cold");
    const safeScore = Number(lead.priorityScore || 0).toFixed(1);
    const safeSummary = escapeHtml(lead.aiShortSummary || "Sem resumo ainda.");
    const safeReason = escapeHtml(lead.aiLastReason || "Sem motivo registrado.");
    const safeMessage = escapeHtml(lead.lastMessagePreview || lead.lastMessage || "Sem mensagem");
    const safeConfidence = `${Math.round(Number(lead.aiLastConfidence || 0) * 100)}%`;
    const safeCount = escapeHtml(String(lead.messageCountTotal || 0));
    const dateText = escapeHtml(formatDateTime(lead.lastMessageAt));
    const latestMessage = getLatestMessage(lead);
    const mediaPreviewHtml = buildMediaPreviewHtml(latestMessage);
    const initials = escapeHtml(getInitials(lead.name));
    const safeAvatarUrl = lead.avatarUrl ? escapeHtml(lead.avatarUrl) : null;
    const attentionClass = lead.attentionRequired ? "ring-2 ring-rose-300" : "ring-1 ring-slate-200";
    const attentionBadge = lead.attentionRequired
      ? `<span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">atencao</span>`
      : "";

    const avatar = safeAvatarUrl
      ? `<img src="${safeAvatarUrl}" alt="${safeName}" class="h-12 w-12 rounded-full object-cover" />`
      : `<div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">${initials}</div>`;

    return `
      <article class="rounded-2xl bg-white p-4 shadow-sm ${attentionClass}">
        <div class="flex items-start gap-3">
          ${avatar}
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-base font-semibold">${safeName}</h2>
            <p class="text-sm text-slate-500">${safePhone}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(lead.status)}">${safeStatus}</span>
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTemperatureBadgeClass(lead.temperature)}">${safeTemperature}</span>
              ${attentionBadge}
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div class="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
            <p class="text-slate-500">Score</p>
            <p class="font-semibold text-slate-800">${safeScore}</p>
          </div>
          <div class="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
            <p class="text-slate-500">Confianca IA</p>
            <p class="font-semibold text-slate-800">${escapeHtml(safeConfidence)}</p>
          </div>
          <div class="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
            <p class="text-slate-500">Mensagens</p>
            <p class="font-semibold text-slate-800">${safeCount}</p>
          </div>
        </div>

        <div class="mt-4 border-t border-slate-100 pt-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumo IA</p>
          <p class="mt-1 text-sm text-slate-700">${safeSummary}</p>
          <p class="mt-2 text-xs text-slate-500">${safeReason}</p>
        </div>

        <div class="mt-4 border-t border-slate-100 pt-3">
          <p class="break-words text-sm text-slate-700">${safeMessage}</p>
          ${mediaPreviewHtml}
          <p class="mt-2 text-xs text-slate-500">Ultima interacao: ${dateText}</p>
        </div>
      </article>
    `;
  });

  leadListEl.innerHTML = cards.join("");
}

function upsertLead(updatedLead) {
  const index = state.leads.findIndex((lead) => lead.id === updatedLead.id);
  if (index >= 0) state.leads[index] = updatedLead;
  else state.leads.push(updatedLead);
  renderLeads();
}

async function loadInitialLeads() {
  const response = await fetch("/api/leads");
  if (!response.ok) throw new Error(`Erro ao carregar leads (${response.status})`);
  const data = await response.json();
  state.leads = Array.isArray(data.leads) ? data.leads : [];
  renderLeads();
}

function connectEvents() {
  if (state.eventSource) state.eventSource.close();
  const eventSource = new EventSource("/api/events");
  state.eventSource = eventSource;

  eventSource.onopen = () => setStreamStatus(true);
  eventSource.onerror = () => setStreamStatus(false);
  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === "lead.updated" && payload.lead) {
        upsertLead(payload.lead);
      }
    } catch (_err) {
      // noop
    }
  };
}

async function init() {
  setStreamStatus(false);
  setupMediaModalEvents();
  setupFilterEvents();
  await loadInitialLeads().catch((error) => console.error(error));
  connectEvents();
}

init();
