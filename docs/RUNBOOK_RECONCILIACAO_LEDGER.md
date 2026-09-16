# Runbook — reconciliação do ledger de migrations (Etapa 1 / Etapa 49)

Escopo: projeto isolado `xlzmclcjdncjfdrjxclt`. Resposta a suspeita de drift entre as
migrations do repositório e o histórico realmente aplicado no banco remoto — por
exemplo, depois de uma alteração manual via Studio, ou depois do incidente de 15/09/2026
(migrations com timestamp de 8 dígitos precisaram ser normalizadas para 14 sem
reaplicação de SQL).

## Pré-condições

- [ ] `SUPABASE_ACCESS_TOKEN` de escopo mínimo configurado (ver
      `docs/RUNBOOK_VERIFICACAO_DB.md`).
- [ ] Projeto linkado corretamente: `SUPABASE_WORKDIR=site-supabase npx supabase@latest
      link --project-ref xlzmclcjdncjfdrjxclt` (confirme visualmente que o ref **não**
      é `doufsxqlfjyuvxuezpln`, o projeto canônico).

## 1. Detectar

```bash
SUPABASE_WORKDIR=site-supabase supabase migration list --linked
```

Compara a lista local (`site-supabase/supabase/migrations/`) com o histórico aplicado
no remoto. Drift aparece como uma versão presente só de um lado.

## 2. Confirmar o alcance do drift

```bash
npm run db:site:guard && SUPABASE_WORKDIR=site-supabase npx supabase@latest db push --dry-run
```

`db:site:guard` (`scripts/validate-site-supabase-target.mjs`) confirma que o projeto
linkado é o correto antes de qualquer coisa. O `--dry-run` mostra exatamente o que
seria aplicado, sem aplicar — se aparecer uma migration que você esperava já estar
aplicada, o drift é real.

## 3. Resolver

Duas causas possíveis, duas respostas diferentes:

- **Migration aplicada manualmente fora do CLI** (via Studio, por exemplo): registre-a
  no histórico do CLI sem reaplicar o SQL —
  `SUPABASE_WORKDIR=site-supabase npx supabase@latest migration repair --status applied <versão>`.
  **Nunca** rode a migration de novo achando que "não fez efeito" — confirme primeiro
  com `select * from information_schema.tables` ou equivalente que o efeito já existe.
- **Migration do repositório nunca chegou ao remoto**: depois do dry-run confirmar que
  o conteúdo é o esperado, `SUPABASE_WORKDIR=site-supabase npx supabase@latest db push`.

## 4. Verificação

```bash
SUPABASE_WORKDIR=site-supabase supabase migration list --linked
```

Repita o comando do passo 1 — as duas colunas (local/remoto) devem bater exatamente,
sem nenhuma versão órfã de nenhum dos lados.

## 5. Comunicação

Registre (fora do banco — ticket do time ou equivalente): data da reconciliação,
versões envolvidas, qual das duas causas do passo 3 se aplicou, e o resultado do passo 4
como evidência. Se a causa foi "aplicada manualmente fora do CLI", identifique quem/por
quê, para reforçar que mudanças de schema devem passar sempre pelo fluxo de migrations.

## Ensaiado em

Banco local, 16/09/2026, como parte da reconciliação original documentada em
`docs/SITE_SUPABASE_SETUP.md` ("Reconciliação confirmada em 16/09/2026") — os comandos
acima são os mesmos usados naquela ocasião, agora no formato de runbook repetível.
