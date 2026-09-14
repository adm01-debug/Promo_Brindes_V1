import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OVERALL_TIME_BUDGET_MS as NOTIFICATIONS_BUDGET_MS } from '../../api/notifications.js';
import { REQUEST_TIMEOUT_MS as SITE_DATABASE_TIMEOUT_MS } from '../../api/_lib/siteDatabase.js';
import { REQUEST_TIMEOUT_MS as CATALOG_VALIDATION_TIMEOUT_MS } from '../../api/_lib/catalogValidation.js';
import { TIMEOUT_MS as SHARED_SELECTIONS_TIMEOUT_MS } from '../../api/_lib/sharedSelections.js';
import { NETWORK_TIMEOUT_MS as PUBLIC_PRODUCT_PAGE_TIMEOUT_MS } from '../../api/_lib/publicProductPage.js';
import { REQUEST_TIMEOUT_MS as RETENTION_TIMEOUT_MS } from '../../api/retention.js';
import { REQUEST_TIMEOUT_MS as CUSTOMER_PROPOSALS_TIMEOUT_MS } from '../../api/customer-proposals.js';
import { REQUEST_TIMEOUT_MS as SITEMAP_TIMEOUT_MS } from '../../api/sitemap.js';

// deliverQuoteConfirmationsNow (api/notifications.ts): 7s por canal, mas os
// canais rodam em paralelo (Etapa 26) — soma uma vez só, não uma por canal.
const QUOTE_CONFIRMATION_CHANNEL_TIMEOUT_MS = 7_000;

function vercelFunctionsConfig(): Record<string, { maxDuration: number }> {
  // Vitest roda com a raiz do repositório como cwd (vite.config.ts referencia
  // ./src/test/setup.ts do mesmo jeito).
  const path = join(process.cwd(), 'vercel.json');
  const config = JSON.parse(readFileSync(path, 'utf8')) as { functions?: Record<string, { maxDuration: number }> };
  return config.functions ?? {};
}

/**
 * Etapa 24: vercel.json não tinha bloco `functions`, então toda rota usava o
 * maxDuration padrão da plataforma — inferior ao timeout interno de 20s (na
 * época) de api/notifications.ts. Sem esta trava, um deploy futuro pode
 * reduzir o maxDuration declarado, ou aumentar um timeout interno, sem que
 * ninguém perceba que a relação essencial (interno < plataforma) quebrou —
 * exatamente o mecanismo que produz jobs presos em 'processing' (R03) na
 * prática, não só na teoria.
 */
describe('Etapa 24: maxDuration em vercel.json cobre o pior caso real de cada rota', () => {
  const functions = vercelFunctionsConfig();

  function maxDurationMs(path: string): number {
    const entry = functions[path];
    expect(entry, `vercel.json não declara functions["${path}"]`).toBeDefined();
    return entry.maxDuration * 1_000;
  }

  it('api/quote-requests.ts: catalogValidation + siteDatabase + confirmação (canais em paralelo)', () => {
    const worstCaseMs = CATALOG_VALIDATION_TIMEOUT_MS + SITE_DATABASE_TIMEOUT_MS + QUOTE_CONFIRMATION_CHANNEL_TIMEOUT_MS;
    expect(worstCaseMs).toBeLessThan(maxDurationMs('api/quote-requests.ts'));
  });

  it('api/contact-requests.ts: apenas siteDatabase (sem catalogValidation nem confirmação)', () => {
    expect(SITE_DATABASE_TIMEOUT_MS).toBeLessThan(maxDurationMs('api/contact-requests.ts'));
  });

  it('api/notifications.ts: orçamento total já inclui a drenagem de múltiplos lotes (Etapa 28)', () => {
    expect(NOTIFICATIONS_BUDGET_MS).toBeLessThan(maxDurationMs('api/notifications.ts'));
  });

  it('api/retention.ts', () => {
    expect(RETENTION_TIMEOUT_MS).toBeLessThan(maxDurationMs('api/retention.ts'));
  });

  it('api/customer-proposals.ts', () => {
    expect(CUSTOMER_PROPOSALS_TIMEOUT_MS).toBeLessThan(maxDurationMs('api/customer-proposals.ts'));
  });

  it('api/sitemap.ts', () => {
    expect(SITEMAP_TIMEOUT_MS).toBeLessThan(maxDurationMs('api/sitemap.ts'));
  });

  it('api/product-page.ts (via publicProductPage)', () => {
    expect(PUBLIC_PRODUCT_PAGE_TIMEOUT_MS).toBeLessThan(maxDurationMs('api/product-page.ts'));
  });

  it('api/site-page.ts (via publicProductPage)', () => {
    expect(PUBLIC_PRODUCT_PAGE_TIMEOUT_MS).toBeLessThan(maxDurationMs('api/site-page.ts'));
  });

  it('api/shared-selections.ts', () => {
    expect(SHARED_SELECTIONS_TIMEOUT_MS).toBeLessThan(maxDurationMs('api/shared-selections.ts'));
  });

  it('api/not-found.ts (via publicProductPage)', () => {
    expect(PUBLIC_PRODUCT_PAGE_TIMEOUT_MS).toBeLessThan(maxDurationMs('api/not-found.ts'));
  });
});
