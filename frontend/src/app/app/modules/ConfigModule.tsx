type ConfigModuleProps = {
  canManageOperations: boolean;
  companySettingsError: string | null;
  settingsName: string;
  setSettingsName: (value: string) => void;
  settingsPhone: string;
  setSettingsPhone: (value: string) => void;
  settingsDisplayName: string;
  setSettingsDisplayName: (value: string) => void;
  settingsMetaBusinessId: string;
  setSettingsMetaBusinessId: (value: string) => void;
  settingsMetaPhoneId: string;
  setSettingsMetaPhoneId: (value: string) => void;
  saveCompanySettings: () => void | Promise<void>;
  savingCompanySettings: boolean;
  companyMembers: Array<any>;
  updatingMemberId: string | null;
  updateMemberRole: (memberId: string, nextRole: any) => void | Promise<void>;
  editableRoles: string[];
  themeMode: "rosa" | "grafite";
  setThemeMode: (value: "rosa" | "grafite") => void;
};

const fieldClass =
  "h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-[var(--muted)]";

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-xs font-medium text-[var(--foreground)]">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

function roleBadgeClass(role: string) {
  switch (role) {
    case "owner":
      return "border-[var(--primary)]/30 bg-pink-50 text-[var(--primary)]";
    case "admin":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-[var(--line)] bg-zinc-50 text-[var(--muted)]";
  }
}

export function ConfigModule({
  canManageOperations,
  companySettingsError,
  settingsName,
  setSettingsName,
  settingsPhone,
  setSettingsPhone,
  settingsDisplayName,
  setSettingsDisplayName,
  settingsMetaBusinessId,
  setSettingsMetaBusinessId,
  settingsMetaPhoneId,
  setSettingsMetaPhoneId,
  saveCompanySettings,
  savingCompanySettings,
  companyMembers,
  updatingMemberId,
  updateMemberRole,
  editableRoles,
  themeMode,
  setThemeMode,
}: ConfigModuleProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">Configurações</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Gerencie os dados da empresa, a equipe e as suas preferências.
        </p>
      </div>

      {companySettingsError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {companySettingsError}
        </div>
      ) : null}

      {!canManageOperations ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Somente owner/admin podem editar as configurações da empresa.
        </div>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.4)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Dados da empresa</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Nome, número comercial e informações exibidas para os seus clientes.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Nome da empresa">
            <input
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
              placeholder="Ex.: GVG Soluções"
              className={fieldClass}
              disabled={!canManageOperations}
            />
          </Field>
          <Field label="Número comercial">
            <input
              value={settingsPhone}
              onChange={(e) => setSettingsPhone(e.target.value)}
              placeholder="Ex.: +55 11 99999-0000"
              className={fieldClass}
              disabled={!canManageOperations}
            />
          </Field>
          <Field
            label="Nome de exibição no WhatsApp"
            hint="Nome que aparece para o cliente nas conversas."
            className="md:col-span-2"
          >
            <input
              value={settingsDisplayName}
              onChange={(e) => setSettingsDisplayName(e.target.value)}
              placeholder="Ex.: Atendimento GVG"
              className={fieldClass}
              disabled={!canManageOperations}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.4)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Conexão com a Meta</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Identificadores da sua conta no WhatsApp Business para envio de mensagens.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Meta business ID">
            <input
              value={settingsMetaBusinessId}
              onChange={(e) => setSettingsMetaBusinessId(e.target.value)}
              placeholder="Ex.: 1234567890"
              className={fieldClass}
              disabled={!canManageOperations}
            />
          </Field>
          <Field label="Meta phone number ID">
            <input
              value={settingsMetaPhoneId}
              onChange={(e) => setSettingsMetaPhoneId(e.target.value)}
              placeholder="Ex.: 0987654321"
              className={fieldClass}
              disabled={!canManageOperations}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={saveCompanySettings}
            disabled={savingCompanySettings || !canManageOperations}
            className="inline-flex h-10 items-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingCompanySettings ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.4)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Membros e permissões</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Apenas owner/admin podem alterar o papel dos membros.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--line)] bg-zinc-50 px-3 py-1 text-xs font-medium text-[var(--muted)]">
            {companyMembers.length} {companyMembers.length === 1 ? "membro" : "membros"}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {companyMembers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] p-4 text-center text-sm text-[var(--muted)]">
              Nenhum membro encontrado.
            </p>
          ) : (
            companyMembers.map((member) => {
              const isOwner = member.role === "owner";
              const isEditing = updatingMemberId === member.id;
              const name = member.profile?.full_name || "Sem nome";
              const initials = name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part: string) => part[0]?.toUpperCase())
                .join("");
              return (
                <div
                  key={member.id}
                  className="grid gap-3 rounded-xl border border-[var(--line)] p-3 transition hover:border-[var(--primary)]/30 md:grid-cols-[1fr_200px] md:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-sm font-semibold text-[var(--primary)]">
                      {initials || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {member.profile?.phone || "Sem telefone"}
                      </p>
                    </div>
                  </div>
                  {isOwner ? (
                    <span
                      className={`inline-flex h-10 items-center justify-center rounded-xl border px-3 text-xs font-semibold capitalize ${roleBadgeClass(
                        "owner"
                      )}`}
                    >
                      owner
                    </span>
                  ) : (
                    <select
                      value={member.role}
                      disabled={!canManageOperations || isEditing}
                      onChange={(e) => void updateMemberRole(member.id, e.target.value)}
                      className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm capitalize outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-zinc-50"
                    >
                      {editableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.4)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Tema pessoal</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Este ajuste vale apenas para você neste navegador.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(
            [
              { id: "rosa", label: "Rosa", swatch: "bg-[var(--primary)]" },
              { id: "grafite", label: "Grafite", swatch: "bg-zinc-700" },
            ] as const
          ).map((option) => {
            const active = themeMode === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setThemeMode(option.id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-[var(--primary)] bg-pink-50 text-[var(--primary)]"
                    : "border-[var(--line)] bg-white text-[var(--foreground)] hover:border-[var(--primary)]/40"
                }`}
              >
                <span className={`h-4 w-4 rounded-full ${option.swatch}`} />
                {option.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
