const totalLeadsEl = document.getElementById("total-leads");
const leadListEl = document.getElementById("lead-list");
const connectionPillEl = document.getElementById("connection-pill");
const mediaModalEl = document.getElementById("media-modal");
const mediaModalPanelEl = document.getElementById("media-modal-panel");
const mediaModalImageEl = document.getElementById("media-modal-image");
const mediaModalCloseEl = document.getElementById("media-modal-close");

const state = {
  leads: [],
  eventSource: null
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
  const parts = raw.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
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
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

function getLatestMessage(lead) {
  if (!lead || !Array.isArray(lead.messages) || lead.messages.length === 0) {
    return null;
  }
  return lead.messages[lead.messages.length - 1];
}

function buildMediaPreviewHtml(message) {
  if (!message || !Array.isArray(message.media) || message.media.length === 0) {
    return "";
  }

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
  if (contentType.startsWith("video/")) {
    return `<a href="${safeProxyUrl}" target="_blank" rel="noreferrer" class="mt-2 inline-block text-xs font-medium text-sky-700 underline">Abrir video recebido</a>`;
  }
  if (contentType.startsWith("audio/")) {
    return `<audio controls class="mt-2 w-full"><source src="${safeProxyUrl}"></audio>`;
  }

  return `<a href="${safeProxyUrl}" target="_blank" rel="noreferrer" class="mt-2 inline-block text-xs font-medium text-sky-700 underline">Abrir arquivo recebido</a>`;
}

function openMediaModal(imageSrc, imageAlt) {
  if (!mediaModalEl || !mediaModalPanelEl || !mediaModalImageEl) {
    return;
  }

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
  if (!mediaModalEl || !mediaModalPanelEl || !mediaModalImageEl) {
    return;
  }

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
    if (!trigger) {
      return;
    }

    const imageSrc = trigger.getAttribute("data-media-preview-src") || "";
    const imageAlt = trigger.getAttribute("data-media-preview-alt") || "Midia ampliada";
    if (!imageSrc) {
      return;
    }

    openMediaModal(imageSrc, imageAlt);
  });

  if (mediaModalCloseEl) {
    mediaModalCloseEl.addEventListener("click", () => {
      closeMediaModal();
    });
  }

  if (mediaModalEl) {
    mediaModalEl.addEventListener("click", (event) => {
      if (event.target === mediaModalEl) {
        closeMediaModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMediaModal();
    }
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

function renderLeads() {
  const leads = sortLeads(state.leads);
  totalLeadsEl.textContent = String(leads.length);

  if (!leads.length) {
    leadListEl.innerHTML = `
      <article class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 md:col-span-2 lg:col-span-3">
        Nenhum lead ainda. Envie uma mensagem para o WhatsApp conectado ao Twilio.
      </article>
    `;
    return;
  }

  const cards = leads.map((lead) => {
    const safeName = escapeHtml(lead.name || "Sem nome");
    const safePhone = escapeHtml(lead.phone || "-");
    const latestMessage = getLatestMessage(lead);
    const previewText = latestMessage && latestMessage.preview ? String(latestMessage.preview) : lead.lastMessage || "";
    const safeMessage = escapeHtml(previewText);
    const safeStatus = escapeHtml(lead.status || "lead");
    const safeAvatarUrl = lead.avatarUrl ? escapeHtml(lead.avatarUrl) : null;
    const initials = escapeHtml(getInitials(lead.name));
    const dateText = formatDateTime(lead.lastMessageAt);
    const mediaPreviewHtml = buildMediaPreviewHtml(latestMessage);

    const avatar = safeAvatarUrl
      ? `<img src="${safeAvatarUrl}" alt="${safeName}" class="h-12 w-12 rounded-full object-cover" />`
      : `<div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">${initials}</div>`;

    return `
      <article class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-start gap-3">
          ${avatar}
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-base font-semibold">${safeName}</h2>
            <p class="text-sm text-slate-500">${safePhone}</p>
            <div class="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              ${safeStatus}
            </div>
          </div>
        </div>
        <div class="mt-4 border-t border-slate-100 pt-3">
          <p class="break-words text-sm text-slate-700">${safeMessage || "Sem mensagem"}</p>
          ${mediaPreviewHtml}
          <p class="mt-2 text-xs text-slate-500">Ultima mensagem: ${escapeHtml(dateText)}</p>
        </div>
      </article>
    `;
  });

  leadListEl.innerHTML = cards.join("");
}

function upsertLead(updatedLead) {
  const index = state.leads.findIndex((lead) => lead.id === updatedLead.id);
  if (index >= 0) {
    state.leads[index] = updatedLead;
  } else {
    state.leads.push(updatedLead);
  }
  renderLeads();
}

async function loadInitialLeads() {
  const response = await fetch("/api/leads");
  if (!response.ok) {
    throw new Error(`Erro ao carregar leads (${response.status})`);
  }
  const data = await response.json();
  state.leads = Array.isArray(data.leads) ? data.leads : [];
  renderLeads();
}

function connectEvents() {
  if (state.eventSource) {
    state.eventSource.close();
  }

  const eventSource = new EventSource("/api/events");
  state.eventSource = eventSource;

  eventSource.onopen = () => {
    setStreamStatus(true);
  };

  eventSource.onerror = () => {
    setStreamStatus(false);
  };

  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === "lead.updated" && payload.lead) {
        upsertLead(payload.lead);
      }
    } catch (_err) {
      // Ignore events that are not expected JSON payloads.
    }
  };
}

async function init() {
  setStreamStatus(false);
  setupMediaModalEvents();
  try {
    await loadInitialLeads();
  } catch (error) {
    console.error(error);
  }
  connectEvents();
}

init();
