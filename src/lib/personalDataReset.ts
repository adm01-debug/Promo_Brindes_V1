import { clearQuoteDraft } from './quoteDraft';
import { clearSubmissionAttempt } from './http';

const QUOTE_ATTEMPT_STORAGE_KEY = 'promo-brindes:quote-attempt';

/**
 * Contrato único de limpeza de dados pessoais ao trocar de titular (login,
 * logout ou troca de conta, em qualquer aba). Cobre o lado do storage; o lado
 * do estado React (contact, briefing, errors, etc. do QuotePage) é resetado
 * separadamente por quem consome CustomerAuthContext.identityEpoch, pois
 * setState só pode ser chamado de dentro do componente dono do estado.
 *
 * Sempre que um novo campo pessoal for adicionado ao rascunho de orçamento ou
 * à tentativa de envio, ele precisa ser contemplado aqui OU no efeito de reset
 * que reage a identityEpoch — os dois lados deste contrato mudam juntos.
 *
 * A seleção de produtos (carrinho) é preservada deliberadamente: pertence ao
 * navegador, não ao titular da conta.
 */
export function clearPersonalQuoteStorage(): void {
  clearQuoteDraft();
  clearSubmissionAttempt(QUOTE_ATTEMPT_STORAGE_KEY);
}
