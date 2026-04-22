import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl, getSandboxApiBaseUrl } from '../../../_upstream';

type SendOtpBody = {
  phone?: string;
  sandbox?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendOtpBody;
    const phone = body.phone?.toString().trim();
    const sandbox = Boolean(body.sandbox);

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Telefone e obrigatorio.' },
        { status: 400 }
      );
    }

    const upstreamUrl = sandbox
      ? `${getSandboxApiBaseUrl()}/api/sandbox/otp/send`
      : `${getApiBaseUrl()}/api/v2/otp/send`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (sandbox) {
      headers['x-sandbox-key'] =
        process.env.SANDBOX_KEY ?? 'ajkbsdasdhkjashjkddugy1276351267351';
    }

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone }),
      cache: 'no-store',
    });

    const text = await upstreamRes.text();
    const payload = text ? JSON.parse(text) : {};

    return NextResponse.json(payload, { status: upstreamRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro de conexao com o servidor.' },
      { status: 500 }
    );
  }
}
