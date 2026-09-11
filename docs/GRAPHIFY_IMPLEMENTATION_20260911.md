# Execução da integração Graphify — 11/09/2026

## Resultado

A integração foi concluída como ferramenta de engenharia local e de CI. Ela não entra no bundle do site, não conecta ao Supabase, não acessa o projeto interno Promo Gifts e não envia fontes a provedores de IA.

## Evidências da implementação

| Bloco do plano | Entrega verificável |
| --- | --- |
| 1–10: escopo e segurança | Raiz fixa no wrapper, `.graphify.project.json`, `.graphifyignore`, retenção definida, saídas ignoradas pelo Git e varredura de segredos/caminhos pessoais antes da promoção. |
| 11–20: geração confiável | `graph:doctor`, geração AST `code-only`, candidato temporário, troca atômica, integridade de IDs/endpoints, metadados de commit e visualizações HTML/árvore. |
| 21–30: uso e atualidade | consultas com expansão controlada PT-BR, limite de contexto, mapa de vizinhança, impressão digital de fontes/configuração, `status`/`check` e instruções em `AGENTS.md`. |
| 31–40: conhecimento técnico | documentação separa estrutura, semântica, implementação e ativação remota; o passe semântico permanece opt-in, com fontes e orçamento a serem definidos. |
| 41–50: operação | workflow GitHub com permissões de leitura, versão fixa, geração no commit, testes, artefato de 14 dias e recuperação documentada. |

## Simulações executadas

- Extração real sem IA: 126 arquivos de código, 929 nós e 2.045 relações no commit de referência `84847d5`.
- Consulta de orçamento/carrinho: localizou `QuotePage`, `QuoteCartContext`, `quoteRequest`, normalização de briefing e testes relacionados; a saída indicou truncamento de contexto corretamente.
- Integridade: cinco testes automatizados cobrem hash determinístico, endpoints faltantes, caminhos fora da raiz, expansão de vocabulário, limite de consulta e detecção de token sintético.
- Falha de ferramenta: a geração foi executada com binário controladamente indisponível. Ela falhou sem promoção; o SHA-256 de `graphify-out/graph.json` foi preservado (`4604a2c0876cb5955ba20a77466b58da9a4b56ecfe6db182e61bfefa8a90cb77`).
- Atualidade: após alteração de engenharia, `graph:status` indicou `DEFASADO`, em vez de apresentar o grafo anterior como atual.

## Limitação assumida

O comando headless de Graphify 0.9.48 produz este mapa estrutural como não direcionado. Por isso, a função de impacto foi implementada como vizinhança direta/transitiva de até dois saltos, com aviso explícito; ela não afirma impacto causal reverso. Qualquer decisão continua exigindo conferência no código e nos testes.

## Próxima revisão

Reavaliar após um ciclo real de mudanças: precisão das dez perguntas de referência, tempo de geração no CI, utilidade da árvore e eventual necessidade de um passe semântico de documentos técnicos selecionados.
