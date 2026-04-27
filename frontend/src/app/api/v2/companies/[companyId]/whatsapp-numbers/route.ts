import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../_proxy';

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;

  return proxyToBackend(req, {
    method: 'GET',
    path: `/api/v2/companies/${encodeURIComponent(companyId)}/whatsapp-numbers`,
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const body = await req.json();

  return proxyToBackend(req, {
    method: 'POST',
    path: `/api/v2/companies/${encodeURIComponent(companyId)}/whatsapp-numbers`,
    body,
  });
}
