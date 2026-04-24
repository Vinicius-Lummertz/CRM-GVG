import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../_proxy';

export async function POST(req: NextRequest) {
  const body = await req.json();

  return proxyToBackend(req, {
    method: 'POST',
    path: '/api/v2/chat/send-template',
    body,
  });
}
