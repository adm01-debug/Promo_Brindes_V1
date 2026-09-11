import { timingSafeEqual } from 'node:crypto';
import { getSiteDatabaseConfig } from './_lib/siteDatabase.js';
import type { ApiRequest, ApiResponse } from './_lib/leadHandler.js';

const REQUEST_TIMEOUT_MS = 10_000;

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function matchesCronSecret(authorization: string, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // A Vercel injeta CRON_SECRET automaticamente nas chamadas configuradas em vercel.json.
  // SITE_CRON_SECRET fica como compatibilidade para um acionador externo controlado.
  const cronSecret = process.env.CRON_SECRET?.trim() || process.env.SITE_CRON_SECRET?.trim();
  if (!cronSecret || cronSecret.length < 32 || !matchesCronSecret(header(request, 'authorization'), cronSecret)) {
    response.status(401).json({ error: 'unauthorized' });
    return;
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const config = getSiteDatabaseConfig();
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const result = await fetch(`${config.url}/rest/v1/rpc/run_site_data_retention`, {
      method: 'POST',
      headers: {
        apikey: config.secretKey,
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ p_batch_size: 500 }),
      signal: controller.signal,
    });
    if (!result.ok) throw new Error('retention_failed');
    response.status(200).json({ ok: true });
  } catch {
    response.status(503).json({ error: 'retention_unavailable' });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
