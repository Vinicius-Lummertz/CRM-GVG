import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl, buildUpstreamUrl } from './_upstream';

type ProxyOptions = {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
};

function safeJsonParse(text: string) {
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: 'Resposta invalida da API.' };
  }
}

export async function proxyToBackend(req: NextRequest, options: ProxyOptions) {
  try {
    const upstreamUrl = new URL(buildUpstreamUrl(getApiBaseUrl(), options.path));
    req.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    const fetchOptions: RequestInit = {
      method: options.method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (options.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body ?? {});
    }

    const upstreamRes = await fetch(upstreamUrl, fetchOptions);
    const text = await upstreamRes.text();
    const payload = safeJsonParse(text);

    return NextResponse.json(payload, { status: upstreamRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro de conexao com o servidor.' },
      { status: 500 }
    );
  }
}
