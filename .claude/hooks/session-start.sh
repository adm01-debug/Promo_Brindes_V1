#!/bin/bash
# Sessão na nuvem: instala o Graphify fixado e gera/atualiza o grafo em graphify-out/.
# graphify-out/ está no .gitignore, então cada clone precisa gerar o seu; sem isso os agentes
# da nuvem não têm graph.json nem GRAPH_REPORT.md e buscam por texto às cegas.
# - Só roda com CLAUDE_CODE_REMOTE=true (local: pip install -r requirements-graphify.txt + npm run graph:build).
# - Assíncrono: o build leva minutos e não segura o início da sessão.
# - Pula se o grafo já foi gerado no commit atual (marca em graphify-out/.session-built-commit).
# - Nunca derruba a sessão: qualquer falha (sem rede, CLI ausente, npm ci quebrado) vai para o
#   log com a etapa que falhou e o hook sai com 0.
# Log de tudo (instalação inclusive): graphify-out/.session-start.log
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 900000}'

etapa="localizar o repositório"
linha_erro=""
trap 'linha_erro=$LINENO' ERR
trap 'codigo=$?
if [ "$codigo" -ne 0 ]; then
  echo "session-start: FALHOU ao ${etapa} (código ${codigo}${linha_erro:+, linha ${linha_erro}}). O grafo não foi atualizado; a sessão segue sem ele." >&2
fi
exit 0' EXIT

# Nada daqui em diante lê a entrada do harness; os filhos (pip, npm) também não devem esperá-la.
exec </dev/null

# CLAUDE_PROJECT_DIR ausente ou apontando para fora do repo não pode fazer o hook criar
# graphify-out/ no diretório corrente: a raiz de reserva é a deste próprio arquivo.
raiz="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$raiz" ] || [ ! -f "$raiz/requirements-graphify.txt" ]; then
  raiz="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
fi
cd "$raiz"
export PATH="${HOME:-}/.local/bin:$PATH"
export PIP_DISABLE_PIP_VERSION_CHECK=1
export PYTHONHASHSEED=0
mkdir -p graphify-out
LOG=graphify-out/.session-start.log
MARCA=graphify-out/.session-built-commit

exec >>"$LOG" 2>&1
echo "== $(date -u +%FT%TZ) session-start"

# O hook também dispara em resume/clear/compact, que podem cair no meio de um build de
# minutos: só um por vez neste clone. O segundo sai na hora; o primeiro termina e carimba.
# Sem flock no PATH não há como saber: segue, e o wrapper ainda trava o build em
# .graphify-work/build.lock.
if command -v flock >/dev/null 2>&1; then
  exec 9>graphify-out/.session-start.lock
  if ! flock -n 9; then
    echo "outro session-start já está rodando neste clone — saindo"
    exit 0
  fi
else
  echo "flock indisponível — sem exclusão entre sessões deste clone"
fi

# O wrapper preserva este log entre builds; mantém só o final quando passar de 1 MB
# (regravado no mesmo arquivo, que continua aberto para append).
if [ "$(wc -c <"$LOG")" -gt 1048576 ]; then
  recorte="$(tail -n 400 "$LOG")"
  printf '%s\n' "$recorte" >"$LOG"
  echo "== log anterior recortado para as últimas 400 linhas"
fi

# Versão fixada em requirements-graphify.txt — a mesma que o graphify.yml instala.
# O wrapper exige que o binário case com graphifyVersion em .graphify.project.json.
etapa="ler a versão fixada em requirements-graphify.txt"
esperado="$(sed -n 's/^graphifyy\[sql\]==\([0-9][0-9.]*\).*$/\1/p' requirements-graphify.txt | head -n 1)"
if [ -z "$esperado" ]; then
  echo "aviso: requirements-graphify.txt sem linha graphifyy[sql]==<versão>; reinstalando pelo arquivo"
fi
if [ -z "$esperado" ] || ! graphify --version 2>/dev/null | grep -qx "graphify ${esperado}"; then
  etapa="instalar o Graphify fixado (requirements-graphify.txt)"
  if ! { command -v uv >/dev/null 2>&1 && uv pip install --system -r requirements-graphify.txt; }; then
    python3 -m pip install --user --quiet -r requirements-graphify.txt
  fi
fi
etapa="executar o Graphify instalado"
versao="$(graphify --version)"
echo "$versao"
if [ -n "$esperado" ] && [ "$versao" != "graphify ${esperado}" ]; then
  echo "aviso: o graphify no PATH não é o ${esperado} fixado em requirements-graphify.txt (encontrado: ${versao})"
fi

etapa="ler o commit atual (git rev-parse HEAD)"
head_sha="$(git rev-parse HEAD)"
if [ -f graphify-out/graph.json ] && [ -f graphify-out/GRAPH_REPORT.md ] \
  && [ -f graphify-out/database/graph.json ] && [ -f graphify-out/project-meta.json ] \
  && [ "$(cat "$MARCA" 2>/dev/null)" = "$head_sha" ]; then
  echo "grafo já está no commit $head_sha — nada a fazer"
  exit 0
fi

# scripts/graphify-quality.mjs importa typescript: sem node_modules o wrapper não roda.
if [ ! -d node_modules/typescript ]; then
  etapa="instalar dependências (npm ci)"
  npm ci
fi

rm -f "$MARCA"
etapa="gerar o grafo (npm run graph:build)"
npm run graph:build
# O build leva minutos e roda em segundo plano: se o checkout mudou no meio, não carimba —
# a próxima sessão refaz.
etapa="carimbar o commit do grafo"
if [ "$(git rev-parse HEAD)" = "$head_sha" ]; then
  echo "$head_sha" > "$MARCA"
  echo "grafo pronto no commit $head_sha"
else
  echo "HEAD mudou durante o build ($head_sha -> $(git rev-parse HEAD)); marca não gravada"
fi
