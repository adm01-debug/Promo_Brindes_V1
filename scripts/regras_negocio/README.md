# regras_negocio — regras de negócio para agentes de IA

Produtor da fonte **regras de negócio** do contexto para agentes. Lê código, migrations/`types.ts` e
`docs/contexto/regras/manual/` (texto humano) e publica, na branch derivada `contexto`:

| Arquivo | Conteúdo |
|---|---|
| `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | regras manuais · RLS por operação · constraints/CHECK/FK/colunas calculadas · triggers + `RAISE EXCEPTION` · máquinas de estado (colunas de status, mapas de transição, valores usados no código) · validações (Zod + refine, react-hook-form, inputs) · fórmulas · parâmetros e prazos · mensagens de erro · testes como especificação · eventos de webhook · efeitos colaterais |
| `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md` | perfis, matriz tabela × operação → quem pode, onde o RLS é ignorado (service_role, SECURITY DEFINER), rotas HTTP públicas, rotas protegidas, multi-tenancy, soft delete, PII, colunas de dinheiro |
| `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md` | glossário, seed, inconsistências código × schema (NÃO VERIFICADO) e lacunas que só o dono do negócio responde |
| `docs/contexto/regras/manifest.json` | `gerado_em`, `commit`, `entrada`, `arquivos` — lido pelo `indice.py` |
| `docs/contexto/00-INDEX.md` | índice único das três fontes (banco real, código, regras), gerado por `indice.py` |

O que **não** é daqui (cada fato tem um dono): schema real → snapshot do banco
(`docs/contexto/supabase/`, `scripts/supabase_snapshot/`); rotas/módulos/hooks/grafo →
`docs/contexto/codigo/` (`scripts/ai-context/gerar.mjs`). Tudo na branch `contexto`, job a job em
`.github/workflows/contexto.yml`.

## Arquivos

- `generate.py` — gerador (stdlib, ~0,3 s). `--profile regras` escreve só 07/10/11;
  `--schema-snapshot` faz o 06 apontar para o snapshot em vez de reconstruir.
- `indice.py` — monta `00-INDEX.md` lendo o `manifest.json` de cada fonte
  (`--fonte "NOME=CAMINHO[@BRANCH]"`); fonte que vive em outra branch entra como "como ler"
  (git show / raw), sem inventar conteúdo.
- `publish.sh` — publicação genérica (push / PR / branch derivada) para uso standalone em outros
  repos; **neste repo não é usado**: o job `publicar` do `contexto.yml` monta a branch `contexto` e o
  índice.
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

A suíte usa fixtures locais e cobre SQL ativo versus histórico, objetos do schema, fontes Prisma/tipos
e a saída do perfil `regras`. Nenhum teste acessa banco ou API de LLM.
