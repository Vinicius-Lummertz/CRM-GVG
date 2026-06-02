import { useEffect, useState, type RefObject } from "react";

type Notebook = {
  id: string;
  title: string;
  description?: string | null;
  color: string;
  updated_at?: string;
};

type Note = {
  id: string;
  company_id?: string;
  notebook_id: string;
  title: string;
  content_json?: Record<string, unknown>;
  content_text?: string | null;
  content_html?: string | null;
  color?: string | null;
  is_pinned?: boolean;
  sort_order?: number;
  deleted_at?: string | null;
  created_at?: string;
  updated_at: string;
};

type NotesModuleProps = {
  startNewNote: () => void;
  canWorkNotes: boolean;
  noteNotebooks: Notebook[];
  saveCurrentNote: () => void;
  savingNote: boolean;
  notesError: string | null;
  loadingNotes: boolean;
  selectedNotebookId: string | null;
  notes: Note[];
  setSelectedNotebookId: (value: string | null) => void;
  selectNote: (note: any | null) => void;
  newNotebookTitle: string;
  setNewNotebookTitle: (value: string) => void;
  notebookColors: string[];
  setNewNotebookColor: (value: string) => void;
  newNotebookColor: string;
  createNotebook: () => void;
  creatingNotebook: boolean;
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
  toggleNotePinned: (note: any) => void | Promise<void>;
  deleteCurrentNote: () => void | Promise<void>;
  noteEditorTitle: string;
  setNoteEditorTitle: (value: string) => void;
  editorRef: RefObject<HTMLDivElement | null>;
  syncEditorContent: () => void;
  noteEditorHtml: string;
  noteEditorText: string;
};

function NotebookIcon({ color }: { color: string }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-inner" style={{ backgroundColor: color }}>
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
        <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5z" />
        <path d="M8 4.5v15M11 8h5M11 11h4" />
      </svg>
    </div>
  );
}

const NOTE_PAGE_HEIGHT = 980;
const NOTE_PAGE_GAP = 28;

export function NotesModule({
  startNewNote,
  canWorkNotes,
  noteNotebooks,
  saveCurrentNote,
  savingNote,
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
  const [visualPageCount, setVisualPageCount] = useState(1);

  function updateVisualPageCount() {
    const editor = editorRef.current;
    if (!editor) {
      setVisualPageCount(1);
      return;
    }

    const nextCount = Math.max(1, Math.ceil(editor.scrollHeight / NOTE_PAGE_HEIGHT));
    setVisualPageCount(nextCount);
  }

  function handleEditorInput() {
    syncEditorContent();
    updateVisualPageCount();
  }

  function openNotebook(notebook: Notebook) {
    setSelectedNotebookId(notebook.id);
    const firstNote = notes.find((note) => note.notebook_id === notebook.id) || null;
    selectNote(firstNote);
  }

  useEffect(() => {
    window.requestAnimationFrame(updateVisualPageCount);
  }, [selectedNoteId, noteEditorHtml]);

  if (!selectedNotebookId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Biblioteca de notas</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Organize suas anotacoes em cadernos independentes.
            </p>
          </div>
          <button
            onClick={() => {
              if (companyId) void loadNotesWorkspace(companyId);
            }}
            className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--foreground)]"
          >
            Atualizar
          </button>
        </div>

        {notesError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {notesError}
          </div>
        ) : null}

        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.35)]">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Criar caderno</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Use cadernos para separar reunioes, follow-ups, ideias e operacao.</p>
              <input
                value={newNotebookTitle}
                onChange={(event) => setNewNotebookTitle(event.target.value)}
                placeholder="Nome do caderno"
                className="mt-3 h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
                disabled={!canWorkNotes}
              />
            </div>
            <div>
              <div className="mb-3 flex gap-2">
                {notebookColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewNotebookColor(color)}
                    title={color}
                    className={`h-8 w-8 rounded-full border-2 ${newNotebookColor === color ? "border-[var(--foreground)]" : "border-white"}`}
                    style={{ backgroundColor: color }}
                    disabled={!canWorkNotes}
                  />
                ))}
              </div>
              <button
                onClick={createNotebook}
                disabled={creatingNotebook || !canWorkNotes}
                className="h-11 w-full rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:opacity-70 md:w-auto"
              >
                {creatingNotebook ? "Criando..." : "Novo caderno"}
              </button>
            </div>
          </div>
        </section>

        {loadingNotes ? (
          <div className="rounded-2xl border border-[var(--line)] bg-white px-5 py-10 text-center text-sm text-[var(--muted)]">
            Carregando biblioteca...
          </div>
        ) : noteNotebooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white px-5 py-16 text-center">
            <p className="text-lg font-semibold text-[var(--foreground)]">Sua biblioteca esta vazia</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Crie o primeiro caderno para comecar a guardar paginas, ideias e registros importantes.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {noteNotebooks.map((notebook) => {
              const notebookNotes = notes.filter((note) => note.notebook_id === notebook.id);
              const latestNote = notebookNotes
                .slice()
                .sort((first, second) => new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime())[0];

              return (
                <button
                  key={notebook.id}
                  onClick={() => openNotebook(notebook)}
                  className="group min-h-[190px] overflow-hidden rounded-2xl border border-[var(--line)] bg-white text-left shadow-[0_22px_42px_-34px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[0_28px_50px_-34px_rgba(230,57,120,0.55)]"
                >
                  <div className="h-3" style={{ backgroundColor: notebook.color }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <NotebookIcon color={notebook.color} />
                      <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                        {notebookNotes.length} paginas
                      </span>
                    </div>
                    <p className="mt-4 line-clamp-2 text-lg font-semibold text-[var(--foreground)]">{notebook.title}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                      {latestNote?.content_text || "Abra o caderno para criar a primeira pagina."}
                    </p>
                    <p className="mt-5 text-xs font-medium text-[var(--primary)] opacity-80 transition group-hover:opacity-100">
                      Abrir caderno
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => {
              setSelectedNotebookId(null);
              selectNote(null);
            }}
            className="mb-3 h-9 rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--muted)]"
          >
            Voltar para biblioteca
          </button>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">{selectedNotebook?.title || "Caderno"}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {totalNotesInSelectedNotebook} paginas neste caderno.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startNewNote}
            disabled={!canWorkNotes}
            className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--foreground)] disabled:opacity-60"
          >
            Nova pagina
          </button>
          <button
            onClick={saveCurrentNote}
            disabled={savingNote || !canWorkNotes}
            className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70"
          >
            {savingNote ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {notesError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {notesError}
        </div>
      ) : null}

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">Paginas</p>
              <p className="text-xs text-[var(--muted)]">{totalNotesInSelectedNotebook} notas</p>
            </div>
            <button
              onClick={() => {
                if (companyId) void loadNotesWorkspace(companyId);
              }}
              className="h-8 rounded-lg border border-[var(--line)] px-3 text-xs text-[var(--muted)]"
            >
              Atualizar
            </button>
          </div>

          <input
            value={noteSearch}
            onChange={(event) => setNoteSearch(event.target.value)}
            placeholder="Buscar paginas..."
            className="mt-4 h-10 w-full rounded-xl border border-[var(--line)] px-3 text-sm"
          />

          <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {sortedNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-sm text-[var(--muted)]">
                Este caderno ainda nao tem paginas.
                <button
                  onClick={startNewNote}
                  className="mt-3 h-9 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white"
                >
                  Criar primeira pagina
                </button>
              </div>
            ) : (
              sortedNotes.map((note, index) => {
                const active = selectedNoteId === note.id;
                return (
                  <button
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-[var(--primary)] bg-pink-50"
                        : "border-[var(--line)] bg-white hover:bg-pink-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-xs font-semibold text-[var(--primary)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">{note.title}</p>
                          <span className="text-xs text-[var(--muted)]">{note.is_pinned ? "Fixada" : ""}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                          {note.content_text || "Sem conteudo"}
                        </p>
                        <p className="mt-2 text-[11px] text-[var(--muted)]">
                          {new Date(note.updated_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#f6f3f4]">
          <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-white/95 px-4 py-3 backdrop-blur">
            <button onClick={() => formatNote("bold")} title="Negrito" className="h-9 w-9 rounded-lg border border-[var(--line)] bg-white text-sm font-bold">B</button>
            <button onClick={() => formatNote("italic")} title="Italico" className="h-9 w-9 rounded-lg border border-[var(--line)] bg-white text-sm italic">I</button>
            <button onClick={() => formatNote("underline")} title="Sublinhado" className="h-9 w-9 rounded-lg border border-[var(--line)] bg-white text-sm underline">U</button>
            <button onClick={() => formatNote("formatBlock", "h2")} title="Titulo" className="h-9 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold">H2</button>
            <button onClick={() => formatNote("insertUnorderedList")} title="Lista" className="h-9 rounded-lg border border-[var(--line)] bg-white px-3 text-sm">Lista</button>
            <button onClick={() => formatNote("insertOrderedList")} title="Lista numerada" className="h-9 w-9 rounded-lg border border-[var(--line)] bg-white text-sm">1.</button>
            <button onClick={() => formatNote("removeFormat")} title="Limpar formato" className="h-9 rounded-lg border border-[var(--line)] bg-white px-3 text-xs">Limpar</button>
            <div className="ml-auto flex gap-2">
              {selectedNote ? (
                <button
                  onClick={() => toggleNotePinned(selectedNote)}
                  className="h-9 rounded-lg border border-[var(--line)] bg-white px-3 text-xs text-[var(--foreground)]"
                >
                  {selectedNote.is_pinned ? "Desfixar" : "Fixar"}
                </button>
              ) : null}
              <button
                onClick={deleteCurrentNote}
                disabled={!selectedNoteId || savingNote}
                className="h-9 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs text-rose-700 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-4 py-8">
            <div className="mx-auto w-full max-w-[820px]">
              <input
                value={noteEditorTitle}
                onChange={(event) => setNoteEditorTitle(event.target.value)}
                placeholder="Titulo da pagina"
                className="mb-5 h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-xl font-semibold text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              />

              <div
                className="note-document-shell"
                style={{
                  minHeight: visualPageCount * NOTE_PAGE_HEIGHT + Math.max(0, visualPageCount - 1) * NOTE_PAGE_GAP,
                }}
              >
                <div className="note-paper-stack" aria-hidden="true">
                  {Array.from({ length: visualPageCount }).map((_, index) => (
                    <div
                      key={index}
                      className="note-paper-page"
                      style={{ top: index * (NOTE_PAGE_HEIGHT + NOTE_PAGE_GAP) }}
                    >
                      <span>{index + 1}</span>
                    </div>
                  ))}
                </div>
                <div
                  key={selectedNoteId || "new-note"}
                  ref={editorRef}
                  contentEditable={canWorkNotes}
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  onBlur={handleEditorInput}
                  dangerouslySetInnerHTML={{ __html: noteEditorHtml || "<p></p>" }}
                  className="note-editor note-document-editor"
                  style={{
                    minHeight: visualPageCount * NOTE_PAGE_HEIGHT + Math.max(0, visualPageCount - 1) * NOTE_PAGE_GAP,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] bg-white px-4 py-3 text-xs text-[var(--muted)]">
            <span>{noteEditorText.length} caracteres</span>
            <span>{visualPageCount} folha{visualPageCount === 1 ? "" : "s"}</span>
            <span>{selectedNote ? `Atualizada em ${new Date(selectedNote.updated_at).toLocaleString("pt-BR")}` : "Pagina ainda nao salva"}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
