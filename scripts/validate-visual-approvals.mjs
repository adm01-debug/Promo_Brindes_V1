import { createHash } from 'node:crypto';
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
  return createHash('sha256').update(buffer).digest('hex');
}

export function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Compara os assets versionados com o registro. Não toca no filesystem. */
export function validateRegistry(registry, files) {
  const errors = [];
  const byPath = new Map(files.map((file) => [file.path, file]));
  const approvals = new Map();
  for (const approval of registry.approvals ?? []) {
    // Map sobrescreveria em silencio: dois registros com o mesmo id fazem o
    // primeiro sumir, e os assets ligados a ele passariam a apontar para a
    // decisao do segundo (outra tela, outra data) sem ninguem notar.
    if (approvals.has(approval.id)) {
      errors.push(`aprovacao ${approval.id} repetida no registro`);
      continue;
    }
    approvals.set(approval.id, approval);
  }

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
    if (!Number.isInteger(asset.bytes)) {
      // Sem inteiro o registro pula a conferencia de tamanho; "215873" como texto
      // ou o campo ausente passariam batido e o erro diria so "hash divergente".
      errors.push(`tamanho ausente ou invalido em ${asset.path}: ${asset.bytes ?? '(ausente)'} (precisa de inteiro em bytes)`);
    } else if (asset.bytes !== file.bytes) {
      // sha256 ja cobre o conteudo; bytes existe para o erro dizer "a imagem
      // reexportada mudou de tamanho" e nao so "hash divergente".
      errors.push(`tamanho divergente em ${asset.path}: registro ${asset.bytes} bytes, disco ${file.bytes}`);
    }
    if (asset.width !== file.width || asset.height !== file.height) {
      errors.push(`dimensoes divergentes em ${asset.path}: registro ${asset.width}x${asset.height}, disco ${file.width}x${file.height}`);
    }
    if (asset.kind !== 'base' && asset.kind !== 'proposta') {
      // Sem o kind um PNG de proposta cai no ramo 'base' e escapa da exigencia
      // de aprovacao: um typo em `kind` bastaria para publicar tela sem aval.
      errors.push(`tipo de asset invalido em ${asset.path}: ${asset.kind ?? '(ausente)'}`);
    }
    if (asset.kind === 'proposta') {
      if (!asset.approvalId) errors.push(`proposta sem aprovacao vinculada: ${asset.path}`);
      else if (!approvals.has(asset.approvalId)) errors.push(`${asset.path} aponta aprovacao inexistente ${asset.approvalId}`);
      else if (approvals.get(asset.approvalId).decision !== 'aprovado') {
        errors.push(`${asset.path} vinculado a aprovacao nao aprovada (${asset.approvalId})`);
      }
    }
  }

  const registered = new Set();
  for (const asset of registry.assets ?? []) {
    if (registered.has(asset.path)) errors.push(`asset registrado duas vezes: ${asset.path}`);
    registered.add(asset.path);
  }
  for (const file of files) {
    if (!registered.has(file.path)) errors.push(`PNG fora do registro de aprovacao: ${file.path}`);
  }
  return errors;
}

function readAsset(filePath, baseDir = ROOT) {
  const buffer = readFileSync(path.resolve(baseDir, filePath));
  const dimensions = pngDimensions(buffer);
  if (!dimensions) return null;
  return { path: filePath, sha256: sha256OfBuffer(buffer), bytes: buffer.length, ...dimensions };
}

export function readRegistryFromDisk() {
  return JSON.parse(readFileSync(path.resolve(ROOT, REGISTRY_PATH), 'utf8'));
}

/**
 * Pastas de mockup versionadas que nao estao em `roots`. Sem isso, criar
 * `docs/mockups-nova-tela/` e commitar PNGs ali passaria no guard sem dono,
 * data nem PR — exatamente o buraco que o PF-56 existe para fechar.
 */
export function findUnregisteredRoots(roots, entries = readdirSync(path.resolve(ROOT, 'docs'), { withFileTypes: true })) {
  const known = new Set(roots);
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('mockups-'))
    .map((entry) => `docs/${entry.name}`)
    .filter((root) => !known.has(root));
}

/**
 * PNGs sob cada raiz, em qualquer profundidade. Antes so o primeiro nivel era
 * lido: um mockup em `docs/mockups-x/ficha/` nao era visto, entao um PNG sem
 * registro passava e um PNG registrado era declarado inexistente.
 */
export function listAssetsFromDisk(roots, baseDir = ROOT) {
  const files = [];
  const walk = (relative) => {
    const absolute = path.resolve(baseDir, relative);
    if (!existsSync(absolute)) return;
    for (const entry of readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith('.png')) {
        const asset = readAsset(child, baseDir);
        if (asset) files.push(asset);
      }
    }
  };
  for (const root of roots) walk(root);
  return files;
}

function main() {
  const registry = readRegistryFromDisk();
  const files = listAssetsFromDisk(registry.roots ?? []);
  const errors = validateRegistry(registry, files);
  for (const root of findUnregisteredRoots(registry.roots ?? [])) {
    errors.push(`pasta de mockup fora de "roots" no registro: ${root}`);
  }
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
