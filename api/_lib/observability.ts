import { randomUUID } from 'node:crypto';

/**
 * Logs server-side devem ser correlacionáveis sem carregar contato, e-mail,
 * telefone, payload ou mensagem de exceção (qualquer um deles pode conter
 * dado pessoal fornecido pelo visitante).
 */
export function createCorrelationId(): string {
  return randomUUID();
}

export function errorClass(error: unknown): string {
  if (error instanceof Error && error.name) return error.name.slice(0, 80);
  return 'UnknownError';
}

export function logServerError(event: string, details: Record<string, unknown>): void {
  console.error(event, details);
}

export function logServerWarning(event: string, details: Record<string, unknown>): void {
  console.warn(event, details);
}
