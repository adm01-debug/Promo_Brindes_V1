# regras_negocio — regras de negócio para agentes de IA

Produtor da fonte **regras de negócio** do contexto para agentes. Lê código, migrations/`types.ts` e
`docs/contexto/regras/manual/` (texto humano) e publica, na branch derivada `contexto`:

| Arquivo | Conteúdo |
|---|---|
| `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | regras manuais · RLS por operação · constraints/CHECK/FK/colunas calculadas · triggers + `RAISE EXCEPTION` (literal ou `USING MESSAGE`) · máquinas de estado (colunas de status, tabela de transições do banco, mapas de transição do código, valores usados no código) · validações (Zod + refine, react-hook-form, inputs) · fórmulas · parâmetros e prazos · mensagens de erro · testes como especificação (Vitest/Playwright/`node:test` e descrições pgTAP) · eventos de webhook · efeitos colaterais |
| `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md` | perfis e roles do banco, matriz tabela × operação → quem pode (inclui tabelas de fora do repo que recebem política, ex.: `storage.objects`), roles com `BYPASSRLS`, onde o RLS é ignorado (service_role, SECURITY DEFINER), funções serverless HTTP de `api/` (rota, métodos, cron — a autenticação não é inferida), rotas protegidas, multi-tenancy, soft delete, PII, colunas de dinheiro |
| `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md` | glossário, seed, inconsistências código × schema (NÃO VERIFICADO) e lacunas que só o dono do negócio responde |
| `docs/contexto/regras/manifest.json` | `gerado_em`, `commit`, `entrada`, `arquivos` — lido pelo `indice.py` |
| `docs/contexto/00-INDEX.md` | índice único das três fontes (banco real, código, regras), gerado por `indice.py` |

O que **não** é daqui (cada fato tem um dono): schema real → snapshot do banco
(`docs/contexto/supabase/`, `scripts/supabase_snapshot/`); rotas/módulos/hooks/grafo →
`docs/contexto/codigo/` (`scripts/ai-context/gerar.mjs`). Tudo na branch `contexto`, job a job em
`.github/workflows/contexto.yml`.

## Arquivos

- `generate.py` — gerador (stdlib, ~3 s neste repo). `--profile regras` escreve só 07/10/11;
  `--schema-snapshot` faz o 06 apontar para o snapshot em vez de reconstruir e, no perfil `regras`
  (que não escreve o 06), é para essa pasta que 07/10 mandam o leitor. Sai com 2, sem escrever nada,
  se `--repo` não existir, se `--out` for a raiz do repo ou se o snapshot sair do repo; regenera
  sozinho quando falta arquivo de saída ou o perfil mudou.
- `indice.py` — monta `00-INDEX.md` lendo o `manifest.json` de cada fonte
  (`--fonte "NOME=CAMINHO[@BRANCH]"`); fonte que vive em outra branch entra como "como ler"
  (git show / raw), sem inventar conteúdo.
- `publish.sh` — publicação genérica (push / PR / branch derivada) para uso standalone em outros
  repos; **neste repo não é usado**: o job `publicar` do `contexto.yml` monta a branch `contexto` e o
  índice. `bash scripts/regras_negocio/publish.sh --help` lista as variáveis. Não grava `git config`,
  recusa `MODE` desconhecido (saída 2), nunca publica a partir da branch gerada nem abre PR dela, e no
  modo `branch` usa `--force-with-lease` com nova tentativa para não apagar a pasta de outro produtor.
- Workflow: jobs `regras` e `publicar` em `.github/workflows/contexto.yml`.

O índice distingue `ok`, `parcial` (falha de coleta ou reaproveitamento), `não verificável`
(manifest/relatório ilegível), `desatualizado` e fonte ausente. Código/regras com commit igual ao HEAD
continuam atuais apesar da idade da coleta; banco real e fontes sem commit confirmado seguem o limite
de idade configurado — por isso, enquanto o secret `SITE_SUPABASE_DB_URL` não existir, o índice mostra
a fonte **banco real** como "ainda não gerado" em vez de fingir que está atual.

## Fontes SQL

Arquivos `.sql` em diretórios chamados exatamente `_foreign` ou `_superseded` são históricos:
continuam no inventário de arquivos, mas não entram na reconstrução do schema nem na extração de
regras do código. Neste repo as migrations vigentes ficam em `site-supabase/supabase/migrations` e os
testes pgTAP (lidos como especificação) em `site-supabase/supabase/tests/database`. A reconstrução é
estática; só o snapshot descreve o banco em produção.

A reconstrução segue o estado final das migrations, na ordem dos nomes: `ALTER TABLE` com várias
ações, `DROP CONSTRAINT` de constraint nomeada pelo Postgres (`<tabela>_<coluna>_check`, `_key`,
`_fkey`, `<tabela>_pkey`), `DROP TABLE` (leva políticas, triggers e índices), `ALTER`/`DROP POLICY`,
`ENABLE`/`FORCE`/`NO FORCE ROW LEVEL SECURITY` como flags independentes, sobrecargas de função e
`DROP FUNCTION` por assinatura. Comentários são removidos sem tocar em strings nem em corpos
dollar-quoted. Limites conhecidos (não reconstruídos): `ALTER TABLE ... SET SCHEMA`,
`DISABLE TRIGGER`, funções `BEGIN ATOMIC`, DDL montado por `EXECUTE` dentro de função e o estado final
de `GRANT`/`REVOKE` (o 10 lista o histórico e avisa).

## Regras humanas

`docs/contexto/regras/manual/*.md` (exceto README e TEMPLATE) entram na seção A do 07 com prioridade
máxima e nunca são sobrescritos. Comece copiando `TEMPLATE-regras-de-negocio.md` para `regras.md`.
Editar `manual/` na main dispara o workflow. É o único lugar do contexto que um humano escreve — o
resto é regerado e sobrescrito.

## Rodar local

```bash
npm run contexto:regras      # generate.py + indice.py com os caminhos deste repo
```

Equivalente manual:

```bash
python3 scripts/regras_negocio/generate.py --repo . --out docs/contexto/regras --profile regras \
  --schema-snapshot docs/contexto/supabase --no-pointer
python3 scripts/regras_negocio/indice.py --repo . --out docs/contexto/00-INDEX.md \
  --fonte "banco real=docs/contexto/supabase" --fonte "código=docs/contexto/codigo" \
  --fonte "regras de negócio=docs/contexto/regras"
```

Ler o resultado: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`.

## Testes de regressão

```bash
npm run contexto:regras:test     # python3 scripts/regras_negocio/test_generate.py
```

`test_generate.py` carrega também `test_indice.py` e `test_publish.py`, então o comando acima roda as
três suítes. Elas usam fixtures locais e cobrem SQL ativo versus histórico, estado final das migrations,
heurísticas de código, a CLI do gerador, os estados do índice e o publicador contra um remoto bare
local (primeira publicação, sem mudança, corrida entre produtores, clone raso, remoto fora do ar).
Nenhum teste acessa banco, rede ou API de LLM.
