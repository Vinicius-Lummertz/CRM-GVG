"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const COUNTRY_CODE = "55";
const MASTER_PHONE = "554896290225";
const API_BASE = "https://crm-gvg.onrender.com";

// Mantem apenas digitos do numero local (DDD + numero), sem o codigo do pais.
function onlyDigits(rawValue: string) {
  return (rawValue || "").replace(/\D/g, "");
}

// Aplica mascara visual: (11) 99999-9999
function maskLocalPhone(digits: string) {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

async function persistSessionCookie(payload: {
  phone: string;
  isMaster: boolean;
  profileId?: string | null;
  authenticatedAt: string;
}) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Falha ao persistir sessao.");
  }
}

const HIGHLIGHTS = [
  {
    icon: "🔐",
    title: "Acesso seguro",
    description: "Codigo de uso unico enviado direto pro seu WhatsApp.",
  },
  {
    icon: "⚡",
    title: "Sem senhas",
    description: "Nada de decorar senha: entra em segundos com o codigo.",
  },
];

export default function OtpPage() {
  const router = useRouter();
  const [localPhone, setLocalPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Digitos locais (DDD + numero) e o telefone completo com o +55 fixo.
  const localDigits = useMemo(() => onlyDigits(localPhone), [localPhone]);
  const fullPhone = useMemo(
    () => `${COUNTRY_CODE}${localDigits}`,
    [localDigits]
  );

  async function sendOtp(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    setError(null);
    setMessage(null);

    // DDD (2) + numero (8 ou 9) => entre 10 e 11 digitos locais.
    if (localDigits.length < 10) {
      setError("Informe um numero valido com DDD.");
      return;
    }

    if (fullPhone === MASTER_PHONE) {
      await persistSessionCookie({
        phone: `+${MASTER_PHONE}`,
        isMaster: true,
        authenticatedAt: new Date().toISOString(),
      });
      localStorage.removeItem("crm_company_id");
      router.push("/app");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v2/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+${fullPhone}` }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao enviar OTP.");
      }

      setStep("code");
      setMessage("Codigo enviado com sucesso. Confira seu WhatsApp.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!code.trim()) {
      setError("Informe o codigo OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v2/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+${fullPhone}`, code: code.trim() }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao validar OTP.");
      }

      const profileId =
        data && data.profile && typeof data.profile.id === "string"
          ? data.profile.id
          : null;

      await persistSessionCookie({
        phone: `+${fullPhone}`,
        isMaster: false,
        profileId,
        authenticatedAt: new Date().toISOString(),
      });
      localStorage.removeItem("crm_company_id");

      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao validar OTP.");
    } finally {
      setLoading(false);
    }
  }

  function backToPhone() {
    setStep("phone");
    setCode("");
    setError(null);
    setMessage(null);
  }

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-10">
      <section className="fade-up grid w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_20px_50px_-35px_rgba(230,57,120,0.55)] md:grid-cols-[1.05fr_1fr]">
        {/* Painel lateral decorativo */}
        <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-[var(--primary)] to-[var(--primary-strong)] p-9 text-white md:flex">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase">
              CRM GVG
            </span>
            <h2 className="mt-6 text-3xl leading-tight font-semibold">
              Seu atendimento,
              <br />
              num so lugar.
            </h2>
            <p className="mt-3 max-w-xs text-sm text-white/85">
              Centralize conversas, leads e tarefas com a praticidade do
              WhatsApp.
            </p>
          </div>

          <div className="relative mt-10 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-white/80">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Formulario */}
        <div className="p-7 sm:p-9">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[var(--primary)] uppercase">
            Acesso via OTP
          </p>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            {step === "phone" ? "Entrar no CRM" : "Confirme o codigo"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {step === "phone"
              ? "Use seu numero pessoal para receber o codigo de acesso."
              : `Enviamos um codigo de 6 digitos para o WhatsApp ${maskLocalPhone(
                  localDigits
                )}.`}
          </p>

          {/* Indicador de etapas */}
          <div className="mt-5 flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                step === "phone"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-emerald-500 text-white"
              }`}
            >
              {step === "phone" ? "1" : "✓"}
            </span>
            <span className="h-px w-6 bg-[var(--line)]" />
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                step === "code"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--line)] text-[var(--muted)]"
              }`}
            >
              2
            </span>
          </div>

          {step === "phone" ? (
            <form className="mt-6 space-y-4" onSubmit={sendOtp}>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Numero pessoal
              </label>
              <div className="flex h-12 w-full items-stretch overflow-hidden rounded-xl border border-[var(--line)] focus-within:border-pink-300">
                <span className="flex shrink-0 items-center gap-2 border-r border-[var(--line)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)]">
                  <span className="text-base leading-none">🇧🇷</span>
                  +55
                </span>
                <input
                  value={maskLocalPhone(localDigits)}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  className="h-full w-full bg-transparent px-4 text-[var(--foreground)] outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[var(--primary)] font-semibold text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Enviando..." : "Enviar codigo"}
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={verifyOtp}>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Codigo OTP
              </label>
              <input
                value={code}
                onChange={(e) => setCode(onlyDigits(e.target.value).slice(0, 6))}
                inputMode="numeric"
                placeholder="000000"
                className="h-12 w-full rounded-xl border border-[var(--line)] px-4 text-center text-lg font-semibold tracking-[0.5em] text-[var(--foreground)] outline-none focus:border-pink-300"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[var(--primary)] font-semibold text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Validando..." : "Validar codigo"}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={backToPhone}
                  className="font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
                >
                  ← Trocar numero
                </button>
                <button
                  type="button"
                  onClick={() => sendOtp()}
                  disabled={loading}
                  className="font-medium text-[var(--primary)] transition hover:text-[var(--primary-strong)] disabled:opacity-60"
                >
                  Reenviar codigo
                </button>
              </div>
            </form>
          )}

          {message ? (
            <p className="mt-4 text-sm text-emerald-600">{message}</p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : null}

          <p className="mt-6 text-xs text-[var(--muted)]">
            Ao continuar, voce concorda em receber uma mensagem no WhatsApp com
            seu codigo de acesso.
          </p>
        </div>
      </section>
    </main>
  );
}
