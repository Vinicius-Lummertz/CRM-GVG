type LeadOption = {
  id: string;
  name: string | null;
  phone: string;
};

type TaskItem = {
  id: string;
  title: string;
  lead_id?: string | null;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
};

type TasksModuleProps = {
  newTaskTitle: string;
  setNewTaskTitle: (value: string) => void;
  newTaskDueDate: string;
  setNewTaskDueDate: (value: string) => void;
  newTaskLeadId: string;
  setNewTaskLeadId: (value: string) => void;
  leads: LeadOption[];
  createTask: () => void;
  creatingTask: boolean;
  taskSearch: string;
  setTaskSearch: (value: string) => void;
  taskDateAsc: boolean;
  setTaskDateAsc: (updater: (prev: boolean) => boolean) => void;
  tasksError: string | null;
  loadingTasks: boolean;
  pendingTasks: TaskItem[];
  completedTasks: TaskItem[];
  toggleTask: (task: TaskItem) => void | Promise<void>;
  getLeadById: (leadId?: string | null) => LeadOption | null;
};

export function TasksModule({
  newTaskTitle,
  setNewTaskTitle,
  newTaskDueDate,
  setNewTaskDueDate,
  newTaskLeadId,
  setNewTaskLeadId,
  leads,
  createTask,
  creatingTask,
  taskSearch,
  setTaskSearch,
  taskDateAsc,
  setTaskDateAsc,
  tasksError,
  loadingTasks,
  pendingTasks,
  completedTasks,
  toggleTask,
  getLeadById,
}: TasksModuleProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Tarefas</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Lista inteligente para manter rotina e entregas em dia.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.35)]">
        <div className="grid gap-3 md:grid-cols-[1fr_190px_1fr_auto]">
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Nova tarefa..."
            className="h-11 rounded-xl border border-[var(--line)] px-3"
          />
          <input
            type="datetime-local"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
            className="h-11 rounded-xl border border-[var(--line)] px-3"
          />
          <select
            value={newTaskLeadId}
            onChange={(e) => setNewTaskLeadId(e.target.value)}
            className="h-11 rounded-xl border border-[var(--line)] px-3 text-sm"
          >
            <option value="">Sem lead vinculado</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {(lead.name || "Sem nome") + " - " + lead.phone}
              </option>
            ))}
          </select>
          <button
            onClick={createTask}
            disabled={creatingTask}
            className="h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {creatingTask ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={taskSearch}
          onChange={(e) => setTaskSearch(e.target.value)}
          placeholder="Buscar por titulo, nome do lead ou telefone..."
          className="h-11 rounded-xl border border-[var(--line)] bg-white px-3"
        />
        <button
          onClick={() => setTaskDateAsc((prev) => !prev)}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--foreground)]"
        >
          <span>{`Data: ${taskDateAsc ? "asc" : "desc"}`}</span>
          <span
            className={`inline-block transition-transform duration-200 ${
              taskDateAsc ? "rotate-0" : "rotate-180"
            }`}
          >
            ↑
          </span>
        </button>
      </div>

      {tasksError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {tasksError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Pendentes</p>
          <div className="space-y-2">
            {loadingTasks ? (
              <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">Carregando...</div>
            ) : pendingTasks.length === 0 ? (
              <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">Sem tasks pendentes.</div>
            ) : (
              pendingTasks.map((task) => (
                  <label key={task.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-pink-100 bg-pink-50/60 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={() => toggleTask(task)}
                      className="mt-1 h-4 w-4 accent-[var(--primary)]"
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {task.due_date ? new Date(task.due_date).toLocaleString("pt-BR") : "-"}
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Lead: {getLeadById(task.lead_id)?.name || "-"} {getLeadById(task.lead_id)?.phone ? `(${getLeadById(task.lead_id)?.phone})` : ""}
                      </p>
                    </div>
                  </label>
                ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Concluidas</p>
          <div className="space-y-2">
            {completedTasks.length === 0 ? (
              <div className="rounded-xl bg-pink-50 px-3 py-4 text-sm text-[var(--muted)]">Sem tasks concluidas.</div>
            ) : (
              completedTasks.map((task) => (
                  <label key={task.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-pink-100 bg-white px-3 py-3">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={() => toggleTask(task)}
                      className="mt-1 h-4 w-4 accent-[var(--primary)]"
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--muted)] line-through">{task.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {task.due_date ? new Date(task.due_date).toLocaleString("pt-BR") : "-"}
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Lead: {getLeadById(task.lead_id)?.name || "-"} {getLeadById(task.lead_id)?.phone ? `(${getLeadById(task.lead_id)?.phone})` : ""}
                      </p>
                    </div>
                  </label>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
