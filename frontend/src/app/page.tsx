export default function Home() {
  return (
    <main className="hero-glow min-h-screen w-full">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-12 md:grid-cols-2 md:px-10 lg:px-14">
        <div className="space-y-7">
          <p className="fade-up inline-flex items-center rounded-full border border-[var(--line)] bg-white px-4 py-1 text-xs font-semibold tracking-[0.2em] text-[var(--primary)] uppercase">
            CRM GVG
          </p>
          <h1 className="fade-up-delay text-4xl font-semibold leading-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
            Organize seus clientes e feche mais sem bagunca.
          </h1>
          <p className="fade-up-delay-2 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Quer organizar melhor seus clientes, aumentar sua taxa de fechamento,
            manter rotina e tarefas alinhadas e simplificar a comunicação via
            WhatsApp? Nossa plataforma entrega isso de forma clara, visual e
            prática.
          </p>
          <div className="fade-up-delay-2 pt-2">
            <a
              href="/otp"
              className="inline-flex h-13 items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-base font-semibold text-white transition hover:bg-[var(--primary-strong)]"
            >
              Quero começar
            </a>
          </div>
        </div>

        <div className="fade-up-delay-2">
          <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_20px_55px_-30px_rgba(230,57,120,0.45)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--muted)]">
                Preview da plataforma
              </span>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-[var(--primary)]">
                Em breve: prints reais
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="h-36 rounded-2xl border border-dashed border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4 text-sm text-[var(--muted)]">
                Placeholder: Kanban
              </div>
              <div className="h-36 rounded-2xl border border-dashed border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4 text-sm text-[var(--muted)]">
                Placeholder: Chat
              </div>
              <div className="h-36 rounded-2xl border border-dashed border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4 text-sm text-[var(--muted)]">
                Placeholder: Agenda
              </div>
              <div className="h-36 rounded-2xl border border-dashed border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4 text-sm text-[var(--muted)]">
                Placeholder: Tasks
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="comecar" className="px-6 pb-16 md:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl rounded-3xl border border-[var(--line)] bg-white p-7 text-center shadow-[0_18px_48px_-36px_rgba(230,57,120,0.65)]">
          <h2 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            Tudo pronto para começar?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted)]">
            Entre com seu número pessoal, receba o OTP e explore o sistema em
            poucos minutos.
          </p>
          <a
            className="mx-auto mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-base font-semibold text-white transition hover:bg-[var(--primary-strong)]"
            href="/otp"
          >
            Quero começar
          </a>
        </div>
      </section>
    </main>
  );
}
