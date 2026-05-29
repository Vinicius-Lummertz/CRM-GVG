import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "crm_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365 * 10;

type SessionPayload = {
  phone: string;
  isMaster: boolean;
  profileId?: string | null;
  authenticatedAt: string;
};

function parseSession(raw: string | undefined): SessionPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export async function GET() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  const session = parseSession(raw);
  if (!session) {
    return NextResponse.json({ success: false, session: null }, { status: 401 });
  }
  return NextResponse.json({ success: true, session });
}

export async function POST(req: Request) {
  const body = (await req.json()) as SessionPayload;
  if (!body || !body.phone || typeof body.isMaster !== "boolean" || !body.authenticatedAt) {
    return NextResponse.json({ success: false, error: "Payload de sessao invalido." }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, JSON.stringify(body), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
