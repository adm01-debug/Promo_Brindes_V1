import { track } from '@vercel/analytics';
import { redactAnalyticsPathname } from './analytics';

function errorClass(error: unknown): string {
  return error instanceof Error && error.name ? error.name.slice(0, 80) : 'UnknownError';
}

/** Envia somente metadados não pessoais para o painel de Analytics da Vercel. */
export function reportClientError(error: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    track('frontend_error', {
      error_class: errorClass(error),
      route: redactAnalyticsPathname(window.location.pathname),
    });
  } catch {
    // Telemetria nunca pode produzir uma segunda falha na interface.
  }
}
