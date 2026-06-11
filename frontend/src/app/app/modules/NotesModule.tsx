import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type Notebook = {
  id: string;
  title: string;
  description?: string | null;
  color: string;
  updated_at?: string;
};

// Espelha o tipo NoteItem da pagina (campos obrigatorios) para que as
// callbacks tipadas do caller sejam atribuiveis as props deste modulo.
type Note = {
  id: string;
  company_id: string;
  notebook_id: string;
  title: string;
  content_json: Record<string, unknown>;
  content_text: string;
  content_html: string;
  color: string | null;
  is_pinned: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type NotesModuleProps = {
  startNewNote: () => void;
  canWorkNotes: boolean;
  noteNotebooks: Notebook[];
  savingNote: boolean;
  noteDirty: boolean;
  noteSaveStatus: SaveStatus;
  notesError: string | null;
  loadingNotes: boolean;
  selectedNotebookId: string | null;
  notes: Note[];
  setSelectedNotebookId: (value: string | null) => void;
  selectNote: (note: Note | null) => void;
  newNotebookTitle: string;
  setNewNotebookTitle: (value: string) => void;
  notebookColors: string[];
  setNewNotebookColor: (value: string) => void;
  newNotebookColor: string;
  createNotebook: () => void;
  creatingNotebook: boolean;
  showNotebookModal: boolean;
  setShowNotebookModal: (value: boolean) => void;
  flushPendingSave: () => void | Promise<void>;
  selectedNotebook: Notebook | null;
  totalNotesInSelectedNotebook: number;
  companyId: string | null;
  loadNotesWorkspace: (companyId: string) => void | Promise<void>;
  noteSearch: string;
  setNoteSearch: (value: string) => void;
  sortedNotes: Note[];
  selectedNoteId: string | null;
  formatNote: (command: string, value?: string) => void;
  selectedNote: Note | null;
  toggleNotePinned: (note: Note) => void | Promise<void>;
  deleteCurrentNote: () => void | Promise<void>;
  noteEditorTitle: string;
  setNoteEditorTitle: (value: string) => void;
  editorRef: RefObject<HTMLDivElement | null>;
  syncEditorContent: () => void;
  noteEditorHtml: string;
  noteEditorText: string;
};

const RELATIVE_TIME = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

type ToolbarButton =
  | { kind: "command"; command: string; value?: string; label: string; title: string; className?: string }
  | { kind: "separator" };

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { kind: "command", command: "bold", label: "B", title: "Negrito (Ctrl+B)", className: "font-bold" },
  { kind: "command", command: "italic", label: "I", title: "Itálico (Ctrl+I)", className: "italic" },
  { kind: "command", command: "underline", label: "U", title: "Sublinhado (Ctrl+U)", className: "underline" },
  { kind: "separator" },
  { kind: "command", command: "formatBlock", value: "h2", label: "Título", title: "Título de seção" },
  { kind: "command", command: "formatBlock", value: "p", label: "Texto", title: "Parágrafo normal" },
  { kind: "separator" },
  { kind: "command", command: "insertUnorderedList", label: "• Lista", title: "Lista com marcadores" },
  { kind: "command", command: "insertOrderedList", label: "1. Lista", title: "Lista numerada" },
  { kind: "separator" },
  { kind: "command", command: "removeFormat", label: "Limpar", title: "Remover formatação" },
];

function SaveIndicator({ status, dirty, savingNote }: { status: SaveStatus; dirty: boolean; savingNote: boolean }) {
  if (savingNote || status === "saving") {
    return <span className="flex items-center gap-1.5 text-[var(--muted)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" /> Salvando…</span>;
  }
  if (status === "error") {
    return <span className="flex items-center gap-1.5 text-rose-600"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Erro ao salvar</span>;
  }
  if (dirty) {
    return <span className="flex items-center gap-1.5 text-amber-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Salvando em instantes…</span>;
  }
  if (status === "saved") {
    return <span className="flex items-center gap-1.5 text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Salvo automaticamente</span>;
  }
  return <span className="text-[var(--muted)]">Salvamento automático ativado</span>;
}

function NotebookModal({
  open,
  onClose,
  newNotebookTitle,
  setNewNotebookTitle,
  notebookColors,
  newNotebookColor,
  setNewNotebookColor,
  createNotebook,
  creatingNotebook,
  canWorkNotes,
}: {
  open: boolean;
  onClose: () => void;
  newNotebookTitle: string;
  setNewNotebookTitle: (value: string) => void;
  notebookColors: string[];
  newNotebookColor: string;
  setNewNotebookColor: (value: string) => void;
  createNotebook: () => void;
  creatingNotebook: boolean;
  canWorkNotes: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Novo caderno</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Separe reuniões, ideias e operação em cadernos distintos.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--muted)] transition hover:bg-pink-50" aria-label="Fechar">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <label className="mt-5 block text-xs font-medium text-[var(--muted)]">Nome</label>
        <input
          autoFocus
          value={newNotebookTitle}
          onChange={(event) => setNewNotebookTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canWorkNotes && !creatingNotebook && newNotebookTitle.trim()) createNotebook();
            if (event.key === "Escape") onClose();
          }}
          placeholder="Ex.: Reuniões comerciais"
          className="mt-1.5 h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--primary)]"
          disabled={!canWorkNotes}
        />

        <label className="mt-4 block text-xs font-medium text-[var(--muted)]">Cor</label>
        <div className="mt-1.5 flex gap-2">
          {notebookColors.map((color) => (
            <button
              key={color}
              onClick={() => setNewNotebookColor(color)}
              title={color}
              className={`h-9 w-9 rounded-full border-2 transition ${newNotebookColor === color ? "scale-110 border-[var(--foreground)]" : "border-white hover:scale-105"}`}
              style={{ backgroundColor: color }}
              disabled={!canWorkNotes}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition hover:bg-pink-50">
            Cancelar
          </button>
          <button
            onClick={createNotebook}
            disabled={creatingNotebook || !canWorkNotes || !newNotebookTitle.trim()}
            className="h-10 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {creatingNotebook ? "Criando..." : "Criar caderno"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotebookCard({ notebook, notesCount, latestText, onOpen }: { notebook: Notebook; notesCount: number; latestText: string; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white text-left shadow-[0_22px_42px_-34px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-[0_30px_55px_-32px_rgba(230,57,120,0.55)]"
    >
      {/* lombada colorida */}
      <span className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: notebook.color }} />
      {/* glow suave no hover */}
      <span
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition group-hover:opacity-30"
        style={{ backgroundColor: notebook.color }}
      />
      <div className="flex flex-1 flex-col p-5 pl-6">
        <div className="flex items-center justify-between">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white shadow-inner"
            style={{ backgroundColor: notebook.color }}
          >
            {notebook.title.slice(0, 1).toUpperCase()}
          </span>
          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
            {notesCount} {notesCount === 1 ? "página" : "páginas"}
          </span>
        </div>
        <p className="mt-4 line-clamp-2 text-lg font-semibold text-[var(--foreground)]">{notebook.title}</p>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-[var(--muted)]">
          {latestText || "Abra o caderno para criar a primeira página."}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-dashed border-[var(--line)] pt-3">
          <span className="text-xs text-[var(--muted)]">{RELATIVE_TIME(notebook.updated_at) || "Novo"}</span>
          <span className="text-xs font-medium text-[var(--primary)] opacity-70 transition group-hover:opacity-100">Abrir →</span>
        </div>
      </div>
    </button>
  );
}

export function NotesModule({
  startNewNote,
  canWorkNotes,
  noteNotebooks,
  savingNote,
  noteDirty,
  noteSaveStatus,
  notesError,
  loadingNotes,
  selectedNotebookId,
  notes,
  setSelectedNotebookId,
  selectNote,
  newNotebookTitle,
  setNewNotebookTitle,
  notebookColors,
  setNewNotebookColor,
  newNotebookColor,
  createNotebook,
  creatingNotebook,
  showNotebookModal,
  setShowNotebookModal,
  flushPendingSave,
  selectedNotebook,
  totalNotesInSelectedNotebook,
  companyId,
  loadNotesWorkspace,
  noteSearch,
  setNoteSearch,
  sortedNotes,
  selectedNoteId,
  formatNote,
  selectedNote,
  toggleNotePinned,
  deleteCurrentNote,
  noteEditorTitle,
  setNoteEditorTitle,
  editorRef,
  syncEditorContent,
  noteEditorHtml,
  noteEditorText,
}: NotesModuleProps) {
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const lastSyncedNoteIdRef = useRef<string | null>(null);

  const refreshActiveFormats = useCallback(() => {
    if (typeof document === "undefined") return;
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      /* queryCommandState pode falhar fora de foco — ignora */
    }
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshActiveFormats);
    return () => document.removeEventListener("selectionchange", refreshActiveFormats);
  }, [refreshActiveFormats]);

  // Sincroniza o innerHTML do editor APENAS em troca explicita de nota
  // (marcada com "__force__" antes de chamar selectNote) ou na montagem.
  // NUNCA sincroniza na transicao null -> id (nota recem-criada pelo auto-save),
  // pois isso apagaria o que o usuario digitou enquanto o POST estava em voo.
  // Nao depende de noteEditorHtml a cada tecla = cursor estavel ao digitar.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // So sincroniza quando uma selecao EXPLICITA pediu (abrir caderno / clicar
    // numa pagina marcam "__force__"). Transicoes automaticas (null -> id da
    // nota recem-criada) nunca tocam o editor, preservando o texto digitado.
    if (lastSyncedNoteIdRef.current !== "__force__") {
      lastSyncedNoteIdRef.current = selectedNoteId;
      return;
    }
    lastSyncedNoteIdRef.current = selectedNoteId;
    editor.innerHTML = noteEditorHtml || "<p></p>";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId, selectedNotebookId]);

  function handleEditorInput() {
    syncEditorContent();
    refreshActiveFormats();
  }

  function handleToolbarClick(button: Extract<ToolbarButton, { kind: "command" }>) {
    formatNote(button.command, button.value);
    refreshActiveFormats();
  }

  async function openNotebook(notebook: Notebook) {
    await flushPendingSave();
    setSelectedNotebookId(notebook.id);
    const firstNote = notes.find((note) => note.notebook_id === notebook.id) || null;
    lastSyncedNoteIdRef.current = "__force__"; // forca o resync ao abrir
    selectNote(firstNote);
  }

  async function handleSelectNote(note: Note) {
    if (note.id === selectedNoteId) return;
    await flushPendingSave();
    lastSyncedNoteIdRef.current = "__force__";
    selectNote(note);
  }

  async function handleBackToLibrary() {
    await flushPendingSave();
    setSelectedNotebookId(null);
    selectNote(null);
  }

  const modal = (
    <NotebookModal
      open={showNotebookModal}
      onClose={() => setShowNotebookModal(false)}
      newNotebookTitle={newNotebookTitle}
      setNewNotebookTitle={setNewNotebookTitle}
      notebookColors={notebookColors}
      newNotebookColor={newNotebookColor}
      setNewNotebookColor={setNewNotebookColor}
      createNotebook={createNotebook}
      creatingNotebook={creatingNotebook}
      canWorkNotes={canWorkNotes}
    />
  );

  // ---- Biblioteca (sem caderno selecionado) ----
  if (!selectedNotebookId) {
    return (
      <div className="space-y-6">
        {modal}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Biblioteca de notas</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Organize suas anotações em cadernos independentes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (companyId) void loadNotesWorkspace(companyId);
              }}
              className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition hover:bg-pink-50"
            >
              Atualizar
            </button>
            <button
              onClick={() => setShowNotebookModal(true)}
              disabled={!canWorkNotes}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
              Criar caderno
            </button>
          </div>
        </div>

        {notesError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{notesError}</div>
        ) : null}

        {loadingNotes ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="min-h-[200px] animate-pulse rounded-2xl border border-[var(--line)] bg-white p-5">
                <div className="h-11 w-11 rounded-xl bg-pink-100" />
                <div className="mt-4 h-4 w-2/3 rounded bg-pink-100" />
                <div className="mt-3 h-3 w-full rounded bg-pink-50" />
              </div>
            ))}
          </div>
        ) : noteNotebooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white px-5 py-16 text-center">
            <p className="text-lg font-semibold text-[var(--foreground)]">Sua biblioteca está vazia</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Crie o primeiro caderno para começar a guardar páginas, ideias e registros importantes.
            </p>
            <button
              onClick={() => setShowNotebookModal(true)}
              disabled={!canWorkNotes}
              className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
            >
              Criar primeiro caderno
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {noteNotebooks.map((notebook) => {
              const notebookNotes = notes.filter((note) => note.notebook_id === notebook.id);
              const latestNote = notebookNotes
                .slice()
                .sort((first, second) => new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime())[0];
              return (
                <NotebookCard
                  key={notebook.id}
                  notebook={notebook}
                  notesCount={notebookNotes.length}
                  latestText={latestNote?.content_text || ""}
                  onOpen={() => openNotebook(notebook)}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---- Caderno aberto (lista + editor) ----
  return (
    <div className="space-y-5">
      {modal}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={handleBackToLibrary}
            className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--muted)] transition hover:bg-pink-50"
          >
            ← Biblioteca
          </button>
          <div className="flex items-center gap-2.5">
            {selectedNotebook ? (
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedNotebook.color }} />
            ) : null}
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">{selectedNotebook?.title || "Caderno"}</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {totalNotesInSelectedNotebook} {totalNotesInSelectedNotebook === 1 ? "página" : "páginas"} neste caderno.
          </p>
        </div>
        <button
          onClick={startNewNote}
          disabled={!canWorkNotes}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
          Nova página
        </button>
      </div>

      {notesError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{notesError}</div>
      ) : null}

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[300px_1fr]">
        <aside className="flex flex-col rounded-2xl border border-[var(--line)] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">Páginas</p>
              <p className="text-xs text-[var(--muted)]">{totalNotesInSelectedNotebook} notas</p>
            </div>
            <button
              onClick={() => {
                if (companyId) void loadNotesWorkspace(companyId);
              }}
              className="h-8 rounded-lg border border-[var(--line)] px-3 text-xs text-[var(--muted)] transition hover:bg-pink-50"
            >
              Atualizar
            </button>
          </div>

          <div className="relative mt-4">
            <input
              value={noteSearch}
              onChange={(event) => setNoteSearch(event.target.value)}
              placeholder="Buscar páginas..."
              className="h-10 w-full rounded-xl border border-[var(--line)] pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]"
            />
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-[var(--muted)]" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
          </div>

          <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
            {sortedNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-sm text-[var(--muted)]">
                {noteSearch.trim() ? "Nenhuma página encontrada." : "Crie uma página com “Nova página”."}
              </div>
            ) : (
              sortedNotes.map((note) => {
                const active = selectedNoteId === note.id;
                return (
                  <button
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`group w-full rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-[var(--primary)] bg-pink-50 shadow-[0_10px_25px_-20px_rgba(230,57,120,0.6)]"
                        : "border-[var(--line)] bg-white hover:border-pink-200 hover:bg-pink-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">{note.title || "Sem título"}</p>
                      {note.is_pinned ? (
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-[var(--primary)]" aria-label="Fixada">
                          <path d="M14 2l8 8-5 1-4 4-1 6-3-3-5 5-1-1 5-5-3-3 6-1 4-4z" />
                        </svg>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                      {note.content_text || "Sem conteúdo"}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--muted)]">{RELATIVE_TIME(note.updated_at)}</p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
          <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b border-[var(--line)] bg-white/95 px-3 py-2.5 backdrop-blur">
            {TOOLBAR_BUTTONS.map((button, index) => {
              if (button.kind === "separator") {
                return <span key={`sep-${index}`} className="mx-1 h-6 w-px bg-[var(--line)]" />;
              }
              const isActive = activeFormats[button.command];
              return (
                <button
                  key={`${button.command}-${button.value ?? ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleToolbarClick(button)}
                  title={button.title}
                  disabled={!canWorkNotes}
                  className={`h-9 rounded-lg border px-2.5 text-sm transition disabled:opacity-50 ${button.className ?? ""} ${
                    isActive
                      ? "border-[var(--primary)] bg-pink-50 text-[var(--primary)]"
                      : "border-[var(--line)] bg-white text-[var(--foreground)] hover:bg-pink-50/50"
                  }`}
                >
                  {button.label}
                </button>
              );
            })}
            <div className="ml-auto flex gap-1.5">
              {selectedNote ? (
                <button
                  onClick={() => toggleNotePinned(selectedNote)}
                  disabled={!canWorkNotes}
                  className="h-9 rounded-lg border border-[var(--line)] bg-white px-3 text-xs text-[var(--foreground)] transition hover:bg-pink-50 disabled:opacity-50"
                >
                  {selectedNote.is_pinned ? "Desfixar" : "Fixar"}
                </button>
              ) : null}
              <button
                onClick={deleteCurrentNote}
                disabled={!selectedNoteId || savingNote || !canWorkNotes}
                className="h-9 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#faf8f9] px-4 py-8">
            <div className="mx-auto w-full max-w-[760px]">
              <input
                value={noteEditorTitle}
                onChange={(event) => setNoteEditorTitle(event.target.value)}
                placeholder="Título da página"
                disabled={!canWorkNotes}
                className="mb-4 w-full border-0 bg-transparent text-3xl font-bold text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/50"
              />
              <div className="rounded-2xl border border-[var(--line)] bg-white p-8 shadow-[0_24px_60px_-44px_rgba(42,27,36,0.4)] sm:p-10">
                {/* Editor NAO-controlado: o innerHTML so e setado no useEffect de
                    troca de nota. Sem dangerouslySetInnerHTML por render = cursor estavel. */}
                <div
                  ref={editorRef}
                  contentEditable={canWorkNotes}
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  onBlur={handleEditorInput}
                  onKeyUp={refreshActiveFormats}
                  onMouseUp={refreshActiveFormats}
                  className="note-editor min-h-[460px] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] bg-white px-4 py-3 text-xs text-[var(--muted)]">
            <SaveIndicator status={noteSaveStatus} dirty={noteDirty} savingNote={savingNote} />
            <div className="flex items-center gap-4">
              <span>{noteEditorText.length} caracteres</span>
              <span>{selectedNote ? `Atualizada ${RELATIVE_TIME(selectedNote.updated_at)}` : "Página ainda não salva"}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
