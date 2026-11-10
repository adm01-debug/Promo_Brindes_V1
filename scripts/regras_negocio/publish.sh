#!/usr/bin/env bash
# Publica docs/ai-context gerados: commit + push na branch padrão, ou PR quando a branch é protegida.
# Rode a partir da raiz do repositório. `bash publish.sh --help` mostra este cabeçalho.
# Variáveis:
#   BRANCH          branch alvo (default: branch atual)
#   OUT_DIR         pasta gerada, relativa à raiz do repo (default: docs/ai-context)
#   MODE            push | pr | branch
#                   push   = commit direto na branch padrão (cai para pr se rejeitado e gh existir)
#                   pr     = abre/atualiza uma PR a partir de ai-context/sync
#                   branch = publica em branch derivada BRANCH_OUT (= branch padrão + 1 commit, force-push com lease),
#                            preservando as pastas de outros produtores (KEEP_DIRS) e regenerando o índice (INDEX_CMD).
#                            É o desenho para repos com main protegida e vários produtores numa branch só.
#   BRANCH_OUT      branch derivada (default: contexto). Nunca é alvo de push/pr nem origem de publicação.
#   KEEP_DIRS       pastas de outros produtores a preservar na branch derivada, separadas por espaço (sem espaço no nome)
#   INDEX_CMD       comando que (re)gera o índice único depois de montar a branch (opcional)
#   PUSH_URL        URL de push com token (CI com persist-credentials: false), ex.: https://x-access-token:$TOKEN@github.com/o/r.git
#   GEN_CMD         comando para regenerar após rebase (default: python3 <pasta deste script>/generate.py --repo . --out $OUT_DIR)
#   GIT_USER_NAME / GIT_USER_EMAIL   autoria dos commits gerados (default: ai-context-bot); a config git do repo não é alterada
# Saída: 0 = publicado ou nada a publicar · 1 = falha (nada parcial fica publicado) · 2 = uso inválido
set -euo pipefail

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '2,/^set -euo pipefail$/p' "$0" | sed '$d; s/^# \{0,1\}//'
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${MODE:-push}"
OUT_DIR="${OUT_DIR:-docs/ai-context}"
OUT_DIR="${OUT_DIR%/}"
BRANCH_OUT="${BRANCH_OUT:-contexto}"

case "$MODE" in
  push|pr|branch) ;;
  *) echo "ERRO: MODE='$MODE' inválido — use push, pr ou branch. Nada foi publicado." >&2; exit 2 ;;
esac
case "/$OUT_DIR/" in
  //|*/../*|*/./*) echo "ERRO: OUT_DIR='$OUT_DIR' inválido — informe uma pasta relativa à raiz do repositório, sem '..'." >&2; exit 2 ;;
esac
case "$OUT_DIR" in
  /*) echo "ERRO: OUT_DIR='$OUT_DIR' inválido — informe uma pasta relativa à raiz do repositório, sem '..'." >&2; exit 2 ;;
esac
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERRO: $(pwd) não é um repositório git. Nada foi publicado." >&2; exit 1
fi
if [ -n "$(git rev-parse --show-cdup)" ]; then
  echo "ERRO: rode a partir da raiz do repositório ($(git rev-parse --show-toplevel)). Nada foi publicado." >&2; exit 1
fi
if [ ! -d "$OUT_DIR" ]; then
  echo "ERRO: $OUT_DIR não existe — gere a saída antes de publicar. Nada foi publicado." >&2; exit 1
fi

CURRENT_BRANCH="$(git symbolic-ref -q --short HEAD || true)"
BRANCH="${BRANCH:-$CURRENT_BRANCH}"
GEN_CMD="${GEN_CMD:-python3 $(printf '%q' "$SCRIPT_DIR/generate.py") --repo . --out $(printf '%q' "$OUT_DIR")}"
PR_BRANCH="ai-context/sync"
MSG="chore(ai-context): atualiza contexto para agentes [skip ci]"

# Autoria só para os commits desta execução: `git config` trocaria a identidade de quem roda fora de um runner efêmero.
export GIT_AUTHOR_NAME="${GIT_USER_NAME:-ai-context-bot}"
export GIT_AUTHOR_EMAIL="${GIT_USER_EMAIL:-ai-context-bot@users.noreply.github.com}"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

PUSH_ERR="$(mktemp "${TMPDIR:-/tmp}/publish-push-err.XXXXXX")"
cleanup() { rm -f "$PUSH_ERR"; }
trap cleanup EXIT

stage() {
  git add -f -A "$OUT_DIR"   # -f: a saída gerada pode estar no .gitignore da branch padrão (versionada só na branch derivada)
  for f in CLAUDE.md AGENTS.md; do [ -f "$f" ] && git add "$f" || true; done
}

assert_no_foreign_staged_changes() {
  local path
  while IFS= read -r -d '' path; do
    case "$path" in
      "$OUT_DIR"|"$OUT_DIR"/*|CLAUDE.md|AGENTS.md) ;;
      *)
        echo "ERRO: há alteração staged fora da saída gerada: $path. Nada foi publicado." >&2
        return 1
        ;;
    esac
  done < <(git diff --cached --name-only -z)
}

if [ "$MODE" != "branch" ]; then
  if [ -z "$BRANCH" ]; then
    echo "ERRO: HEAD destacado e BRANCH não definida — informe BRANCH=<branch alvo>. Nada foi publicado." >&2; exit 1
  fi
  if [ "$BRANCH" = "$BRANCH_OUT" ] || [ "$CURRENT_BRANCH" = "$BRANCH_OUT" ]; then
    echo "ERRO: '$BRANCH_OUT' é a branch gerada — ela só recebe MODE=branch a partir da branch padrão e nunca vira PR. Nada foi publicado." >&2; exit 1
  fi
  # No modo branch a saída é versionada só na branch derivada (stage usa -f); aqui ela precisa ser commitável.
  if git check-ignore -q "$OUT_DIR"; then
    echo "ERRO: $OUT_DIR está no .gitignore — os docs nunca seriam commitados. Remova a regra ou mude AI_CONTEXT_OUT."; exit 1
  fi
fi
assert_no_foreign_staged_changes
if [ "$MODE" = "branch" ]; then
  # Branch derivada = branch padrão + 1 commit. Nunca toca a branch de origem: trabalha em HEAD destacado.
  if [ "$CURRENT_BRANCH" = "$BRANCH_OUT" ]; then
    echo "ERRO: a branch atual já é a branch gerada ($BRANCH_OUT) — publique a partir da branch padrão. Nada foi publicado." >&2; exit 1
  fi
  read -r -a KEEP <<< "${KEEP_DIRS:-}"
  KEEP_CREATED=()
  for d in ${KEEP[@]+"${KEEP[@]}"}; do
    case "/$d/" in
      *//*|*/../*|*/./*|/-*) echo "ERRO: KEEP_DIRS contém '$d' — informe pastas relativas à raiz do repositório, sem '..'." >&2; exit 2 ;;
    esac
    [ -e "$d" ] || KEEP_CREATED+=("$d")
  done
  SRC=$(git rev-parse HEAD)
  SRC_REF="${CURRENT_BRANCH:-$SRC}"
  OURS=""
  restore_source() {
    # Volta para a branch de origem com o índice limpo e a saída gerada de volta na árvore, como estava antes.
    git checkout -q "$SRC_REF" 2>/dev/null || true
    git reset -q 2>/dev/null || true
    if [ -n "$OURS" ]; then
      git checkout -q "$OURS" -- "$OUT_DIR" 2>/dev/null || true
      for f in CLAUDE.md AGENTS.md; do git checkout -q "$OURS" -- "$f" 2>/dev/null || true; done
      git reset -q 2>/dev/null || true
    fi
    # pastas de outros produtores que só existiam na branch derivada não ficam para trás na árvore de origem
    for d in ${KEEP_CREATED[@]+"${KEEP_CREATED[@]}"}; do git clean -q -fdx -- "$d" 2>/dev/null || true; done
  }
  trap 'restore_source; cleanup' EXIT   # sempre volta para a branch de origem, mesmo em erro
  git checkout -q --detach "$SRC"
  stage
  git commit -q -m "$MSG" --allow-empty
  OURS=$(git rev-parse HEAD)
  REMOTE_REF="refs/remotes/origin/$BRANCH_OUT"
  for attempt in 1 2 3; do
    # ls-remote separa "a branch ainda não existe" (2) de falha de rede: publicar sem enxergar a branch
    # antiga apagaria as pastas dos outros produtores.
    HAS_OLD=0; OLD_SHA=""
    ls_status=0
    git ls-remote --exit-code --heads origin "$BRANCH_OUT" >/dev/null 2>"$PUSH_ERR" || ls_status=$?
    if [ "$ls_status" = 0 ]; then
      # refspec explícito: num clone raso/single-branch `git fetch origin <branch>` só atualiza FETCH_HEAD
      git fetch -q origin "+refs/heads/$BRANCH_OUT:$REMOTE_REF"
      HAS_OLD=1; OLD_SHA=$(git rev-parse "$REMOTE_REF")
    elif [ "$ls_status" != 2 ]; then
      echo "ERRO: não foi possível consultar origin/$BRANCH_OUT — nada foi publicado:" >&2; cat "$PUSH_ERR" >&2; exit 1
    fi
    git checkout -q --detach "$SRC"
    if [ "$HAS_OLD" = 1 ]; then
      for d in ${KEEP[@]+"${KEEP[@]}"}; do   # saídas dos outros produtores
        if git cat-file -e "$REMOTE_REF:$d" 2>/dev/null; then git checkout -q "$REMOTE_REF" -- "$d"; fi
      done
    fi
    git checkout -q "$OURS" -- "$OUT_DIR"                                                            # a nossa saída
    for f in CLAUDE.md AGENTS.md; do git checkout -q "$OURS" -- "$f" 2>/dev/null || true; done
    if [ -n "${INDEX_CMD:-}" ]; then eval "$INDEX_CMD"; git add -f -A "$(dirname "$OUT_DIR")"; fi
    git add -f -A "$OUT_DIR"
    for d in ${KEEP[@]+"${KEEP[@]}"}; do [ -e "$d" ] && git add -f -A "$d" || true; done
    for f in CLAUDE.md AGENTS.md; do [ -f "$f" ] && git add "$f" || true; done
    if [ "$HAS_OLD" = 1 ] && git diff --quiet --cached "$REMOTE_REF" -- && [ "$(git rev-parse -q --verify "$REMOTE_REF^" 2>/dev/null || true)" = "$SRC" ]; then
      echo "branch $BRANCH_OUT já reflete este estado — nada a publicar"; exit 0
    fi
    git commit -q -m "$MSG"
    # lease: só sobrescreve a branch que acabamos de ler; se outro produtor publicou no meio, remonta em cima dele
    if git push -q --force-with-lease="refs/heads/$BRANCH_OUT:$OLD_SHA" "${PUSH_URL:-origin}" "HEAD:refs/heads/$BRANCH_OUT" 2>"$PUSH_ERR"; then
      echo "publicado em $BRANCH_OUT ($(git rev-parse --short HEAD) = ${BRANCH:-$SRC_REF} + 1 commit)"
      exit 0
    fi
    echo "push em $BRANCH_OUT rejeitado (tentativa $attempt) — outro produtor publicou; remontando a branch" >&2
  done
  echo "ERRO: não foi possível publicar em $BRANCH_OUT após 3 tentativas" >&2; cat "$PUSH_ERR" >&2
  exit 1
fi

stage
if git diff --cached --quiet; then
  echo "docs já atualizados — nada a commitar"; exit 0
fi
git commit -q -m "$MSG"

# O SHA muda no rebase, mas estes metadados de autoria são preservados. Eles
# distinguem o commit gerado do novo topo da origem quando o rebase descarta
# nossa alteração por ela já ter sido aplicada por outro produtor.
remember_generated_head() {
  GENERATED_COMMIT=$(git rev-parse HEAD)
  GENERATED_AUTHOR_EMAIL=$(git show -s --format=%ae HEAD)
  GENERATED_AUTHOR_DATE=$(git show -s --format=%aI HEAD)
}

generated_commit_is_head() {
  [ "$(git show -s --format=%B HEAD)" = "$MSG" ] &&
    [ "$(git show -s --format=%ae HEAD)" = "$GENERATED_AUTHOR_EMAIL" ] &&
    [ "$(git show -s --format=%aI HEAD)" = "$GENERATED_AUTHOR_DATE" ]
}

generated_output_conflict_is_recoverable() {
  local conflicted=0 path
  [ "$(git rev-parse -q --verify REBASE_HEAD 2>/dev/null || true)" = "$GENERATED_COMMIT" ] || return 1
  while IFS= read -r -d '' path; do
    conflicted=1
    case "$path" in
      "$OUT_DIR"|"$OUT_DIR"/*) ;;
      *) return 1 ;;
    esac
  done < <(git diff --name-only --diff-filter=U -z)
  [ "$conflicted" = 1 ]
}

discard_generated_output_commit() {
  local path
  local -a generated_paths=()
  while IFS= read -r -d '' path; do
    case "$path" in "$OUT_DIR"|"$OUT_DIR"/*) generated_paths+=("$path");; esac
  done < <(git diff-tree --no-commit-id --name-only -z -r "$GENERATED_COMMIT")
  git reset -q --mixed "$GENERATED_COMMIT^"
  for path in "${generated_paths[@]}"; do
    if git cat-file -e "HEAD:$path" 2>/dev/null; then
      git restore --source=HEAD --staged --worktree -- "$path"
    else
      rm -f -- "$path"
    fi
  done
}

remember_generated_head

if [ "$MODE" = "push" ]; then
  for attempt in 1 2 3; do
    if git push -q origin "HEAD:$BRANCH" 2>"$PUSH_ERR"; then
      echo "contexto publicado em $(git rev-parse --short HEAD) ($BRANCH)"; exit 0
    fi
    if grep -qiE "protected|GH006|pre-receive|required status|review|rule" "$PUSH_ERR"; then
      echo "push rejeitado por proteção de branch:"; cat "$PUSH_ERR"
      MODE="pr"; break
    fi
    echo "push falhou (tentativa $attempt) — sincronizando com origin/$BRANCH e regenerando"
    git fetch -q origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
    # Reaplica somente o commit gerado sobre a origem. --autostash preserva alterações
    # locais rastreadas; arquivos não rastreados permanecem intocados. Nunca use reset
    # destrutivo aqui: este utilitário também pode ser executado fora de um runner efêmero.
    if ! git rebase --autostash "origin/$BRANCH"; then
      if generated_output_conflict_is_recoverable; then
        git rebase --abort >/dev/null 2>&1 || true
        discard_generated_output_commit
        if ! git rebase --autostash "origin/$BRANCH"; then
          git rebase --abort >/dev/null 2>&1 || true
          echo "ERRO: não foi possível preservar os commits locais antes de regenerar." >&2
          exit 1
        fi
      else
        git rebase --abort >/dev/null 2>&1 || true
        echo "ERRO: conflito fora da saída gerada; o checkout local foi preservado." >&2
        exit 1
      fi
    fi
    # Um rebase bem-sucedido troca o SHA do commit sobrevivente mesmo quando a
    # regeneração seguinte não cria diff. Não atualize a identidade se ele foi
    # descartado: nesse caso HEAD pertence à origem ou ao usuário.
    if generated_commit_is_head; then remember_generated_head; fi
    if ! eval "$GEN_CMD --force"; then
      echo "ERRO: GEN_CMD falhou ao regenerar após o rebase ($GEN_CMD) — nada foi publicado; o commit gerado ficou só local." >&2
      exit 1
    fi
    stage
    if ! git diff --cached --quiet; then
      if generated_commit_is_head; then
        git commit -q --amend --no-edit
      else
        # O rebase pode descartar o commit gerado como patch equivalente. Nesse
        # caso HEAD pertence à origem (ou ao usuário) e jamais deve ser emendado.
        git commit -q -m "$MSG"
      fi
      remember_generated_head
    fi
  done
  if [ "$MODE" != "pr" ]; then
    echo "ERRO: não foi possível publicar após 3 tentativas"; cat "$PUSH_ERR"; exit 1
  fi
fi

# ---- modo PR (branch protegida ou MODE=pr)
if ! command -v gh >/dev/null; then
  echo "ERRO: branch protegida e gh CLI ausente — não há como abrir PR"; exit 1
fi
git push -q --force origin "HEAD:refs/heads/$PR_BRANCH"
if gh pr list --head "$PR_BRANCH" --base "$BRANCH" --state open --json number -q '.[0].number' | grep -q .; then
  echo "PR existente atualizada (branch $PR_BRANCH)"
else
  gh pr create --base "$BRANCH" --head "$PR_BRANCH" --title "chore(ai-context): atualiza contexto para agentes" \
    --body "Atualização automática de \`$OUT_DIR\` pelo AI Context Sync. Mergeie para manter os agentes com contexto atual." >/dev/null
  echo "PR aberta (branch $PR_BRANCH → $BRANCH)"
fi
