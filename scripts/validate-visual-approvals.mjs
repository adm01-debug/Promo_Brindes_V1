import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// PF-56: o projeto exige proposta visual aprovada antes de mudar design
// (docs/agentes/aprovacao-visual-design.md). Os PNGs estavam versionados, mas nada
// dizia quem aprovou, quando, para qual PR e qual versão do arquivo foi aprovada —
// então um PNG podia ser trocado sem deixar rastro. Este guard amarra cada imagem a
// um registro com dono, data, PR mergeada e hash SHA-256.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY_PATH = 'docs/aprovacoes-visuais/registro.json';

export function sha256OfBuffer(buffer) {
  // Implementação local (sem node:crypto) para o teste conseguir injetar buffers
  // arbitrários e comparar com o hash já gravado no registro.
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;
  const total = buffer.length;
  const padded = Buffer.alloc(((total + 9 + 63) >> 6) << 6);
  buffer.copy(padded);
  padded[total] = 0x80;
  const bitLen = BigInt(total) * 8n;
  padded.writeBigUInt64BE(bitLen, padded.length - 8);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = padded.readUInt32BE(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H = [ (H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0,
          (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0 ];
  }
  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

export function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Compara os assets versionados com o registro. Não toca no filesystem. */
export function validateRegistry(registry, files) {
  const errors = [];
  const byPath = new Map(files.map((file) => [file.path, file]));
  const approvals = new Map((registry.approvals ?? []).map((a) => [a.id, a]));

  for (const approval of registry.approvals ?? []) {
    for (const key of ['id', 'approvedBy', 'approvedAt', 'screen', 'decision', 'evidence']) {
      if (!approval[key]) errors.push(`aprovacao ${approval.id ?? '(sem id)'} sem "${key}"`);
    }
    if (!Number.isInteger(approval.pr)) errors.push(`aprovacao ${approval.id} sem numero de PR`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(approval.approvedAt))) {
      errors.push(`aprovacao ${approval.id} tem approvedAt fora de AAAA-MM-DD`);
    }
    if (!/^[0-9a-f]{40}$/.test(String(approval.mergeCommit))) {
      errors.push(`aprovacao ${approval.id} sem mergeCommit completo (40 hexadecimais)`);
    }
    for (const doc of approval.documentedIn ?? []) {
      if (!byPath.has(doc) && !files.some((file) => file.path === doc) && !existsSync(path.resolve(ROOT, doc))) {
        errors.push(`aprovacao ${approval.id} aponta documento inexistente: ${doc}`);
      }
    }
  }

  for (const asset of registry.assets ?? []) {
    const file = byPath.get(asset.path);
    if (!file) {
      errors.push(`asset registrado nao existe no repositorio: ${asset.path}`);
      continue;
    }
    if (asset.sha256 !== file.sha256) {
      errors.push(`hash divergente em ${asset.path}: registro ${asset.sha256}, disco ${file.sha256}`);
    }
    if (asset.width !== file.width || asset.height !== file.height) {
      errors.push(`dimensoes divergentes em ${asset.path}: registro ${asset.width}x${asset.height}, disco ${file.width}x${file.height}`);
    }
    if (asset.kind === 'proposta') {
      if (!asset.approvalId) errors.push(`proposta sem aprovacao vinculada: ${asset.path}`);
      else if (!approvals.has(asset.approvalId)) errors.push(`${asset.path} aponta aprovacao inexistente ${asset.approvalId}`);
      else if (approvals.get(asset.approvalId).decision !== 'aprovado') {
        errors.push(`${asset.path} vinculado a aprovacao nao aprovada (${asset.approvalId})`);
      }
    }
  }

  const registered = new Set((registry.assets ?? []).map((asset) => asset.path));
  for (const file of files) {
    if (!registered.has(file.path)) errors.push(`PNG fora do registro de aprovacao: ${file.path}`);
  }
  return errors;
}

function readAsset(filePath) {
  const buffer = readFileSync(path.resolve(ROOT, filePath));
  const dimensions = pngDimensions(buffer);
  if (!dimensions) return null;
  return { path: filePath, sha256: sha256OfBuffer(buffer), ...dimensions };
}

export function readRegistryFromDisk() {
  return JSON.parse(readFileSync(path.resolve(ROOT, REGISTRY_PATH), 'utf8'));
}

export function listAssetsFromDisk(roots) {
  const files = [];
  for (const root of roots) {
    const absolute = path.resolve(ROOT, root);
    if (!existsSync(absolute)) continue;
    for (const name of readdirSync(absolute).sort()) {
      if (!name.endsWith('.png')) continue;
      const asset = readAsset(`${root}/${name}`);
      if (asset) files.push(asset);
    }
  }
  return files;
}

function main() {
  const registry = readRegistryFromDisk();
  const files = listAssetsFromDisk(registry.roots ?? []);
  const errors = validateRegistry(registry, files);
  if (errors.length > 0) {
    console.error('Registro de aprovacao visual reprovado:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const proposals = (registry.assets ?? []).filter((asset) => asset.kind === 'proposta').length;
  console.log(
    `Registro de aprovacao visual aprovado: ${files.length} PNGs, ${proposals} propostas, ${(registry.approvals ?? []).length} aprovacoes com dono e data.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
