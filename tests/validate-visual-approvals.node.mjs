import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { pngDimensions, sha256OfBuffer, validateRegistry,
  findUnregisteredRoots,
  listAssetsFromDisk,
} from '../scripts/validate-visual-approvals.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/validate-visual-approvals.mjs', import.meta.url));
const REGISTRY = fileURLToPath(new URL('../docs/aprovacoes-visuais/registro.json', import.meta.url));

// PNG mínimo válido com dimensões arbitrárias: assinatura + IHDR com largura/altura reais.
function fakePng(width, height, filler = 'a') {
  const header = Buffer.alloc(33);
  header.write('\x89PNG\r\n\x1a\n', 0, 'binary');
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header[24] = 8;
  header[25] = 2;
  return Buffer.concat([header, Buffer.from(filler, 'ascii')]);
}

const approval = {
  id: 'AV-test', pr: 1, mergeCommit: 'a'.repeat(40), approvedBy: 'dono',
  approvedAt: '2026-10-01', screen: 'tela', decision: 'aprovado',
  evidence: 'corpo da PR', documentedIn: [],
};

test('sha256 do validador devolve hex de 64 caracteres igual ao node:crypto', () => {
  for (const size of [0, 1, 55, 56, 63, 64, 65, 200, 1024]) {
    const buffer = Buffer.alloc(size, 7);
    assert.equal(sha256OfBuffer(buffer), createHash('sha256').update(buffer).digest('hex'), `tamanho ${size}`);
  }
});

test('registro coerente passa sem erros', () => {
  const png = { path: 'docs/m/ok.png', sha256: 'f'.repeat(64), width: 10, height: 20, bytes: 512 };
  const errors = validateRegistry(
    { approvals: [approval], assets: [{ ...png, kind: 'proposta', approvalId: 'AV-test' }] },
    [png],
  );
  assert.deepEqual(errors, []);
});

test('imagem aprovada trocada no disco é reprovada pelo hash', () => {
  const errors = validateRegistry(
    { approvals: [approval], assets: [{ path: 'docs/m/ok.png', kind: 'base', approvalId: null, sha256: 'f'.repeat(64), width: 10, height: 20, bytes: 512 }] },
    [{ path: 'docs/m/ok.png', sha256: '0'.repeat(64), width: 10, height: 20, bytes: 512 }],
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /hash divergente/);
});

test('PNG novo fora do registro é reprovado', () => {
  const errors = validateRegistry({ approvals: [], assets: [] }, [{ path: 'docs/m/solto.png', sha256: 'a'.repeat(64), width: 1, height: 1 }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /fora do registro/);
});

test('proposta apontando para aprovacao inexistente ou nao aprovada é reprovada', () => {
  const png = { path: 'docs/m/p.png', sha256: 'b'.repeat(64), width: 1, height: 1 };
  const inexistente = validateRegistry(
    { approvals: [approval], assets: [{ ...png, kind: 'proposta', approvalId: 'AV-nao-existe' }] },
    [png],
  );
  assert.ok(inexistente.some((e) => /aprovacao inexistente/.test(e)));

  const recusada = validateRegistry(
    { approvals: [{ ...approval, decision: 'recusado' }], assets: [{ ...png, kind: 'proposta', approvalId: 'AV-test' }] },
    [png],
  );
  assert.ok(recusada.some((e) => /nao aprovada/.test(e)));
});

test('aprovacao sem dono, data, PR ou merge commit completo é reprovada', () => {
  const incompleta = { ...approval, approvedBy: '', approvedAt: '01/10/2026', pr: '1', mergeCommit: 'abc' };
  const errors = validateRegistry({ approvals: [incompleta], assets: [] }, []);
  assert.ok(errors.some((e) => /approvedBy/.test(e)));
  assert.ok(errors.some((e) => /approvedAt/.test(e)));
  assert.ok(errors.some((e) => /numero de PR/.test(e)));
  assert.ok(errors.some((e) => /mergeCommit/.test(e)));
});

test('pngDimensions lê IHDR e ignora arquivo que não é PNG', () => {
  assert.deepEqual(pngDimensions(fakePng(390, 844)), { width: 390, height: 844 });
  assert.equal(pngDimensions(Buffer.from('nao é png')), null);
});

test('CLI termina com exit 1 e nomeia o arquivo quando o hash muda', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aprovacao-visual-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(root, 'scripts', 'validate-visual-approvals.mjs'));
  fs.mkdirSync(path.join(root, 'docs', 'aprovacoes-visuais'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'mockups'), { recursive: true });

  const png = fakePng(100, 50);
  fs.writeFileSync(path.join(root, 'docs', 'mockups', 'a.png'), png);
  const registry = {
    version: 1,
    roots: ['docs/mockups'],
    approvals: [{ ...approval, documentedIn: [] }],
    assets: [{ path: 'docs/mockups/a.png', kind: 'proposta', approvalId: 'AV-test', sha256: sha256OfBuffer(png), width: 100, height: 50, bytes: png.length }],
  };
  const registryPath = path.join(root, 'docs', 'aprovacoes-visuais', 'registro.json');
  fs.writeFileSync(registryPath, JSON.stringify(registry));

  const ok = spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-visual-approvals.mjs')], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /16|1 PNGs/);

  fs.writeFileSync(path.join(root, 'docs', 'mockups', 'a.png'), fakePng(100, 50, 'b'));
  const falha = spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-visual-approvals.mjs')], { encoding: 'utf8' });
  assert.equal(falha.status, 1);
  assert.match(falha.stderr, /hash divergente em docs\/mockups\/a\.png/);
});

test('id de aprovacao repetido é reprovado', () => {
  const png = { path: 'docs/m/ok.png', sha256: 'f'.repeat(64), width: 10, height: 20, bytes: 100 };
  const errors = validateRegistry(
    { approvals: [approval, { ...approval, screen: 'outra tela' }], assets: [{ ...png, kind: 'proposta', approvalId: 'AV-test' }] },
    [png],
  );
  assert.ok(errors.some((e) => /repetida/.test(e)), errors.join('; '));
});

test('tamanho em bytes ausente ou em texto é reprovado', () => {
  const disk = [{ path: 'docs/m/ok.png', sha256: 'f'.repeat(64), width: 10, height: 20, bytes: 512 }];
  for (const bytes of [undefined, '512', 512.5, null]) {
    const errors = validateRegistry(
      { approvals: [approval], assets: [{ ...disk[0], kind: 'base', approvalId: null, sha256: 'f'.repeat(64), width: 10, height: 20, bytes }] },
      disk,
    );
    assert.equal(errors.length, 1, `bytes=${String(bytes)} deveria reprovar`);
    assert.match(errors[0], /tamanho ausente ou invalido/);
  }
});

test('tamanho em bytes divergente do disco é reprovado', () => {
  const png = { path: 'docs/m/ok.png', sha256: 'f'.repeat(64), width: 10, height: 20, bytes: 100 };
  const errors = validateRegistry(
    { approvals: [approval], assets: [{ ...png, kind: 'proposta', approvalId: 'AV-test', bytes: 101 }] },
    [png],
  );
  assert.ok(errors.some((e) => /tamanho divergente/.test(e)), errors.join('; '));
});

test('pasta de mockup fora de roots é reprovada', () => {
  const entries = [
    { name: 'mockups-carnegie-20261005', isDirectory: () => true },
    { name: 'mockups-nova-tela-20270101', isDirectory: () => true },
    { name: 'audits', isDirectory: () => true },
  ];
  assert.deepEqual(findUnregisteredRoots(['docs/mockups-carnegie-20261005'], entries), ['docs/mockups-nova-tela-20270101']);
});

test('PNG em subpasta da raiz de mockups também é coletado', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'aprovacao-roots-'));
  const raiz = path.join(base, 'docs', '__fixture-roots');
  fs.mkdirSync(path.join(raiz, 'sub', 'mais-fundo'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'a.png'), fakePng(10, 20, 'a'));
  fs.writeFileSync(path.join(raiz, 'sub', 'b.png'), fakePng(10, 20, 'b'));
  fs.writeFileSync(path.join(raiz, 'sub', 'mais-fundo', 'c.png'), fakePng(10, 20, 'c'));
  try {
    const paths = listAssetsFromDisk(['docs/__fixture-roots'], base).map((f) => f.path).sort();
    assert.deepEqual(paths, [
      'docs/__fixture-roots/a.png',
      'docs/__fixture-roots/sub/b.png',
      'docs/__fixture-roots/sub/mais-fundo/c.png',
    ]);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('kind fora de base/proposta é reprovado', () => {
  const png = { path: 'docs/m/ok.png', sha256: 'f'.repeat(64), width: 10, height: 20, bytes: 100 };
  const errors = validateRegistry(
    { approvals: [approval], assets: [{ ...png, kind: 'Proposta', approvalId: 'AV-test' }] },
    [png],
  );
  assert.ok(errors.some((e) => /tipo de asset invalido/.test(e)), errors.join('; '));
});

test('registro real do repositorio está íntegro', () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  assert.ok(registry.approvals.length >= 4);
  assert.ok(registry.assets.length >= 16);
  assert.ok(registry.assets.every((asset) => asset.sha256.length === 64));
  // Valida contra os PNGs em disco: e este teste que roda no hook (pre-commit e
  // pre-push via testSuites), entao ele precisa reprovar um mockup trocado ou
  // fora do registro. Conferir so o formato do JSON deixava o hook passar verde
  // enquanto `npm run approvals:visual:check` reprovava no check completo.
  const errors = validateRegistry(registry, listAssetsFromDisk(registry.roots ?? []));
  assert.deepEqual(errors, []);
  // A descoberta de pastas tambem precisa rodar no hook: sem isto o teste passaria
  // verde enquanto um PNG em `docs/mockups-nova/` ficasse fora do registro.
  assert.deepEqual(findUnregisteredRoots(registry.roots ?? []), []);
});
