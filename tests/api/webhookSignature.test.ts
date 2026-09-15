import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifySvixSignature, verifyMetaSignature } from '../../api/_lib/webhookSignature.js';

const SVIX_SECRET = `whsec_${Buffer.from('svix-test-secret-bytes-0001').toString('base64')}`;
const RAW_BODY = JSON.stringify({ type: 'email.delivered', data: { email_id: 'em_123' } });

function svixSignature(id: string, timestamp: string, body: string, secret = SVIX_SECRET): string {
  const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
  const digest = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  return `v1,${digest}`;
}

describe('verifySvixSignature (Etapa 30, Resend)', () => {
  const id = 'msg_test_1';
  const timestamp = String(Math.floor(Date.now() / 1000));

  it('aceita uma assinatura válida', () => {
    const signatureHeader = svixSignature(id, timestamp, RAW_BODY);
    expect(verifySvixSignature({ id, timestamp, signatureHeader, rawBody: RAW_BODY, secret: SVIX_SECRET })).toBe(true);
  });

  it('aceita quando o header traz múltiplas assinaturas e uma delas bate (rotação de segredo)', () => {
    const valid = svixSignature(id, timestamp, RAW_BODY);
    const signatureHeader = `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= ${valid}`;
    expect(verifySvixSignature({ id, timestamp, signatureHeader, rawBody: RAW_BODY, secret: SVIX_SECRET })).toBe(true);
  });

  it('rejeita corpo adulterado', () => {
    const signatureHeader = svixSignature(id, timestamp, RAW_BODY);
    const tampered = RAW_BODY.replace('email.delivered', 'email.bounced');
    expect(verifySvixSignature({ id, timestamp, signatureHeader, rawBody: tampered, secret: SVIX_SECRET })).toBe(false);
  });

  it('rejeita segredo errado', () => {
    const wrongSecret = `whsec_${Buffer.from('outro-segredo-completamente-diferente').toString('base64')}`;
    const signatureHeader = svixSignature(id, timestamp, RAW_BODY, wrongSecret);
    expect(verifySvixSignature({ id, timestamp, signatureHeader, rawBody: RAW_BODY, secret: SVIX_SECRET })).toBe(false);
  });

  it('rejeita timestamp fora da tolerância de replay', () => {
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const signatureHeader = svixSignature(id, staleTimestamp, RAW_BODY);
    expect(verifySvixSignature({ id, timestamp: staleTimestamp, signatureHeader, rawBody: RAW_BODY, secret: SVIX_SECRET })).toBe(false);
  });

  it('rejeita quando algum campo obrigatório está ausente', () => {
    expect(verifySvixSignature({ id: '', timestamp, signatureHeader: 'v1,x', rawBody: RAW_BODY, secret: SVIX_SECRET })).toBe(false);
    expect(verifySvixSignature({ id, timestamp, signatureHeader: '', rawBody: RAW_BODY, secret: SVIX_SECRET })).toBe(false);
    expect(verifySvixSignature({ id, timestamp, signatureHeader: 'v1,x', rawBody: RAW_BODY, secret: '' })).toBe(false);
  });
});

describe('verifyMetaSignature (Etapa 30, WhatsApp Cloud API)', () => {
  const APP_SECRET = 'meta-app-secret-test';
  const BODY = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.1', status: 'delivered' }] } }] }] });

  function metaSignature(body: string, secret = APP_SECRET): string {
    return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  }

  it('aceita uma assinatura válida', () => {
    expect(verifyMetaSignature({ rawBody: BODY, signatureHeader: metaSignature(BODY), appSecret: APP_SECRET })).toBe(true);
  });

  it('rejeita corpo adulterado', () => {
    const tampered = BODY.replace('delivered', 'failed');
    expect(verifyMetaSignature({ rawBody: tampered, signatureHeader: metaSignature(BODY), appSecret: APP_SECRET })).toBe(false);
  });

  it('rejeita segredo errado', () => {
    expect(verifyMetaSignature({ rawBody: BODY, signatureHeader: metaSignature(BODY, 'outro-secret'), appSecret: APP_SECRET })).toBe(false);
  });

  it('rejeita header sem o prefixo sha256=', () => {
    const digest = createHmac('sha256', APP_SECRET).update(BODY).digest('hex');
    expect(verifyMetaSignature({ rawBody: BODY, signatureHeader: digest, appSecret: APP_SECRET })).toBe(false);
  });

  it('rejeita quando o header ou o segredo estão ausentes', () => {
    expect(verifyMetaSignature({ rawBody: BODY, signatureHeader: '', appSecret: APP_SECRET })).toBe(false);
    expect(verifyMetaSignature({ rawBody: BODY, signatureHeader: metaSignature(BODY), appSecret: '' })).toBe(false);
  });
});
