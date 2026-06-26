type ContaModuleProps = {
  companyName: string;
  currentRole: string;
};

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

export function ContaModule({ companyName, currentRole }: ContaModuleProps) {
  const name = companyName || "Empresa sem nome";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">Empresa</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Informações da empresa ativa na sua sessão.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_20px_35px_-30px_rgba(230,57,120,0.4)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-lg font-semibold text-[var(--primary)]">
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Empresa ativa
            </p>
            <h2 className="truncate text-xl font-semibold text-[var(--foreground)]">{name}</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--line)] bg-zinc-50/60 p-4">
            <p className="text-xs font-medium text-[var(--muted)]">Empresa</p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--foreground)]">
              {companyName || "-"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-zinc-50/60 p-4">
            <p className="text-xs font-medium text-[var(--muted)]">Seu nível de acesso</p>
            <span
              className={`mt-1.5 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${roleBadgeClass(
                currentRole
              )}`}
            >
              {currentRole || "-"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
