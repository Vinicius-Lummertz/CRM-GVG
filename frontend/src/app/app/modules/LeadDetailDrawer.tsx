import { useMemo, useRef, useState } from "react";
import type { DocumentType, LeadDetails } from "../shared";
import {
  fetchAddressByCep,
  isValidDocument,
  maskCep,
  maskDocument,
  onlyDigits,
} from "./leadFormat";

// Campos cadastrais opcionais para aceitar o tipo Lead da pagina sem conversao.
export type LeadForDrawer = Partial<LeadDetails> & {
  id: string;
  phone: string;
  status: string;
  created_at?: string | null;
};

type LeadDetailDrawerProps = {
  lead: LeadForDrawer | null;
  open: boolean;
  onClose: () => void;
  // Recebe somente os campos editaveis; deve retornar true em caso de sucesso.
  onSave: (leadId: string, details: LeadDetails) => Promise<boolean>;
  saving: boolean;
  canEdit: boolean;
  error?: string | null;
};

const EMPTY_FORM: LeadDetails = {
  name: "",
  email: "",
  document: "",
  document_type: "cpf",
  birthday: "",
  zip_code: "",
  street: "",
  address_number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

function toFormState(lead: LeadForDrawer): LeadDetails {
  const documentType: DocumentType = lead.document_type === "cnpj" ? "cnpj" : "cpf";
  return {
    name: lead.name ?? "",
    email: lead.email ?? "",
    document: lead.document ? maskDocument(lead.document, documentType) : "",
    document_type: documentType,
    birthday: lead.birthday ?? "",
    zip_code: lead.zip_code ? maskCep(lead.zip_code) : "",
    street: lead.street ?? "",
    address_number: lead.address_number ?? "",
    complement: lead.complement ?? "",
    neighborhood: lead.neighborhood ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
  };
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] disabled:bg-[var(--line)]/30";
const labelClass = "mb-1 block text-xs font-medium text-[var(--muted)]";

export function LeadDetailDrawer({
  lead,
  open,
  onClose,
  onSave,
  saving,
  canEdit,
  error,
}: LeadDetailDrawerProps) {
  // O componente recebe key={lead.id} na pagina, entao o estado e (re)inicializado
  // a cada lead a partir do proprio prop, sem necessidade de effect.
  const [form, setForm] = useState<LeadDetails>(() => (lead ? toFormState(lead) : EMPTY_FORM));
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error">("idle");
  const [localError, setLocalError] = useState<string | null>(null);
  const lastCepLookup = useRef<string>(onlyDigits(lead?.zip_code ?? ""));

  const documentType: DocumentType = form.document_type === "cnpj" ? "cnpj" : "cpf";

  const documentInvalid = useMemo(() => {
    const digits = onlyDigits(form.document ?? "");
    if (!digits) return false;
    return !isValidDocument(digits, documentType);
  }, [form.document, documentType]);

  function setField<K extends keyof LeadDetails>(key: K, value: LeadDetails[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleDocumentTypeChange(next: DocumentType) {
    // Troca o tipo e reaplica a mascara sobre os digitos ja existentes.
    setForm((prev) => ({
      ...prev,
      document_type: next,
      document: prev.document ? maskDocument(prev.document, next) : "",
    }));
  }

  async function handleCepBlur() {
    const digits = onlyDigits(form.zip_code ?? "");
    if (digits.length !== 8 || digits === lastCepLookup.current) return;
    lastCepLookup.current = digits;

    setCepStatus("loading");
    const result = await fetchAddressByCep(digits);
    if (result.error) {
      setCepStatus("error");
      return;
    }
    setCepStatus("idle");
    setForm((prev) => ({
      ...prev,
      street: result.street || prev.street,
      neighborhood: result.neighborhood || prev.neighborhood,
      city: result.city || prev.city,
      state: result.state || prev.state,
    }));
  }

  async function handleSave() {
    if (!lead) return;
    if (documentInvalid) {
      setLocalError(`${documentType.toUpperCase()} invalido.`);
      return;
    }
    setLocalError(null);

    // Envia os digitos crus de documento/CEP; demais campos como estao.
    const payload: LeadDetails = {
      ...form,
      document: form.document ? onlyDigits(form.document) : null,
      zip_code: form.zip_code ? onlyDigits(form.zip_code) : null,
      document_type: form.document ? documentType : null,
    };

    const ok = await onSave(lead.id, payload);
    if (ok) onClose();
  }

  if (!open || !lead) return null;

  const shownError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/35"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-[var(--background)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Dados do lead</h3>
            <p className="text-xs text-[var(--muted)]">{lead.phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--line)]/40"
            aria-label="Fechar painel"
          >
            x
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {shownError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {shownError}
            </div>
          ) : null}

          {/* Contato */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Contato</p>
            <div>
              <label className={labelClass}>Nome</label>
              <input
                className={inputClass}
                value={form.name ?? ""}
                onChange={(e) => setField("name", e.target.value)}
                disabled={!canEdit}
                placeholder="Nome do lead"
              />
            </div>
            <div>
              <label className={labelClass}>E-mail</label>
              <input
                className={inputClass}
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                disabled={!canEdit}
                placeholder="email@exemplo.com"
              />
            </div>
          </section>

          {/* Documento */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Documento</p>
            <div className="flex gap-2">
              {(["cpf", "cnpj"] as DocumentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleDocumentTypeChange(type)}
                  disabled={!canEdit}
                  className={`h-9 flex-1 rounded-xl border text-sm font-medium transition ${
                    documentType === type
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--line)] text-[var(--muted)]"
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
            <div>
              <input
                className={`${inputClass} ${documentInvalid ? "border-rose-400" : ""}`}
                value={form.document ?? ""}
                onChange={(e) => setField("document", maskDocument(e.target.value, documentType))}
                disabled={!canEdit}
                placeholder={documentType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                inputMode="numeric"
              />
              {documentInvalid ? (
                <p className="mt-1 text-xs text-rose-600">{documentType.toUpperCase()} invalido.</p>
              ) : null}
            </div>
          </section>

          {/* Endereco */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Endereco</p>
            <div>
              <label className={labelClass}>CEP</label>
              <input
                className={inputClass}
                value={form.zip_code ?? ""}
                onChange={(e) => setField("zip_code", maskCep(e.target.value))}
                onBlur={handleCepBlur}
                disabled={!canEdit}
                placeholder="00000-000"
                inputMode="numeric"
              />
              {cepStatus === "loading" ? (
                <p className="mt-1 text-xs text-[var(--muted)]">Buscando endereco...</p>
              ) : null}
              {cepStatus === "error" ? (
                <p className="mt-1 text-xs text-amber-600">CEP nao encontrado. Preencha manualmente.</p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className={labelClass}>Rua</label>
                <input
                  className={inputClass}
                  value={form.street ?? ""}
                  onChange={(e) => setField("street", e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className={labelClass}>Numero</label>
                <input
                  className={inputClass}
                  value={form.address_number ?? ""}
                  onChange={(e) => setField("address_number", e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Complemento</label>
              <input
                className={inputClass}
                value={form.complement ?? ""}
                onChange={(e) => setField("complement", e.target.value)}
                disabled={!canEdit}
                placeholder="Apto, bloco, referencia"
              />
            </div>
            <div>
              <label className={labelClass}>Bairro</label>
              <input
                className={inputClass}
                value={form.neighborhood ?? ""}
                onChange={(e) => setField("neighborhood", e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className={labelClass}>Cidade</label>
                <input
                  className={inputClass}
                  value={form.city ?? ""}
                  onChange={(e) => setField("city", e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className={labelClass}>UF</label>
                <input
                  className={inputClass}
                  value={form.state ?? ""}
                  onChange={(e) => setField("state", e.target.value.toUpperCase().slice(0, 2))}
                  disabled={!canEdit}
                  maxLength={2}
                />
              </div>
            </div>
          </section>

          {/* Outros */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Outros</p>
            <div>
              <label className={labelClass}>Aniversario</label>
              <input
                className={inputClass}
                type="date"
                value={form.birthday ?? ""}
                onChange={(e) => setField("birthday", e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className={labelClass}>Data de entrada</label>
              <input className={inputClass} value={formatDate(lead.created_at)} disabled readOnly />
            </div>
          </section>
        </div>

        {canEdit ? (
          <footer className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-[var(--line)] px-4 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
