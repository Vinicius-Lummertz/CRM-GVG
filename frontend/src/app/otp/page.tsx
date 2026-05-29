"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MASTER_PHONE = "554896290225";
const API_BASE = "https://crm-gvg.onrender.com";

function normalizePhone(rawValue: string) {
  const digits = (rawValue || "").replace(/\D/g, "");
  return digits;
}

export default function OtpPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!normalizedPhone) {
      setError("Informe um telefone valido.");
      return;
    }

    if (normalizedPhone === MASTER_PHONE) {
      localStorage.setItem(
        "crm_session",
        JSON.stringify({
          phone: `+${MASTER_PHONE}`,
          isMaster: true,
          authenticatedAt: new Date().toISOString(),
        })
      );
      localStorage.removeItem("crm_company_id");
      router.push("/app");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v2/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+${normalizedPhone}` }),
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
        body: JSON.stringify({ phone: `+${normalizedPhone}`, code: code.trim() }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao validar OTP.");
      }

      const profileId =
        data && data.profile && typeof data.profile.id === "string"
          ? data.profile.id
          : null;

      localStorage.setItem(
        "crm_session",
        JSON.stringify({
          phone: `+${normalizedPhone}`,
          isMaster: false,
          profileId,
          authenticatedAt: new Date().toISOString(),
        })
      );
      localStorage.removeItem("crm_company_id");

      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao validar OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-7 shadow-[0_20px_50px_-35px_rgba(230,57,120,0.55)]">
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[var(--primary)] uppercase">
          Acesso via OTP
        </p>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Entrar no CRM
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use seu numero pessoal para receber o codigo de acesso.
        </p>

        {step === "phone" ? (
          <form className="mt-6 space-y-4" onSubmit={sendOtp}>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Numero pessoal
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="h-12 w-full rounded-xl border border-[var(--line)] px-4 text-[var(--foreground)] outline-none focus:border-pink-300"
            />
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
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="h-12 w-full rounded-xl border border-[var(--line)] px-4 text-[var(--foreground)] outline-none focus:border-pink-300"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[var(--primary)] font-semibold text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Validando..." : "Validar codigo"}
            </button>
          </form>
        )}

        {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </section>
    </main>
  );
}
