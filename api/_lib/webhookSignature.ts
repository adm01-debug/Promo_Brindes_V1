import { timingSafeEqual, createHmac } from 'node:crypto';

// Etapa 30: verificação de assinatura para os dois provedores de webhook.
// Funções puras (sem I/O) para que sejam testáveis isoladamente do handler
// HTTP e reutilizáveis pelos dois endpoints.

const SVIX_TIMESTAMP_TOLERANCE_SECONDS = 300;

function safeCompare(expected: Buffer, received: Buffer): boolean {
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export interface VerifySvixSignatureInput {
  id: string;
  timestamp: string;
  signatureHeader: string;
  rawBody: string;
  secret: string;
  now?: number;
}

/**
 * Resend usa o esquema Svix (Standard Webhooks): HMAC-SHA256 sobre
 * `${id}.${timestamp}.${rawBody}`, chave = bytes base64-decodificados após o
 * prefixo `whsec_`, assinatura em base64. O header pode trazer mais de uma
 * assinatura `v1,<base64>` separadas por espaço (rotação de segredo) —
 * qualquer uma batendo é suficiente.
 */
export function verifySvixSignature(input: VerifySvixSignatureInput): boolean {
  const { id, timestamp, signatureHeader, rawBody, secret, now = Date.now() } = input;
  if (!id || !timestamp || !signatureHeader || !secret) return false;
  if (!/^\d+$/.test(timestamp)) return false;
  const timestampSeconds = Number(timestamp);
  if (Math.abs(now / 1000 - timestampSeconds) > SVIX_TIMESTAMP_TOLERANCE_SECONDS) return false;
  if (!secret.startsWith('whsec_')) return false;

  let key: Buffer;
  try {
    key = Buffer.from(secret.slice('whsec_'.length), 'base64');
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();
  const candidates = signatureHeader.split(' ').map((part) => part.trim()).filter(Boolean);
  return candidates.some((candidate) => {
    const [version, signature] = candidate.split(',');
    if (version !== 'v1' || !signature) return false;
    let received: Buffer;
    try {
      received = Buffer.from(signature, 'base64');
    } catch {
      return false;
    }
    return safeCompare(expected, received);
  });
}

export interface VerifyMetaSignatureInput {
  rawBody: string;
  signatureHeader: string;
  appSecret: string;
}

/**
 * Meta (WhatsApp Cloud API) assina com HMAC-SHA256 sobre o corpo bruto,
 * chave = App Secret, hexadecimal (não base64), header
 * `X-Hub-Signature-256: sha256=<hex>`.
 */
export function verifyMetaSignature(input: VerifyMetaSignatureInput): boolean {
  const { rawBody, signatureHeader, appSecret } = input;
  if (!signatureHeader || !appSecret) return false;
  if (!signatureHeader.startsWith('sha256=')) return false;
  const receivedHex = signatureHeader.slice('sha256='.length).trim();
  if (!/^[0-9a-f]+$/i.test(receivedHex)) return false;

  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(receivedHex, 'hex');
  } catch {
    return false;
  }
  return safeCompare(expected, received);
}
