import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../.claude/hooks/session-start.sh', import.meta.url));
const BASH = ['/bin/bash', '/usr/bin/bash'].find((candidate) => fs.existsSync(candidate));
const skip = process.platform === 'win32' || !BASH ? 'o hook só roda em sessões Linux com bash' : false;
const SYSTEM_TOOLS = ['dirname', 'date', 'mkdir', 'wc', 'tail', 'sed', 'head', 'grep', 'cat', 'rm', 'git', 'flock'];
const PINNED = '9.9.9';

function findTool(name) {
  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(directory, name);
    if (directory && fs.existsSync(candidate)) return candidate;
  }
  return '';
}

function writeStub(file, body) {
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

/**
 * Clone falso com o hook real e um PATH fechado: só as ferramentas de sistema listadas e os
 * stubs de graphify/uv/python3/npm. Nenhum cenário instala pacote, usa rede ou gera grafo real.
 */
function makeHookFixture({ tools = SYSTEM_TOOLS, graphifyVersion = PINNED, requirements = `# fixado\ngraphifyy[sql]==${PINNED}\ntree_sitter_sql==0.3.5\n` } = {}) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'session-start-')));
  const root = path.join(base, 'clone com espaço');
  const bin = path.join(base, 'bin');
  const calls = path.join(base, 'chamadas.log');
  fs.mkdirSync(path.join(root, '.claude', 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(root, 'node_modules', 'typescript'), { recursive: true });
  fs.mkdirSync(bin);
  fs.copyFileSync(HOOK, path.join(root, '.claude', 'hooks', 'session-start.sh'));
  fs.writeFileSync(path.join(root, 'requirements-graphify.txt'), requirements);
  fs.writeFileSync(path.join(root, '.gitignore'), 'graphify-out/\nnode_modules/\n');
  const git = (...args) => execFileSync('git', ['-c', 'user.email=teste@example.invalid', '-c', 'user.name=teste', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q', '-b', 'main', '.');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  for (const name of tools) {
    const real = findTool(name);
    if (real) fs.symlinkSync(real, path.join(bin, name));
  }
  if (graphifyVersion) writeStub(path.join(bin, 'graphify'), `echo "graphify ${graphifyVersion}"`);
  writeStub(path.join(bin, 'uv'), `echo "uv $*" >> "${calls}"\nexit 1`);
  writeStub(path.join(bin, 'python3'), `echo "python3 $*" >> "${calls}"\nexit 1`);
  // O npm falso faz o que a promoção real faz com o diretório de saída: troca tudo.
  writeStub(path.join(bin, 'npm'), `echo "npm $*" >> "${calls}"\nif [ "$1" = "run" ]; then mkdir -p graphify-out/database && echo '{}' > graphify-out/graph.json && echo '{}' > graphify-out/database/graph.json && echo '{}' > graphify-out/project-meta.json && echo r > graphify-out/GRAPH_REPORT.md; fi`);
  const output = path.join(root, 'graphify-out');
  return {
    base,
    root,
    bin,
    output,
    head: git('rev-parse', 'HEAD'),
    calls: () => (fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8') : ''),
    log: () => fs.readFileSync(path.join(output, '.session-start.log'), 'utf8'),
    writeGraph(commit) {
      fs.mkdirSync(path.join(output, 'database'), { recursive: true });
      for (const file of ['graph.json', 'GRAPH_REPORT.md', 'project-meta.json', 'database/graph.json']) fs.writeFileSync(path.join(output, file), '{}\n');
      if (commit) fs.writeFileSync(path.join(output, '.session-built-commit'), `${commit}\n`);
    },
    run({ env = {}, cwd = root, input = '' } = {}) {
      return spawnSync(BASH, [path.join(root, '.claude', 'hooks', 'session-start.sh')], {
        cwd,
        input,
        encoding: 'utf8',
        timeout: 60_000,
        env: { PATH: bin, HOME: path.join(base, 'home'), CLAUDE_CODE_REMOTE: 'true', CLAUDE_PROJECT_DIR: root, ...env },
      });
    },
    cleanup: () => fs.rmSync(base, { recursive: true, force: true }),
  };
}

test('hook: fora da sessão remota sai com 0 sem saída e sem criar nada', { skip }, () => {
  const fixture = makeHookFixture();
  try {
    const result = fixture.run({ env: { CLAUDE_CODE_REMOTE: '' } });
    assert.equal(result.status, 0);
    assert.equal(result.stdout + result.stderr, '');
    assert.equal(fs.existsSync(fixture.output), false);
  } finally {
    fixture.cleanup();
  }
});

test('hook: grafo já carimbado no commit atual responde async e não instala nem gera', { skip }, () => {
  const fixture = makeHookFixture();
  try {
    fixture.writeGraph(fixture.head);
    const result = fixture.run({ input: '{"hook_event_name":"SessionStart","source":"startup"}' });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '{"async": true, "asyncTimeout": 900000}\n');
    assert.doesNotThrow(() => JSON.parse(result.stdout));
    assert.equal(result.stderr, '');
    assert.match(fixture.log(), new RegExp(`grafo já está no commit ${fixture.head} — nada a fazer`));
    assert.equal(fixture.calls(), '', 'nenhuma instalação nem build');
  } finally {
    fixture.cleanup();
  }
});

test('hook: grafo de outro commit dispara o build e carimba o commit novo', { skip }, () => {
  const fixture = makeHookFixture();
  try {
    fixture.writeGraph('0000000000000000000000000000000000000000');
    const result = fixture.run();
    assert.equal(result.status, 0);
    assert.equal(fixture.calls(), 'npm run graph:build\n');
    assert.equal(fs.readFileSync(path.join(fixture.output, '.session-built-commit'), 'utf8'), `${fixture.head}\n`);
    assert.match(fixture.log(), /grafo pronto no commit/);
  } finally {
    fixture.cleanup();
  }
});

test('hook: carimbo sem o mapa de banco não conta como grafo pronto', { skip }, () => {
  const fixture = makeHookFixture();
  try {
    fixture.writeGraph(fixture.head);
    fs.rmSync(path.join(fixture.output, 'database'), { recursive: true });
    fixture.run();
    assert.equal(fixture.calls(), 'npm run graph:build\n');
  } finally {
    fixture.cleanup();
  }
});

test('hook: sem graphify e sem rede registra a etapa que falhou e sai com 0', { skip }, () => {
  const fixture = makeHookFixture({ graphifyVersion: '' });
  try {
    const result = fixture.run();
    assert.equal(result.status, 0, 'falha de instalação não pode derrubar a sessão');
    assert.equal(result.stdout, '{"async": true, "asyncTimeout": 900000}\n');
    assert.match(fixture.calls(), /^uv pip install --system -r requirements-graphify\.txt\npython3 -m pip install --user --quiet -r requirements-graphify\.txt\n$/, 'tenta uv e cai para o pip');
    assert.match(fixture.log(), /session-start: FALHOU ao instalar o Graphify fixado \(requirements-graphify\.txt\) \(código 1, linha \d+\)/);
    assert.doesNotMatch(fixture.calls(), /npm/);
  } finally {
    fixture.cleanup();
  }
});

test('hook: npm ci quebrado é registrado e não vira falha da sessão', { skip }, () => {
  const fixture = makeHookFixture();
  try {
    fs.rmSync(path.join(fixture.root, 'node_modules'), { recursive: true });
    writeStub(path.join(fixture.bin, 'npm'), 'echo "npm ERR! sem rede" >&2\nexit 1');
    const result = fixture.run();
    assert.equal(result.status, 0);
    assert.match(fixture.log(), /npm ERR! sem rede/);
    assert.match(fixture.log(), /session-start: FALHOU ao instalar dependências \(npm ci\)/);
    assert.equal(fs.existsSync(path.join(fixture.output, '.session-built-commit')), false);
  } finally {
    fixture.cleanup();
  }
});

test('hook: sem CLAUDE_PROJECT_DIR usa a raiz do próprio arquivo, não o diretório corrente', { skip }, () => {
  const fixture = makeHookFixture();
  try {
    fixture.writeGraph(fixture.head);
    const elsewhere = path.join(fixture.base, 'outro-diretorio');
    fs.mkdirSync(elsewhere);
    for (const env of [{ CLAUDE_PROJECT_DIR: '' }, { CLAUDE_PROJECT_DIR: elsewhere }, { CLAUDE_PROJECT_DIR: path.join(fixture.base, 'nao-existe') }]) {
      const result = fixture.run({ cwd: elsewhere, env });
      assert.equal(result.status, 0);
      assert.deepEqual(fs.readdirSync(elsewhere), [], 'nada pode ser criado fora do repositório');
    }
    assert.equal(fixture.log().match(/nada a fazer/g).length, 3);
  } finally {
    fixture.cleanup();
  }
});

test('hook: requirements com CRLF ou hash não força reinstalação quando a versão já confere', { skip }, () => {
  for (const requirements of [`graphifyy[sql]==${PINNED}\r\ntree_sitter_sql==0.3.5\r\n`, `graphifyy[sql]==${PINNED} \\\n    --hash=sha256:abc\n`]) {
    const fixture = makeHookFixture({ requirements });
    try {
      fixture.writeGraph(fixture.head);
      assert.equal(fixture.run().status, 0);
      assert.equal(fixture.calls(), '', JSON.stringify(requirements));
      assert.match(fixture.log(), /nada a fazer/);
    } finally {
      fixture.cleanup();
    }
  }
});

test('hook: versão instalada diferente da fixada tenta reinstalar e avisa no log', { skip }, () => {
  const fixture = makeHookFixture({ graphifyVersion: '0.0.1' });
  try {
    writeStub(path.join(fixture.bin, 'uv'), 'exit 0');
    fixture.writeGraph(fixture.head);
    assert.equal(fixture.run().status, 0);
    assert.match(fixture.log(), /aviso: o graphify no PATH não é o 9\.9\.9 fixado/);
  } finally {
    fixture.cleanup();
  }
});

test('hook: sem flock no PATH ainda gera o grafo em vez de sair como "já está rodando"', { skip }, () => {
  const fixture = makeHookFixture({ tools: SYSTEM_TOOLS.filter((name) => name !== 'flock') });
  try {
    const result = fixture.run();
    assert.equal(result.status, 0);
    assert.doesNotMatch(fixture.log(), /já está rodando/);
    assert.match(fixture.log(), /flock indisponível/);
    assert.equal(fixture.calls(), 'npm run graph:build\n');
  } finally {
    fixture.cleanup();
  }
});

test('hook: segunda execução simultânea no mesmo clone sai na hora', { skip: skip || (findTool('flock') ? false : 'flock ausente neste ambiente') }, () => {
  const fixture = makeHookFixture();
  try {
    fs.mkdirSync(fixture.output);
    const lockFile = path.join(fixture.output, '.session-start.lock');
    fs.writeFileSync(lockFile, '');
    const holder = spawnSync(findTool('flock'), ['-n', lockFile, BASH, path.join(fixture.root, '.claude', 'hooks', 'session-start.sh')], {
      cwd: fixture.root,
      encoding: 'utf8',
      env: { PATH: fixture.bin, HOME: fixture.base, CLAUDE_CODE_REMOTE: 'true', CLAUDE_PROJECT_DIR: fixture.root },
    });
    assert.equal(holder.status, 0);
    assert.match(fixture.log(), /outro session-start já está rodando neste clone — saindo/);
    assert.equal(fixture.calls(), '');
  } finally {
    fixture.cleanup();
  }
});

test('hook: log acima de 1 MB é recortado sem perder a execução atual', { skip }, () => {
  const fixture = makeHookFixture();
  try {
    fixture.writeGraph(fixture.head);
    fs.writeFileSync(path.join(fixture.output, '.session-start.log'), `${'linha antiga de log\n'.repeat(60_000)}`);
    assert.equal(fixture.run().status, 0);
    const log = fixture.log();
    assert.ok(Buffer.byteLength(log) < 64 * 1024, `log ficou com ${Buffer.byteLength(log)} bytes`);
    assert.match(log, /log anterior recortado/);
    assert.match(log, /nada a fazer/);
  } finally {
    fixture.cleanup();
  }
});

test('hook: sintaxe válida (bash -n)', { skip }, () => {
  const result = spawnSync(BASH, ['-n', HOOK], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
