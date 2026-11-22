import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import healthHandler from '../../api/health.js';

const SITE_PROJECT = 'xlzmclcjdncjfdrjxclt';
const VALID_CREDENTIAL = `sb_secret_${'a'.repeat(40)}`;
const VALID_SALT = 'b'.repeat(32);

type ResponseDouble = {
  headers: Map<string, string>;
  statusCode: number;
  body: unknown;
  response: {
    setHeader(name: string, value: string): void;
    status(code: number): ResponseDouble['response'];
    json(body: unknown): void;
  };
};

function responseDouble(): ResponseDouble {
  const result: ResponseDouble = {
    headers: new Map(),
    statusCode: 0,
    body: undefined,
    response: {
      setHeader(name, value) { result.headers.set(name, value); },
      status(code) { result.statusCode = code; return result.response; },
      json(body) { result.body = body; },
    },
  };
  return result;
}

function configure(overrides: Record<string, string | undefined> = {}) {
  const base: Record<string, string | undefined> = {
    SITE_SUPABASE_URL: `https://${SITE_PROJECT}.supabase.co`,
    SITE_SUPABASE_SECRET_KEY: VALID_CREDENTIAL,
    SITE_REQUEST_HASH_SALT: VALID_SALT,
    VERCEL_ENV: 'production',
  };
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const MANAGED = ['SITE_SUPABASE_URL', 'SITE_SUPABASE_SERVICE_JWT', 'SITE_SUPABASE_SECRET_KEY', 'SITE_REQUEST_HASH_SALT', 'VERCEL_ENV', 'SITE_PREVIEW_SUPABASE_PROJECT_REF'];

describe('PF-75: /api/health confere a configuração do banco sem expor segredo', () => {
  const original = { ...process.env };

  beforeEach(() => {
    for (const key of MANAGED) delete process.env[key];
  });

  afterEach(() => {
    for (const key of MANAGED) delete process.env[key];
    Object.assign(process.env, original);
  });

  it('responde 200 quando o deployment aponta para o projeto isolado do site', async () => {
    configure();
    const double = responseDouble();
    await healthHandler({ method: 'GET' }, double.response);
    expect(double.statusCode).toBe(200);
    expect(double.body).toEqual({ ok: true });
  });

  it('responde 503 backend_not_configured quando falta variável obrigatória', async () => {
    configure({ SITE_REQUEST_HASH_SALT: undefined });
    const double = responseDouble();
    await healthHandler({ method: 'GET' }, double.response);
    expect(double.statusCode).toBe(503);
    expect(double.body).toEqual({ ok: false, code: 'backend_not_configured' });
  });

  it('rejeita o banco canônico com unsafe_database_target', async () => {
    configure({ SITE_SUPABASE_URL: 'https://doufsxqlfjyuvxuezpln.supabase.co' });
    const double = responseDouble();
    await healthHandler({ method: 'GET' }, double.response);
    expect(double.statusCode).toBe(503);
    expect(double.body).toEqual({ ok: false, code: 'unsafe_database_target' });
  });

  it('rejeita URL com credencial embutida e credencial fora do formato', async () => {
    configure({ SITE_SUPABASE_URL: `https://user:pass@${SITE_PROJECT}.supabase.co` });
    const first = responseDouble();
    await healthHandler({ method: 'GET' }, first.response);
    expect(first.body).toEqual({ ok: false, code: 'unsafe_database_target' });

    configure();
    configure({ SITE_SUPABASE_SECRET_KEY: 'chave-invalida' });
    const second = responseDouble();
    await healthHandler({ method: 'GET' }, second.response);
    expect(second.body).toEqual({ ok: false, code: 'backend_misconfigured' });
  });

  it('rejeita porta explícita mesmo com host do projeto isolado', async () => {
    configure({ SITE_SUPABASE_URL: `https://${SITE_PROJECT}.supabase.co:8443` });
    const double = responseDouble();
    await healthHandler({ method: 'GET' }, double.response);
    expect(double.statusCode).toBe(503);
    expect(double.body).toEqual({ ok: false, code: 'unsafe_database_target' });

    configure({ SITE_SUPABASE_URL: `https://${SITE_PROJECT}.supabase.co:443` });
    const portaPadrao = responseDouble();
    await healthHandler({ method: 'GET' }, portaPadrao.response);
    expect(portaPadrao.statusCode).toBe(200);
  });

  it('não vaza URL, projeto, credencial nem salt no corpo da resposta', async () => {
    configure({ SITE_SUPABASE_URL: 'https://outroprojeto12345.supabase.co' });
    const double = responseDouble();
    await healthHandler({ method: 'GET' }, double.response);
    const serialized = JSON.stringify(double.body);
    expect(serialized).not.toContain('outroprojeto12345');
    expect(serialized).not.toContain(VALID_CREDENTIAL);
    expect(serialized).not.toContain(VALID_SALT);
  });

  it('marca no-store e recusa método diferente de GET/HEAD', async () => {
    configure();
    const double = responseDouble();
    await healthHandler({ method: 'POST' }, double.response);
    expect(double.statusCode).toBe(405);
    expect(double.headers.get('Allow')).toBe('GET, HEAD');
    expect(double.headers.get('Cache-Control')).toBe('no-store');
  });

  it('mantém a prévia isolada exigindo um projeto de prévia declarado', async () => {
    configure({ VERCEL_ENV: 'preview' });
    const semPreview = responseDouble();
    await healthHandler({ method: 'GET' }, semPreview.response);
    expect(semPreview.body).toEqual({ ok: false, code: 'unsafe_database_target' });

    configure({ VERCEL_ENV: 'preview', SITE_PREVIEW_SUPABASE_PROJECT_REF: SITE_PROJECT });
    const comCanonico = responseDouble();
    await healthHandler({ method: 'GET' }, comCanonico.response);
    expect(comCanonico.body).toEqual({ ok: false, code: 'unsafe_database_target' });
  });
});

describe('PF-75: a rota é publicada e declarada como todas as outras', () => {
  it('registra api/health.ts em vercel.json:functions com maxDuration explícito', () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      functions?: Record<string, { maxDuration?: number }>;
    };
    const entry = config.functions?.['api/health.ts'];
    expect(entry, 'vercel.json não declara functions["api/health.ts"]').toBeDefined();
    expect(entry?.maxDuration).toBe(10);
  });
});
