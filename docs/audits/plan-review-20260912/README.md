# Evidências da revisão de 12/09/2026

Código auditado: `b789e45f3171ce56a9e5eff4f8bbb3d6acc145c7`.

Esta pasta contém diagnósticos, não correções da aplicação. Nenhum envio de orçamento, alteração de banco, deploy ou comunicação com clientes foi realizado nesta revisão.

## Arquivos

- `database-readonly.json`: ledger remoto comparado aos 14 arquivos locais, consulta administrativa somente leitura a `pg_catalog` e alertas do advisor. Não contém credenciais nem registros de clientes.
- `http-production.json`: 20 respostas HTTP do deployment público. Status 200 não significa que uma operação autenticada foi validada.
- `browser-production.json`: inspeção de páginas públicas em Chromium, viewport de 390px. `productCards` é uma fotografia do instante de medição e pode anteceder a carga do catálogo. `zeroOrNullStock` também inclui campo ausente; não permite concluir falta de estoque. `noPrimaryImage` não exclui a existência de imagens alternativas. A amostra de produtos é de conveniência.
- `simulations.json`: resultados dos cenários sintéticos de `reproduce.mjs`; navegador com respostas interceptadas e função real de reconciliação executada com `fetch` substituído.
- `build_matrix.py`: materializa as avaliações manuais por referência, verifica IDs/fontes e compara estados com a matriz anterior. Não deduz implementação por palavra-chave ou pelo grafo.
- `matrix-summary.json`: contagens e mudanças de classificação.
- `validation-summary.json`: resumo das execuções desta revisão e das limitações.

## Reproduzir os diagnósticos locais

Na raiz do site, em um terminal exclusivo, use somente a chave fictícia abaixo:

```bash
VITE_SITE_SUPABASE_URL=https://xlzmclcjdncjfdrjxclt.supabase.co \
VITE_SITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_playwright_test \
VITE_CUSTOMER_ADJUSTMENTS_ENABLED=true \
VITE_QUOTE_DECISION_GROUPS_ENABLED=true \
VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED=true \
VITE_QUOTE_REQUEST_ENDPOINT=/api/quote-requests \
npm run dev -- --host 127.0.0.1 --port 4182
```

Em outro terminal, também na raiz:

```bash
PB_AUDIT_BASE_URL=http://127.0.0.1:4182 node docs/audits/plan-review-20260912/reproduce.mjs
python3 docs/audits/plan-review-20260912/build_matrix.py
```

Encerre o servidor ao terminar. Não reutilize este ambiente com chave fictícia como ambiente de atendimento.

O script intercepta `/api/**` e requisições Supabase do navegador; a reconciliação usa um `fetch` sintético. Contatos são fictícios. A resposta bem-sucedida simulada para evento passado **não prova aceitação pelo servidor real**: o contrato real rejeita a data. A troca de orçamento simula navegação no mesmo componente/conta; não prova acesso entre contas.

Os diagnósticos preservam os resultados encontrados, mas ainda não integram o gate permanente: não são substitutos para testes de regressão com expectativas corrigidas.
