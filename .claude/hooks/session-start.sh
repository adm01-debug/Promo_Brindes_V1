#!/bin/bash
# Sessão na nuvem: instala o Graphify fixado e gera/atualiza o grafo em graphify-out/.
# graphify-out/ está no .gitignore, então cada clone precisa gerar o seu; sem isso os agentes
# da nuvem não têm graph.json nem GRAPH_REPORT.md e buscam por texto às cegas.
# - Só roda com CLAUDE_CODE_REMOTE=true (local: pip install -r requirements-graphify.txt + npm run graph:build).
# - Assíncrono: o build leva minutos e não segura o início da sessão.
# - Pula se o grafo já foi gerado no commit atual (marca em graphify-out/.session-built-commit).
# Log de tudo (instalação inclusive): graphify-out/.session-start.log
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 900000}'

cd "${CLAUDE_PROJECT_DIR:-.}"
export PATH="$HOME/.local/bin:$PATH"
export PIP_DISABLE_PIP_VERSION_CHECK=1
export PYTHONHASHSEED=0
mkdir -p graphify-out
LOG=graphify-out/.session-start.log
MARCA=graphify-out/.session-built-commit

exec >>"$LOG" 2>&1
echo "== $(date -u +%FT%TZ) session-start"

# O hook também dispara em resume/clear/compact, que podem cair no meio de um build de
# minutos: só um por vez neste clone. O segundo sai na hora; o primeiro termina e carimba.
exec 9>graphify-out/.session-start.lock
if ! flock -n 9; then
  echo "outro session-start já está rodando neste clone — saindo"
  exit 0
fi

# Versão fixada em requirements-graphify.txt — a mesma que o graphify.yml instala.
# O wrapper exige que o binário case com graphifyVersion em .graphify.project.json.
esperado="$(sed -n 's/^graphifyy\[sql\]==\([0-9.]*\)$/\1/p' requirements-graphify.txt)"
if ! graphify --version 2>/dev/null | grep -qx "graphify ${esperado}"; then
  if command -v uv >/dev/null 2>&1; then
    uv pip install --system -r requirements-graphify.txt
  else
    python3 -m pip install --user --quiet -r requirements-graphify.txt
  fi
fi
graphify --version

head_sha="$(git rev-parse HEAD)"
if [ -f graphify-out/graph.json ] && [ -f graphify-out/GRAPH_REPORT.md ] && [ "$(cat "$MARCA" 2>/dev/null)" = "$head_sha" ]; then
  echo "grafo já está no commit $head_sha — nada a fazer"
  exit 0
fi

# scripts/graphify-quality.mjs importa typescript: sem node_modules o wrapper não roda.
if [ ! -d node_modules/typescript ]; then
  npm ci
fi

rm -f "$MARCA"
npm run graph:build
# O build leva minutos e roda em segundo plano: se o checkout mudou no meio, não carimba —
# a próxima sessão refaz.
if [ "$(git rev-parse HEAD)" = "$head_sha" ]; then
  echo "$head_sha" > "$MARCA"
  echo "grafo pronto no commit $head_sha"
else
  echo "HEAD mudou durante o build ($head_sha -> $(git rev-parse HEAD)); marca não gravada"
fi
