import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../_proxy';

export async function GET(req: NextRequest) {
  return proxyToBackend(req, {
    method: 'GET',
    path: '/api/v2/companies',
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  return proxyToBackend(req, {
    method: 'POST',
    path: '/api/v2/companies',
    body,
  });
}
