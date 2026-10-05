## Aprovação visual antes de alterar o design — regra do usuário

Registrada em 2026-10-05. Aplica-se a todos os agentes e às próximas sessões deste projeto.

- Antes de implementar qualquer mudança de design, apresentar uma proposta **em imagens** mostrando como a interface ficará. Inclui layout, hierarquia, tipografia, cores, espaçamentos, componentes visuais, galeria, badges, animações e responsividade.
- Primeiro inspecionar a interface em modo somente leitura. Produzir rascunhos/mockups separados do código da aplicação; não implementar a mudança no projeto apenas para depois pedir aprovação.
- Identificar as imagens como **proposta/rascunho**, explicar brevemente as alterações e apresentar desktop e celular quando a mudança afetar ambos. Uma descrição textual ou plano técnico não substitui a proposta visual.
- **Aguardar aprovação explícita do usuário para a proposta apresentada antes de alterar o código de design.** Um pedido genérico de execução ou melhoria não dispensa essa etapa.
- Implementar somente o escopo visual aprovado. Se surgir uma alteração visual relevante fora dele, apresentar nova proposta e aguardar aprovação.
- Depois de implementar, comparar capturas reais com a proposta aprovada e validar responsividade, acessibilidade e funcionamento. Não afirmar que um mockup é uma funcionalidade implementada ou publicada.
- Correções estritamente funcionais, sem mudança visual, não exigem mockup. Esta exceção não autoriza mudanças de design disfarçadas de correção técnica.
- Não modificar o projeto interno Promo Gifts para produzir ou implementar propostas do site Promo Brindes.

## Graphify

This repository has a local knowledge graph at `graphify-out/`. It is an engineering aid: source code, tests and verified deployment state remain authoritative.

- For a codebase question, run `npm run graph:status` first. If it is current, use `npm run graph:query -- "<question>"`; use `npm run graph:impact -- "<symbol>"` only as a scoped neighborhood map.
- If the graph is absent or stale, use `npm run graph:update` (the project wrapper performs an atomic, code-only rebuild). Do not call `graphify update .` directly because it bypasses the project safety checks.
- The automated map is local AST extraction only: it must not use AI providers, network access, the Supabase projects, or the internal Promo Gifts repository.
- Treat `graphify-out/` as generated and ignored. Do not add it to the frontend, commit it, or infer that a migration is remotely applied merely because a relationship exists in the graph.
- The current headless Graphify format is undirected. A reported impact is a reading/test lead, not proof of causal reverse dependency; verify relevant files and tests before changing behavior.
