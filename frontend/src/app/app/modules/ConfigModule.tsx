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
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Configuracoes da Empresa</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ajuste nome da empresa, numero comercial e dados da conexao com a Meta.
        </p>
        {!canManageOperations ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Somente owner/admin podem editar estas configuracoes.
          </p>
        ) : null}
        {companySettingsError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {companySettingsError}
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input value={settingsName} onChange={(e) => setSettingsName(e.target.value)} placeholder="Nome da empresa" className="h-11 rounded-xl border border-[var(--line)] px-3" disabled={!canManageOperations} />
          <input value={settingsPhone} onChange={(e) => setSettingsPhone(e.target.value)} placeholder="Numero comercial" className="h-11 rounded-xl border border-[var(--line)] px-3" disabled={!canManageOperations} />
          <input value={settingsDisplayName} onChange={(e) => setSettingsDisplayName(e.target.value)} placeholder="Nome de exibicao no WhatsApp" className="h-11 rounded-xl border border-[var(--line)] px-3" disabled={!canManageOperations} />
          <input value={settingsMetaBusinessId} onChange={(e) => setSettingsMetaBusinessId(e.target.value)} placeholder="Meta business id" className="h-11 rounded-xl border border-[var(--line)] px-3" disabled={!canManageOperations} />
          <input value={settingsMetaPhoneId} onChange={(e) => setSettingsMetaPhoneId(e.target.value)} placeholder="Meta phone number id" className="h-11 rounded-xl border border-[var(--line)] px-3 md:col-span-2" disabled={!canManageOperations} />
        </div>
        <button onClick={saveCompanySettings} disabled={savingCompanySettings || !canManageOperations} className="mt-4 h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70">
          {savingCompanySettings ? "Salvando..." : "Salvar configuracoes"}
        </button>
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Membros e permissoes</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Apenas owner/admin podem alterar o papel dos membros.
        </p>
        <div className="mt-4 space-y-2">
          {companyMembers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] p-3 text-sm text-[var(--muted)]">
              Nenhum membro encontrado.
            </p>
          ) : (
            companyMembers.map((member) => {
              const isOwner = member.role === "owner";
              const isEditing = updatingMemberId === member.id;
              return (
                <div key={member.id} className="grid gap-2 rounded-xl border border-[var(--line)] p-3 md:grid-cols-[1fr_220px] md:items-center">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {member.profile?.full_name || "Sem nome"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{member.profile?.phone || "-"}</p>
                  </div>
                  <select
                    value={member.role}
                    disabled={!canManageOperations || isOwner || isEditing}
                    onChange={(e) => void updateMemberRole(member.id, e.target.value)}
                    className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm disabled:bg-zinc-100"
                  >
                    {isOwner ? (
                      <option value="owner">owner</option>
                    ) : (
                      editableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Tema pessoal</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Este ajuste vale apenas para voce neste navegador.</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setThemeMode("rosa")} className={`h-10 rounded-xl border px-4 text-sm ${themeMode === "rosa" ? "border-[var(--primary)] bg-pink-50 text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--foreground)]"}`}>Rosa</button>
          <button onClick={() => setThemeMode("grafite")} className={`h-10 rounded-xl border px-4 text-sm ${themeMode === "grafite" ? "border-[var(--primary)] bg-pink-50 text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--foreground)]"}`}>Grafite</button>
        </div>
      </div>
    </div>
  );
}
