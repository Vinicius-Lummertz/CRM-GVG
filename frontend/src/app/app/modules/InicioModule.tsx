function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function Trend({ value }: { value: number }) {
  const rounded = Number.isFinite(value) ? Math.round(value) : 0;
  const up = rounded > 0;
  const down = rounded < 0;
  const color = up ? "text-emerald-600" : down ? "text-rose-600" : "text-[var(--muted)]";
  const arrow = up ? "▲" : down ? "▼" : "•";
  const text = `${rounded > 0 ? "+" : ""}${rounded}%`;

  return <p className={`mt-1 text-xs ${color}`}>{`${arrow} ${rounded === 0 ? "-" : text}`}</p>;
}

function TrendLine({ points }: { points: number[] }) {
  const width = 520;
  const height = 140;
  const padding = 14;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(1, max - min);
  const stepX = (width - padding * 2) / Math.max(1, points.length - 1);

  const normalized = points.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y, value };
  });

  const path = normalized
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full">
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {normalized.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5" />
            <title>{`Dia ${index + 1}: ${Math.round(point.value)}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

type InicioModuleProps = {
  summaryError: string | null;
  loadingSummary: boolean;
  summary: {
    cards: {
      leads_active: { value: number; trend_pct: number };
      messages_sent: { value: number; trend_pct: number };
      proposals_accepted: { value: number; trend_pct: number };
      revenue: { value: number; trend_pct: number };
    };
  } | null;
  leadsTrendPoints: number[];
  revenueTrendPoints: number[];
  upcomingEventsDashboard: Array<{ id: string; title: string; start_time: string }>;
};

export function InicioModule({
  summaryError,
  loadingSummary,
  summary,
  leadsTrendPoints,
  revenueTrendPoints,
  upcomingEventsDashboard,
}: InicioModuleProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">Inicio</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Visao geral da operacao no periodo.
        </p>
      </div>

      {summaryError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {summaryError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Leads ativos",
            value: loadingSummary ? "-" : String(summary?.cards.leads_active.value ?? 0),
            trend: summary?.cards.leads_active.trend_pct ?? 0,
          },
          {
            label: "Mensagens enviadas",
            value: loadingSummary ? "-" : String(summary?.cards.messages_sent.value ?? 0),
            trend: summary?.cards.messages_sent.trend_pct ?? 0,
          },
          {
            label: "Orcamentos fechados",
            value: loadingSummary
              ? "-"
              : String(summary?.cards.proposals_accepted.value ?? 0),
            trend: summary?.cards.proposals_accepted.trend_pct ?? 0,
          },
          {
            label: "Faturamento",
            value: loadingSummary
              ? "-"
              : formatCurrency(summary?.cards.revenue.value ?? 0),
            trend: summary?.cards.revenue.trend_pct ?? 0,
          },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.4)]"
          >
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{card.value}</p>
            <Trend value={card.trend} />
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-medium text-[var(--foreground)]">Leads ao longo do tempo</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Tendencia estimada com base nos ultimos 30 dias.</p>
          <TrendLine points={leadsTrendPoints} />
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <p className="text-sm font-medium text-[var(--foreground)]">Faturamento ao longo do tempo</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Tendencia estimada com base nos ultimos 30 dias.</p>
          <TrendLine points={revenueTrendPoints} />
        </article>

        <article className="rounded-2xl border border-[var(--line)] bg-white p-5 xl:col-span-1">
          <p className="text-sm font-medium text-[var(--foreground)]">Proximos compromissos</p>
          <ul className="mt-4 space-y-3 text-sm text-[var(--foreground)]">
            {upcomingEventsDashboard.length === 0 ? (
              <li className="rounded-lg bg-pink-50 px-3 py-2 text-[var(--muted)]">
                Sem compromissos futuros.
              </li>
            ) : (
              upcomingEventsDashboard.map((event) => (
                <li key={event.id} className="rounded-lg bg-pink-50 px-3 py-2">
                  {new Date(event.start_time).toLocaleDateString("pt-BR")}{" "}
                  {new Date(event.start_time).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  {event.title}
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </div>
  );
}
