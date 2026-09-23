# Diagnósticos de revisão — 23/09/2026

Base auditada: `11f0d358d86a192a01acc1dedca198e7d4ea8440`.

Parecer e critérios: [revisão dos planos](../../REVISAO_PLANOS_20260923.md).

## Executar

Na raiz do Promo_Brindes_V1, com as dependências já instaladas:

```bash
npx vitest run --config docs/audits/plan-review-20260923/vitest.config.ts --reporter=verbose
```

**PASS confirma a reprodução do defeito; não significa que o produto está correto.** Resultado observado: seis simulações aprovadas, correspondentes a cinco achados. A05 possui dois casos (nome/recentes).

- A01: cache anônimo não é promovido e se perde no login.
- A02: falha de leitura da conta B mantém favoritos locais da conta A.
- A03: rejeição tardia de mutação de A contamina a interface/cache de B.
- A04: ordenação final de relacionados desfaz diversidade.
- A05: curadoria sobrescreve ordenação explícita da API.

As funções/componentes sob teste são reais. Autenticação, RPC, catálogo, SEO e analytics são simulados. Não há acesso de rede/banco nem mensagens reais. As identidades são fictícias. A05 assume a resposta da API corretamente ordenada, isolando a alteração indevida feita pelo hook.

Os probes usam nome `.probe.tsx` e configuração explícita para não contaminar a suíte regular com asserções que esperam o defeito. Após corrigir, criar regressões na suíte regular com o resultado correto; preservar este diagnóstico como evidência histórica. Os cenários de cache não demonstram violação de RLS ou leitura cruzada do banco.

Nenhum código de aplicação foi alterado por estes diagnósticos.
