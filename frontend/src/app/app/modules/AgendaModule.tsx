type AgendaModuleProps = {
  calendarMonth: Date;
  setCalendarMonth: (value: Date) => void;
  monthLabel: string;
  setShowEventModal: (value: boolean) => void;
  eventsError: string | null;
  upcomingCollapsed: boolean;
  setUpcomingCollapsed: (updater: (prev: boolean) => boolean) => void;
  firstWeekDay: number;
  daysInMonth: number;
  eventsByDay: Record<number, Array<any>>;
  loadingEvents: boolean;
  openDayModal: (day: number) => void;
  upcomingEvents: Array<any>;
  showEventModal: boolean;
  eventTitle: string;
  setEventTitle: (value: string) => void;
  eventStart: string;
  setEventStart: (value: string) => void;
  eventEnd: string;
  setEventEnd: (value: string) => void;
  eventLeadId: string;
  setEventLeadId: (value: string) => void;
  leads: Array<{ id: string; name: string | null; phone: string }>;
  createEvent: () => void | Promise<void>;
  creatingEvent: boolean;
  showDayModal: boolean;
  selectedDay: number | null;
  resetEventForm: () => void;
  setShowDayModal: (value: boolean) => void;
  selectedDayEvents: Array<any>;
  setEditingEventId: (value: string | null) => void;
  startEditEvent: (event: any) => void;
  deleteEvent: (eventId: string) => void | Promise<void>;
  editingEventId: string | null;
  saveEditedEvent: () => void | Promise<void>;
};

export function AgendaModule({
  calendarMonth,
  setCalendarMonth,
  monthLabel,
  setShowEventModal,
  eventsError,
  upcomingCollapsed,
  setUpcomingCollapsed,
  firstWeekDay,
  daysInMonth,
  eventsByDay,
  loadingEvents,
  openDayModal,
  upcomingEvents,
  showEventModal,
  eventTitle,
  setEventTitle,
  eventStart,
  setEventStart,
  eventEnd,
  setEventEnd,
  eventLeadId,
  setEventLeadId,
  leads,
  createEvent,
  creatingEvent,
  showDayModal,
  selectedDay,
  resetEventForm,
  setShowDayModal,
  selectedDayEvents,
  setEditingEventId,
  startEditEvent,
  deleteEvent,
  editingEventId,
  saveEditedEvent,
}: AgendaModuleProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-[180px]">
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">Agenda</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Sua agenda local do CRM.</p>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            className="h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm"
          >
            ←
          </button>
          <p className="min-w-[170px] text-center text-sm font-semibold capitalize text-[var(--foreground)]">
            {monthLabel}
          </p>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            className="h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm"
          >
            →
          </button>
        </div>
        <div className="min-w-[180px] text-right">
          <button
            onClick={() => setShowEventModal(true)}
            className="h-10 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white"
          >
            Novo evento
          </button>
        </div>
      </div>

      {eventsError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {eventsError}
        </div>
      ) : null}

      <div className={`grid gap-4 transition-all duration-300 ease-out ${upcomingCollapsed ? "xl:grid-cols-[1fr_64px]" : "xl:grid-cols-[1fr_320px]"}`}>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--muted)]">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstWeekDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[100px] rounded-xl bg-pink-50/40" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dayEvents = eventsByDay[day] || [];
              return (
                <button
                  key={day}
                  onClick={() => openDayModal(day)}
                  className="min-h-[100px] rounded-xl border border-pink-100 bg-pink-50/50 p-2 text-left transition hover:bg-pink-100/60"
                >
                  <p className="text-xs font-semibold text-[var(--foreground)]">{day}</p>
                  <div className="mt-1 space-y-1">
                    {loadingEvents ? null : dayEvents.slice(0, 2).map((ev) => (
                      <div key={ev.id} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-[var(--foreground)]">
                        {new Date(ev.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 ? (
                      <p className="text-[10px] text-[var(--muted)]">+{dayEvents.length - 2} mais</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-2xl border border-[var(--line)] bg-white p-3 transition-all duration-300 ease-out">
          <button
            onClick={() => setUpcomingCollapsed((prev) => !prev)}
            className="mb-3 inline-flex h-8 w-full items-center justify-center rounded-lg border border-[var(--line)] text-xs"
          >
            {upcomingCollapsed ? "«" : "»"}
          </button>
          {upcomingCollapsed ? (
            <div className="mx-auto text-center text-xs text-[var(--muted)] [writing-mode:vertical-rl] rotate-180">
              Proximos eventos
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Proximos eventos</p>
              <div className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">
                    Sem eventos futuros.
                  </div>
                ) : (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-pink-100 bg-pink-50/60 px-3 py-2">
                      <p className="text-sm font-medium text-[var(--foreground)]">{event.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(event.start_time).toLocaleDateString("pt-BR")}{" "}
                        {new Date(event.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {showEventModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Novo evento</h3>
            <div className="mt-4 space-y-3">
              <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Titulo" className="h-11 w-full rounded-xl border border-[var(--line)] px-3" />
              <input type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3" />
              <input type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3" />
              <select value={eventLeadId} onChange={(e) => setEventLeadId(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm">
                <option value="">Sem lead vinculado</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {(lead.name || "Sem nome") + " - " + lead.phone}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowEventModal(false)} className="h-10 rounded-xl border border-[var(--line)] px-4 text-sm">Cancelar</button>
              <button onClick={createEvent} disabled={creatingEvent} className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70">
                {creatingEvent ? "Salvando..." : "Salvar evento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDayModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">
                Eventos do dia {selectedDay}/{calendarMonth.getMonth() + 1}
              </h3>
              <button onClick={() => { setShowDayModal(false); resetEventForm(); }} className="text-sm text-[var(--muted)]">Fechar</button>
            </div>

            <div className="max-h-[280px] space-y-2 overflow-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Sem eventos neste dia.</span>
                    <button
                      onClick={() => {
                        setEditingEventId("new");
                        const baseDay = selectedDay || 1;
                        const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), baseDay, 9, 0, 0);
                        const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), baseDay, 10, 0, 0);
                        setEventTitle("");
                        setEventStart(start.toISOString().slice(0, 16));
                        setEventEnd(end.toISOString().slice(0, 16));
                        setEventLeadId("");
                      }}
                      className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs text-[var(--foreground)]"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              ) : (
                selectedDayEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-pink-100 bg-pink-50/50 p-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{event.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(event.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {new Date(event.end_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => startEditEvent(event)} className="h-8 rounded-lg border border-[var(--line)] bg-white px-3 text-xs">Editar</button>
                      <button onClick={() => deleteEvent(event.id)} className="h-8 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs text-rose-700">Excluir</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {editingEventId ? (
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                  {editingEventId === "new" ? "Novo evento" : "Editar evento"}
                </p>
                <div className="space-y-2">
                  <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Titulo" className="h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm" />
                  <input type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm" />
                  <input type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm" />
                  <select value={eventLeadId} onChange={(e) => setEventLeadId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--line)] px-3 text-sm">
                    <option value="">Sem lead vinculado</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {(lead.name || "Sem nome") + " - " + lead.phone}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={resetEventForm} className="h-9 rounded-lg border border-[var(--line)] px-3 text-xs">Cancelar</button>
                  <button
                    onClick={editingEventId === "new" ? createEvent : saveEditedEvent}
                    className="h-9 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
