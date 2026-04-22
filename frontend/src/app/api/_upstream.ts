const RENDER_BASE_URL = 'https://crm-gvg.onrender.com';

function looksLikeLocalhost(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('0.0.0.0') ||
    normalized.includes('::1')
  );
}

function normalizeBase(rawValue: string | undefined, fallback: string) {
  const value = rawValue?.toString().trim();
  if (!value) return fallback;
  if (!value.startsWith('http://') && !value.startsWith('https://')) return fallback;
  if (looksLikeLocalhost(value)) return fallback;
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  return normalizeBase(process.env.API_BASE_URL, RENDER_BASE_URL);
}

export function getSandboxApiBaseUrl() {
  return normalizeBase(process.env.SANDBOX_API_BASE_URL, RENDER_BASE_URL);
}

export function getRenderBaseUrl() {
  return RENDER_BASE_URL;
}

export function buildUpstreamUrl(base: string, pathOrUrl: string) {
  const candidate = pathOrUrl.toString().trim();
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    return candidate;
  }
  if (!candidate.startsWith('/')) {
    return `${base}/${candidate}`;
  }
  return `${base}${candidate}`;
}

export function getSafeConfiguredEndpoint(rawValue: string | undefined) {
  const value = rawValue?.toString().trim();
  if (!value) return '';
  if ((value.startsWith('http://') || value.startsWith('https://')) && looksLikeLocalhost(value)) {
    return '';
  }
  return value;
}
