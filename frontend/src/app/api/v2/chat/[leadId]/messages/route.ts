import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../_proxy';

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { leadId } = await context.params;

  return proxyToBackend(req, {
    method: 'GET',
    path: `/api/v2/chat/${encodeURIComponent(leadId)}/messages`,
  });
}
