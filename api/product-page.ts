import {
  emergencyPageShell,
  fetchPublicProduct,
  loadAppShell,
  productMetadata,
  PublicProductPageError,
  unavailableProductShell,
  validProductIdentifier,
  configuredSiteOrigin,
} from './_lib/publicProductPage.js';
import { renderPageShell } from './_lib/pageShell.js';
import { errorClass, logServerError, logServerWarning } from './_lib/observability.js';
import { sendOperationalAlert } from './_lib/operationalAlerts.js';

/** Janela de silêncio entre alertas de queda do catálogo. Uma indisponibilidade
 * com tráfego dispararia um alerta por requisição; o canal operacional precisa
 * receber o sinal, não o volume. O estado é por instância da função, então a
 * supressão é melhor esforço: pior caso, um alerta por instância aquecida. */
export const CATALOG_ALERT_SILENCE_MS = 5 * 60_000;
let lastCatalogAlertAt = 0;

async function alertCatalogUnavailable(error: unknown, now: number): Promise<void> {
  logServerError('public_catalog_unavailable', { errorClass: errorClass(error) });
  if (now - lastCatalogAlertAt < CATALOG_ALERT_SILENCE_MS) return;
  lastCatalogAlertAt = now;
  const alerted = await sendOperationalAlert('public_catalog_unavailable', { errorClass: errorClass(error), route: '/produto/:identifier' });
  if (process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() && !alerted) {
    logServerWarning('public_catalog_alert_delivery_failed', {});
  }
}

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  url?: string;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  send(body: string): void;
}

function identifierFrom(request: VercelRequest): string {
  const queryValue = request.query?.identifier;
  if (typeof queryValue === 'string') return queryValue.trim();
  if (request.url) {
    try { return new URL(request.url, configuredSiteOrigin()).searchParams.get('identifier')?.trim() || ''; } catch { return ''; }
  }
  return '';
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method && !['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).send('Method Not Allowed');
    return;
  }

  const identifier = identifierFrom(request);
  const canonicalUrl = `${configuredSiteOrigin()}/produto/${encodeURIComponent(identifier || 'produto')}`;
  if (!validProductIdentifier(identifier)) {
    const shell = await loadAppShell().catch(() => null);
    const html = shell
      ? unavailableProductShell(shell, canonicalUrl, 'Produto não encontrado | Promo Brindes', 'Não encontramos este produto. Continue explorando o catálogo da Promo Brindes.')
      : emergencyPageShell(canonicalUrl, 'Produto não encontrado | Promo Brindes', 'Não encontramos este produto. Continue explorando o catálogo da Promo Brindes.');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.status(404).send(request.method === 'HEAD' ? '' : html);
    return;
  }

  try {
    const [product, shell] = await Promise.all([fetchPublicProduct(identifier), loadAppShell()]);
    if (!product) {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.status(404).send(request.method === 'HEAD' ? '' : unavailableProductShell(shell, canonicalUrl, 'Produto não encontrado | Promo Brindes', 'Não encontramos este produto. Continue explorando o catálogo da Promo Brindes.'));
      return;
    }
    const metadata = productMetadata(product);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    response.status(200).send(request.method === 'HEAD' ? '' : renderPageShell(shell, metadata));
  } catch (error) {
    const status = error instanceof PublicProductPageError ? error.status : 503;
    // 400 é identificador inválido — não é queda. Só a indisponibilidade real do
    // catálogo público vira alerta: antes disso ela só aparecia na tela do
    // visitante, e a equipe não tinha como saber que a ficha caiu.
    if (status !== 400) await alertCatalogUnavailable(error, Date.now());
    const shell = await loadAppShell().catch(() => null);
    const title = status === 400 ? 'Produto não encontrado | Promo Brindes' : 'Produto temporariamente indisponível | Promo Brindes';
    const description = status === 400 ? 'Não encontramos este produto. Continue explorando o catálogo da Promo Brindes.' : 'Não foi possível consultar este produto agora. Tente novamente em instantes.';
    const html = shell
      ? unavailableProductShell(shell, canonicalUrl, title, description)
      : emergencyPageShell(canonicalUrl, title, description);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.status(status === 400 ? 404 : 503).send(request.method === 'HEAD' ? '' : html);
  }
}
