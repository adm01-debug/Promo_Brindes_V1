import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildContactEmailHref, buildContactPayload, submitContactRequest } from './contactRequest';

const lead = { name: 'Ana Lima', email: 'ana@empresa.com.br', phone: '(11) 99999-0000', message: 'Quero criar um kit para onboarding.', privacyAccepted: true };

describe('contato rápido', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('separa o consentimento do contato e registra sua versão', () => {
    const payload = buildContactPayload(lead, 'https://site.test/', '2026-09-08T10:00:00.000Z', 'request-contact-1');
    expect(payload).toMatchObject({
      source: 'site-promo-brindes-contact',
      contact: { name: 'Ana Lima' },
      consent: { accepted: true, noticeVersion: '2026-09-08', acceptedAt: '2026-09-08T10:00:00.000Z' },
      clientRequestId: 'request-contact-1',
    });
    expect(payload.contact).not.toHaveProperty('privacyAccepted');
  });

  it('prepara fallback de e-mail sem depender de infraestrutura', () => {
    const href = buildContactEmailHref(buildContactPayload(lead), 'contato@promo.test');
    expect(href).toMatch(/^mailto:contato%40promo\.test/);
    const decodedHref = decodeURIComponent(href);
    expect(decodedHref).toContain('Olá, time de especialistas da Promo Brindes!');
    expect(decodedHref).toContain('Ana Lima');
    expect(decodedHref).toContain('Quero criar um kit para onboarding.');
  });

  it('recusa endpoint inseguro', async () => {
    vi.stubEnv('VITE_CONTACT_REQUEST_ENDPOINT', 'http://inseguro.test/lead');
    await expect(submitContactRequest(buildContactPayload(lead))).rejects.toThrow('HTTPS');
  });

  it('converte falha de rede em mensagem útil', async () => {
    vi.stubEnv('VITE_CONTACT_REQUEST_ENDPOINT', '/api/contact-requests');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(submitContactRequest(buildContactPayload(lead))).rejects.toThrow('Verifique sua conexão');
  });

  it('envia somente JSON para um endpoint autorizado', async () => {
    vi.stubEnv('VITE_CONTACT_REQUEST_ENDPOINT', '/api/contact-requests');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ requestId: 'lead-00042' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const payload = buildContactPayload(lead);
    await expect(submitContactRequest(payload)).resolves.toEqual({ mode: 'endpoint', requestId: 'lead-00042' });
    expect(fetchMock).toHaveBeenCalledWith('/api/contact-requests', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/contact-requests', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': payload.clientRequestId }),
    }));
  });
});
