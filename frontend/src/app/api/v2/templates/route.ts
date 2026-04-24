import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../_proxy';

export async function GET(req: NextRequest) {
  return proxyToBackend(req, {
    method: 'GET',
    path: '/api/v2/templates',
  });
}
