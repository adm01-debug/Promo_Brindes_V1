export type ConfirmationDeliveryStatus = 'sent' | 'pending' | 'not_requested';

export function quoteConfirmationTitle(name: string, itemCount: number): string {
  const firstName = name.trim().split(/\s+/u)[0] || '';
  const safeCount = Number.isFinite(itemCount) ? Math.max(0, Math.trunc(itemCount)) : 0;
  const subject = firstName ? `${firstName}, recebemos` : 'Recebemos';
  return `${subject} sua seleção com ${safeCount} ${safeCount === 1 ? 'produto' : 'produtos'}.`;
}

export function confirmationDeliveryLabel(status: ConfirmationDeliveryStatus): string {
  if (status === 'sent') return 'Enviada';
  if (status === 'pending') return 'Registrado para envio';
  return 'Não solicitado';
}
