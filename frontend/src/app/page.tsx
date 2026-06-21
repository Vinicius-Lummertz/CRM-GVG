import Image from "next/image";

import DashImg from "../../public/screens/Dash.png";
import ChatImg from "../../public/screens/Chat.png";
import AgendaImg from "../../public/screens/Agenda.png";
import LeadsImg from "../../public/screens/Leads.png";

type IconProps = { className?: string };

function DashboardIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function LeadsIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="5" height="13" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="9" rx="1.5" />
      <rect x="16" y="4" width="5" height="16" rx="1.5" />
    </svg>
  );
}

function ChatIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20.5l1.5-5.6A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8.5 11h7M8.5 14h4.5" />
    </svg>
  );
}

function AgendaIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

const features = [
  {
    image: DashImg,
    alt: "Dashboard do CRM GVG",
    Icon: DashboardIcon,
    title: "Dashboard",
    description:
      "Acompanhe os números do seu negócio em um só lugar: clientes, conversas e tarefas com uma visão clara e visual do que importa.",
  },
  {
    image: LeadsImg,
    alt: "Quadro de leads do CRM GVG",
    Icon: LeadsIcon,
    title: "Leads & Kanban",
    description:
      "Organize seus contatos por etapa do funil e arraste cada lead pelo caminho até o fechamento, sem perder ninguém pelo caminho.",
  },
  {
    image: ChatImg,
    alt: "Chat integrado ao WhatsApp do CRM GVG",
    Icon: ChatIcon,
    title: "Chat WhatsApp",
    description:
      "Converse com seus clientes direto da plataforma, envie arquivos e mídias e mantenha todo o histórico centralizado.",
  },
  {
    image: AgendaImg,
    alt: "Agenda do CRM GVG",
    Icon: AgendaIcon,
    title: "Agenda & Tarefas",
    description:
      "Mantenha rotina e compromissos alinhados, com lembretes e tarefas conectados aos seus clientes e negociações.",
  },
];

export default function Home() {
  return (
    <main className="hero-glow min-h-screen w-full">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-12 md:grid-cols-[0.85fr_1.15fr] md:px-10 lg:px-14">
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
                Prints reais
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-8 text-center shadow-sm"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 text-[var(--primary)]">
                    <feature.Icon className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {feature.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-4 md:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center rounded-full border border-[var(--line)] bg-white px-4 py-1 text-xs font-semibold tracking-[0.2em] text-[var(--primary)] uppercase">
              Conheça por dentro
            </p>
            <h2 className="mt-5 text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl">
              Tudo que você precisa para vender mais, em um só lugar
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Do primeiro contato ao fechamento, o CRM GVG reúne seus clientes,
              conversas, agenda e tarefas em uma experiência simples e visual.
            </p>
          </div>

          <div className="mt-14 space-y-16 md:space-y-24">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="grid items-center gap-8 md:grid-cols-2 md:gap-12"
              >
                <div className={index % 2 === 1 ? "md:order-2" : undefined}>
                  <span className="inline-flex items-center rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--primary)] uppercase">
                    {feature.title}
                  </span>
                  <h3 className="mt-4 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                    {feature.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
                    {feature.description}
                  </p>
                </div>
                <div
                  className={
                    index % 2 === 1 ? "md:order-1" : undefined
                  }
                >
                  <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_24px_60px_-32px_rgba(230,57,120,0.45)]">
                    <Image
                      src={feature.image}
                      alt={feature.alt}
                      placeholder="blur"
                      sizes="(max-width: 768px) 100vw, 640px"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="comecar" className="px-6 py-16 md:px-10 lg:px-14">
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
