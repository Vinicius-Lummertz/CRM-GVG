import { NextRequest, NextResponse } from 'next/server';

type VerifyOtpBody = {
  phone?: string;
  code?: string;
  sandbox?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyOtpBody;
    const phone = body.phone?.toString().trim();
    const code = body.code?.toString().trim();
    const sandbox = Boolean(body.sandbox);

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: 'Telefone e codigo sao obrigatorios.' },
        { status: 400 }
      );
    }

    const upstreamUrl = sandbox
      ? `${process.env.SANDBOX_API_BASE_URL ?? 'https://crm-gvg.onrender.com'}/api/sandbox/otp/verify`
      : `${process.env.API_BASE_URL ?? 'https://crm-gvg.onrender.com'}/api/v2/otp/verify`;

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
      body: JSON.stringify({ phone, code }),
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
