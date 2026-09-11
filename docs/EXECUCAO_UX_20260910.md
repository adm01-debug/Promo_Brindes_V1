# Execução UX — 10 de setembro de 2026

Este registro separa alterações concluídas, evidências de teste e pendências que exigem credenciais ou decisão operacional.

## Entregas concluídas neste lote

- Corrigida a sintaxe do filtro **Novos drops**; a consulta continua somente-leitura contra a fonte canônica de catálogo.
- Corrigido o autocomplete fechado que interceptava cliques no catálogo, com navegação por teclado preservada.
- Comparação preservada em `sessionStorage`, limitada a três referências, com tabela de diferenças e revalidação contra o catálogo público. Itens inativos saem com aviso; instabilidade de rede não apaga a última prévia.
- Rascunho do orçamento preservado por 24 horas na sessão. Contato e briefing sobrevivem à ida ao catálogo, reload e falha de envio.
- Contexto de campanha acompanha adição, quantidade, remoção, limpeza e repetição do orçamento. A pessoa pode nomear sua seleção antes de abrir o briefing, sem criar conta.
- O formulário de orçamento separa data do evento, necessidade de recebimento, flexibilidade e referência de investimento total ou por pessoa; nenhum preço, prazo ou estoque é inferido.
- O formulário de contato recebe mensagem e preferência de canal opcionais, validadas no cliente e no servidor. A preferência somente orienta a operação: ela não dispara e-mail ou WhatsApp.
- Remoção individual ganhou desfazer por oito segundos. Limpeza total pede confirmação acessível, mantém nome/direção da campanha e também pode ser desfeita; sucesso de orçamento faz reset definitivo.
- Linguagem transacional foi padronizada em “Minha seleção”, “Adicionar” e “Solicitar orçamento”; “moodboard” permanece somente em contexto editorial.
- Produto ganhou zoom de foto com diálogo acessível. A variante escolhida é preservada por identificador estável em seleção, payload, banco isolado e histórico; cores com o mesmo nome não colapsam em uma linha.
- Busca ganhou sugestão explícita para pequenos erros de digitação, sem alterar SKU; “onboarding” deixou de expandir silenciosamente para qualquer kit.
- Área do cliente mostra título de ação, miniaturas e última movimentação; repetição recupera briefing e campanha sem apagar a seleção atual sem confirmação.
- Agenda mantém oportunidades futuras, e cada ideia leva a ocasião escolhida ao catálogo e ao orçamento.
- Área de acesso ganhou validação local de e-mail e controle mostrar/ocultar senha.
- HTML inicial de fichas de produto agora recebe título, descrição, canonical, Open Graph e JSON-LD específicos. Endereços inexistentes e produtos ausentes retornam `404` com `noindex`, não `200` genérico; a SPA continua responsável pela interação normal.
- Atualizações de filtro/query na mesma rota preservam rolagem e foco; navegações entre páginas continuam levando o foco ao conteúdo principal.

## Dados e isolamento

Seis migrations aditivas estão versionadas para o Supabase exclusivo do site (`xlzmclcjdncjfdrjxclt`):

1. `20260910100000_expose_safe_quote_context_to_customer.sql` expõe somente campanha e briefing ao titular autenticado, nunca hashes, origem ou user-agent.
2. `20260910103000_store_contact_message.sql` armazena a mensagem opcional de contato no schema privado.
3. `20260910110000_enrich_customer_history.sql` entrega título de ação, miniaturas e última movimentação ao proprietário do histórico.
4. `20260910120000_preserve_variant_and_contact_preference.sql` registra identificador da variante e preferência de retorno em campos privados.
5. `20260910130000_customer_adjustments_and_preferences.sql` cria pedido de ajuste exclusivo do titular autenticado, sem expor o texto ao histórico da conta.
6. `20260910140000_preserve_item_decision_group.sql` preserva se cada referência do briefing é principal ou alternativa, no envio e no histórico do titular.

Nenhuma migration é direcionada ao banco canônico de catálogo (`doufsxqlfjyuvxuezpln`) e nenhum arquivo do projeto interno Promo Gifts foi alterado.

## Evidências executadas

- TypeScript: aprovado.
- Vitest: 129 testes unitários, de contrato e APIs aprovados.
- Build Vite de produção: aprovado.
- Playwright: 58 cenários aprovados em Chromium desktop/mobile; 4 cenários exclusivamente mobile foram pulados no desktop por desenho do teste.
- pgTAP local: 66 testes aprovados após `supabase db reset` no ambiente local isolado, inclusive prioridade da referência, variante, pedido de ajuste, privacidade do texto e preferência de contato.
- Orçamento estático de assets: aprovado após build; ele falha o CI se CSS, JavaScript total ou bundle de entrada excederem o limite versionado.
- Auditoria de dependências: `npm audit --audit-level=high` sem vulnerabilidades encontradas.
- Smoke de catálogo em leitura e simulações de retorno ao orçamento, contexto de data, confirmação/desfazer, zoom, área do cliente e contato foram cobertos por contrato ou navegador.

## Estado remoto e pendências operacionais — atualização de 11 de setembro de 2026

As RPCs remotas de ajuste de orçamento, prioridade de item e retenção foram confirmadas em leitura no Supabase isolado; as flags `VITE_CUSTOMER_ADJUSTMENTS_ENABLED` e `VITE_QUOTE_DECISION_GROUPS_ENABLED` estão configuradas em Production e Preview. A credencial administrativa disponível, porém, retorna `403` ao consultar o ledger pela CLI. Portanto, a presença das funções é evidência funcional, mas não substitui a reconciliação administrativa de migrations.

A migration `20260911170000_add_revocable_shared_selections.sql` está versionada e passou nos contratos locais. Ela adiciona links persistentes opacos, com expiração, rate limit e revogação. `VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED` permanece `false` até aplicação e auditoria remotas explícitas.

E-mail e WhatsApp automáticos seguem deliberadamente desativados até existir provedor, remetente/número, templates, opt-in e fluxo operacional aprovados.
