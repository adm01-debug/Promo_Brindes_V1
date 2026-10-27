import { confirmationDeliveryLabel, quoteConfirmationTitle } from './quoteConfirmation';

describe('confirmação honesta do orçamento', () => {
  it('usa apenas o primeiro nome informado e flexiona produto no singular', () => {
    expect(quoteConfirmationTitle('  Ana Beatriz  ', 1)).toBe('Ana, recebemos sua seleção com 1 produto.');
  });

  it('mantém uma mensagem neutra quando não há nome e flexiona no plural', () => {
    expect(quoteConfirmationTitle('', 6)).toBe('Recebemos sua seleção com 6 produtos.');
  });

  it('não apresenta uma confirmação pendente ou não solicitada como enviada', () => {
    expect(confirmationDeliveryLabel('sent')).toBe('Enviada');
    expect(confirmationDeliveryLabel('pending')).toBe('Registrado para envio');
    expect(confirmationDeliveryLabel('not_requested')).toBe('Não solicitado');
  });
});
