type CompanyOnboardingProps = {
  companyId: string | null;
  newCompanyName: string;
  setNewCompanyName: (value: string) => void;
  newCompanyPhone: string;
  setNewCompanyPhone: (value: string) => void;
  companyOnboardingError: string | null;
  createCompanyOnboarding: () => void | Promise<void>;
  creatingCompany: boolean;
};

export function CompanyOnboarding({
  companyId,
  newCompanyName,
  setNewCompanyName,
  newCompanyPhone,
  setNewCompanyPhone,
  companyOnboardingError,
  createCompanyOnboarding,
  creatingCompany,
}: CompanyOnboardingProps) {
  if (companyId) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-xl font-semibold text-amber-900">Voce ainda nao esta vinculado a uma empresa</h2>
      <p className="mt-1 text-sm text-amber-800">
        O chat e os demais modulos operacionais precisam de uma empresa ativa. Crie sua empresa para continuar.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={newCompanyName}
          onChange={(e) => setNewCompanyName(e.target.value)}
          placeholder="Nome da empresa"
          className="h-11 rounded-xl border border-amber-200 bg-white px-3"
        />
        <input
          value={newCompanyPhone}
          onChange={(e) => setNewCompanyPhone(e.target.value)}
          placeholder="+55 11 99999-9999"
          className="h-11 rounded-xl border border-amber-200 bg-white px-3"
        />
      </div>
      {companyOnboardingError ? (
        <p className="mt-3 text-sm text-rose-700">{companyOnboardingError}</p>
      ) : null}
      <button
        onClick={createCompanyOnboarding}
        disabled={creatingCompany}
        className="mt-4 h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70"
      >
        {creatingCompany ? "Criando empresa..." : "Criar minha empresa"}
      </button>
    </div>
  );
}
