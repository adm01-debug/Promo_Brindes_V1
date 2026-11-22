import { getSiteDatabaseConfig, SiteDatabaseError } from './_lib/siteDatabase.js';

interface VercelRequest { method?: string; }
interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

/**
 * PF-75: a validação de destino do banco do site existia só por requisição, dentro
 * de getSiteDatabaseConfig(); não havia como saber antes de um cliente tentar
 * enviar orçamento que o deployment está apontando para o banco errado. Este
 * endpoint expõe apenas o código do problema, nunca a URL, o projeto ou a
 * credencial — o suficiente para um monitor ou o smoke de deploy falhar cedo.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method && !['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).json({ ok: false, code: 'method_not_allowed' });
    return;
  }
  try {
    getSiteDatabaseConfig();
    response.status(200).json({ ok: true });
  } catch (error) {
    const code = error instanceof SiteDatabaseError ? error.code : 'database_unavailable';
    response.status(503).json({ ok: false, code });
  }
}
