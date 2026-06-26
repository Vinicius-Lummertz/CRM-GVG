// Utilitarios de formatacao/validacao para os dados cadastrais do lead.
// As mascaras sao puramente visuais; os digitos crus seguem para o backend.

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function maskCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskDocument(value: string, type: "cpf" | "cnpj"): string {
  return type === "cnpj" ? maskCnpj(value) : maskCpf(value);
}

export function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

// Mascara de moeda em reais a partir dos digitos (os 2 ultimos sao centavos).
// Ex.: "150000" -> "1.500,00". Retorna "" quando nao ha digitos.
export function maskCurrency(value: string): string {
  const digits = onlyDigits(value).slice(0, 13);
  if (!digits) return "";
  const number = Number(digits) / 100;
  return number.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Converte o texto mascarado de moeda para numero (reais). "" -> null.
export function parseCurrency(masked: string): number | null {
  const digits = onlyDigits(masked);
  if (!digits) return null;
  return Number(digits) / 100;
}

// Formata um numero (reais) como moeda brasileira para exibicao.
export function formatCurrencyBRL(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calcCheck = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i += 1) {
      sum += Number(digits[i]) * (slice + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcCheck(9) === Number(digits[9]) && calcCheck(10) === Number(digits[10]);
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const calcCheck = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return calcCheck(12) === Number(digits[12]) && calcCheck(13) === Number(digits[13]);
}

export function isValidDocument(value: string, type: "cpf" | "cnpj"): boolean {
  return type === "cnpj" ? isValidCnpj(value) : isValidCpf(value);
}

export type ViaCepResult = {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  error?: boolean;
};

// Consulta o ViaCEP (API publica, sem chave) para autopreencher o endereco.
export async function fetchAddressByCep(cep: string): Promise<ViaCepResult> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return { error: true };

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) return { error: true };
    const data = await response.json();
    if (data.erro) return { error: true };

    return {
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    return { error: true };
  }
}
