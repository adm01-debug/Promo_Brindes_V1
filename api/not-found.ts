import { emergencyPageShell, loadAppShell, unavailableProductShell, configuredSiteOrigin } from './_lib/publicProductPage.js';

interface VercelRequest { method?: string; }
interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  send(body: string): void;
}

const title = 'Página não encontrada | Promo Brindes';
const description = 'Este endereço não existe. Continue explorando o catálogo da Promo Brindes.';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method && !['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).send('Method Not Allowed');
    return;
  }
  const canonicalUrl = `${configuredSiteOrigin()}/404`;
  const shell = await loadAppShell().catch(() => null);
  const html = shell
    ? unavailableProductShell(shell, canonicalUrl, title, description)
    : emergencyPageShell(canonicalUrl, title, description);
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.status(404).send(request.method === 'HEAD' ? '' : html);
}
