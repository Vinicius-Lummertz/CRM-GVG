import { KANBAN_COLUMNS } from "../shared";

type KanbanModuleProps = {
  leadsError: string | null;
  loadingLeads: boolean;
  leadsByColumn: Record<string, Array<{ id: string; name: string | null; phone: string }>>;
  moveLead: (leadId: string, targetColumnId: string) => void;
  showLeadModal: boolean;
  setShowLeadModal: (value: boolean) => void;
  leadName: string;
  setLeadName: (value: string) => void;
  leadPhone: string;
  setLeadPhone: (value: string) => void;
  createLeadManually: () => void;
  creatingLead: boolean;
};

export function KanbanModule({
  leadsError,
  loadingLeads,
  leadsByColumn,
  moveLead,
  showLeadModal,
  setShowLeadModal,
  leadName,
  setLeadName,
  leadPhone,
  setLeadPhone,
  createLeadManually,
  creatingLead,
}: KanbanModuleProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Kanban</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Arraste os cards para mover os leads entre etapas.
        </p>
      </div>
      {leadsError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {leadsError}
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((column) => (
          <div
            key={column.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const leadId = event.dataTransfer.getData("text/lead-id");
              if (leadId) moveLead(leadId, column.id);
            }}
            className="min-h-[480px] rounded-2xl border border-[var(--line)] bg-white p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">{column.label}</p>
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                {loadingLeads ? "-" : leadsByColumn[column.id]?.length || 0}
              </span>
            </div>
            <div className="space-y-3">
              {(leadsByColumn[column.id] || []).map((lead) => (
                <article
                  key={lead.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/lead-id", lead.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className="cursor-grab rounded-xl border border-pink-100 bg-pink-50/70 p-3 active:cursor-grabbing"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {lead.name || "Sem nome"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{lead.phone || "-"}</p>
                </article>
              ))}
              {!loadingLeads && (leadsByColumn[column.id]?.length || 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-pink-200 px-3 py-5 text-center text-xs text-[var(--muted)]">
                  Sem leads nesta etapa.
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => setShowLeadModal(true)}
        className="fixed right-8 bottom-8 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-2xl font-semibold text-white shadow-[0_18px_35px_-18px_rgba(230,57,120,0.8)]"
        aria-label="Adicionar lead"
      >
        +
      </button>

      {showLeadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Novo lead</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Adicione um lead manualmente ao Kanban.
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Nome"
                className="h-11 w-full rounded-xl border border-[var(--line)] px-3"
              />
              <input
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                placeholder="+55..."
                className="h-11 w-full rounded-xl border border-[var(--line)] px-3"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowLeadModal(false)}
                className="h-10 rounded-xl border border-[var(--line)] px-4 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={createLeadManually}
                disabled={creatingLead}
                className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70"
              >
                {creatingLead ? "Salvando..." : "Salvar lead"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
