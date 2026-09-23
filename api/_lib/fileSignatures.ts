const ASCII = new TextEncoder();

const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  'image/png': (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/jpeg': (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  'image/webp': (bytes) => startsWith(bytes, ASCII.encode('RIFF'))
    && sliceEquals(bytes, 8, ASCII.encode('WEBP')),
  // Aceitar o marcador em qualquer offset permitia um polyglot iniciado por
  // HTML/JavaScript. Para uploads privados de briefing adotamos o contrato
  // estrito: o primeiro registro precisa ser um cabeçalho PDF 1.x ou 2.x.
  'application/pdf': (bytes) => {
    const majorVersion = bytes[5];
    const minorVersion = bytes[7];
    return startsWith(bytes, ASCII.encode('%PDF-'))
      && (majorVersion === 0x31 || majorVersion === 0x32)
      && bytes[6] === 0x2e
      && typeof minorVersion === 'number'
      && minorVersion >= 0x30 && minorVersion <= 0x39;
  },
};

function startsWith(bytes: Uint8Array, expected: ArrayLike<number>): boolean {
  return sliceEquals(bytes, 0, expected);
}

function sliceEquals(bytes: Uint8Array, offset: number, expected: ArrayLike<number>): boolean {
  if (bytes.length < offset + expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected[index]) return false;
  }
  return true;
}

export function matchesDeclaredFileSignature(mimeType: string, bytes: Uint8Array): boolean {
  return signatures[mimeType]?.(bytes) ?? false;
}

export async function readSignaturePrefix(response: Response, limit = 1024): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < limit) {
      const result = await reader.read();
      if (result.done) break;
      const remaining = limit - total;
      const chunk = result.value.subarray(0, remaining);
      chunks.push(chunk);
      total += chunk.length;
      if (result.value.length > remaining) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const prefix = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    prefix.set(chunk, offset);
    offset += chunk.length;
  }
  return prefix;
}
