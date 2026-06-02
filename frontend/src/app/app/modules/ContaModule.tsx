type ContaModuleProps = {
  companyName: string;
  currentRole: string;
};

export function ContaModule({ companyName, currentRole }: ContaModuleProps) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
      <h2 className="text-2xl font-semibold text-[var(--foreground)]">Empresa</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Empresa ativa: <span className="font-semibold text-[var(--foreground)]">{companyName || "-"}</span>
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Seu nivel: <span className="font-semibold text-[var(--foreground)]">{currentRole}</span>
      </p>
    </div>
  );
}
