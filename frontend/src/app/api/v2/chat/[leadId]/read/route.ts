import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../_proxy';

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { leadId } = await context.params;
  const body = await req.json();

  return proxyToBackend(req, {
    method: 'POST',
    path: `/api/v2/chat/${encodeURIComponent(leadId)}/read`,
    body,
  });
}
