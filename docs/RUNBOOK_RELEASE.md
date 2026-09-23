# Runbook — release banco isolado → aplicação → smoke

Escopo exclusivo: GitHub `adm01-debug/Promo_Brindes_V1`, Supabase
`xlzmclcjdncjfdrjxclt` e Vercel `juca1/promo-brindes-v1`. O catálogo/banco do Promo
Gifts não participa deste pipeline.

## Ordem protegida

1. O PR só pode entrar em `main` após `validate`, `cross-browser`, `Migrations and
   pgTAP` e `Build structural Graphify map` passarem. A proteção exige branch atualizada.
2. A integração Supabase aplica `site-supabase/supabase/migrations` no banco isolado.
3. `release.yml` consulta o ledger administrativo pelo Management API e exige igualdade
   exata entre todas as versões remotas e todas as migrations versionadas no repositório.
   Versão ausente, versão remota órfã, timeout ou erro bloqueiam a publicação.
4. Deploy automático Git da Vercel está desabilitado em `vercel.json`. O workflow
   constrói exatamente o SHA validado e o promove somente após o ledger confirmado.
5. O smoke exige páginas públicas `200`, rota desconhecida `404`, crons sem segredo
   `401`, CSP, `nosniff` e proteção contra framing. Evidências ficam 90 dias.

## Segredos do GitHub Actions

- `SUPABASE_ACCESS_TOKEN`: PAT administrativo com acesso somente aos projetos
  autorizados da conta; usado para consultar o ledger do projeto isolado.
- `VERCEL_TOKEN`: token da conta/time que controla o projeto da Vercel.

Rotacione ambos conforme `RUNBOOK_ROTACAO_SEGREDOS.md`. Nunca use chaves do banco
canônico nem exponha os valores em logs, artefatos ou variáveis `VITE_*`.

## Falha e rollback

- Gate falhou: corrija em novo commit; não force promoção.
- Migration não apareceu: verifique a integração Supabase e reconcilie o ledger pelo
  runbook específico. Não execute SQL às cegas.
- Deploy falhou: a versão anterior continua servida, pois a promoção é posterior ao
  build.
- Smoke falhou depois da promoção: faça rollback instantâneo na Vercel para a última
  implantação saudável, preserve os logs e trate migrations apenas com uma migration
  corretiva aditiva. Nunca reverta schema destrutivamente em produção.
