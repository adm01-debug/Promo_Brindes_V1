# Execução UX — 10 de setembro de 2026

Este registro separa alterações concluídas, evidências de teste e pendências que exigem credenciais ou decisão operacional.

## Entregas concluídas neste lote

- Corrigida a sintaxe do filtro **Novos drops**. A consulta é feita somente em leitura contra a fonte canônica de catálogo e voltou a responder sem `400`.
- Corrigido o autocomplete fechado que interceptava cliques no catálogo, sem desabilitar sugestões no hero ou no cabeçalho.
- Seleção de comparação preservada em `sessionStorage`, limitada a três referências e atualizada com dimensões, capacidade e embalagem publicada.
- Rascunho de orçamento preservado por 24 horas na sessão do navegador; contato e complemento de briefing sobrevivem ao retorno ao catálogo e ao reload.
- Contexto da campanha via “Ache pelo briefing” ou data comemorativa acompanha a seleção e chega ao payload de orçamento. O cliente vê somente o contexto pertinente ao abrir o histórico.
- Formulário de orçamento ampliado com nome da ação, faixa de investimento, canal preferido e maturidade da identidade visual. Todos continuam opcionais.
- Formulário de contato passou a receber uma mensagem opcional, validada no cliente e no servidor.
- Limpeza da seleção ganhou recuperação por oito segundos; sucesso de orçamento usa uma limpeza definitiva para não manter contexto após o envio.
- Linguagem transacional foi padronizada em “Minha seleção”, “Adicionar” e “Solicitar orçamento”; “moodboard” permanece somente onde é editorial.
- Produto ganhou ampliação de foto por diálogo com fechamento por `Esc`.
- Agenda prioriza oportunidades futuras no ano corrente, sem retirar datas passadas; cada ideia leva a ocasião escolhida ao catálogo e ao orçamento.
- Área de acesso ganhou validação local de e-mail e controle mostrar/ocultar senha.
- Adicionado fallback SPA da Vercel para rotas de interface não listadas, preservando `/api`, assets e sitemap.

## Dados e isolamento

Duas migrations aditivas foram criadas para o Supabase exclusivo do site (`xlzmclcjdncjfdrjxclt`):

1. `20260910100000_expose_safe_quote_context_to_customer.sql` expõe somente contexto de campanha e briefing ao titular autenticado, nunca hashes, origem ou user-agent.
2. `20260910103000_store_contact_message.sql` armazena a mensagem opcional de contato no schema privado.

Nenhuma migration foi direcionada ao banco canônico de catálogo (`doufsxqlfjyuvxuezpln`) e nenhum arquivo do projeto interno Promo Gifts foi alterado.

## Evidências executadas

- TypeScript: aprovado.
- Testes unitários e de contrato selecionados: aprovados.
- Build Vite de produção: aprovado.
- Playwright: 58 aprovados em Chromium desktop/mobile; 4 cenários mobile foram pulados no desktop por desenho do teste.
- pgTAP local: 45 testes aprovados depois de `supabase db reset` no ambiente local isolado.
- Smoke real em leitura: `/catalogo?perfil=novos` retornou `206` e 24 produtos da fonte canônica após a correção.
- Simulações reais de navegador: retorno ao orçamento, rascunho, contexto de data, desfazer limpeza, zoom e formulário de contato.

## Pendência externa, deliberadamente não executada

O dry-run remoto e a aplicação das duas migrations ainda requerem `SUPABASE_ACCESS_TOKEN` administrativo no ambiente. A autenticação não está presente; portanto nenhuma mudança remota foi aplicada por suposição. E-mail/WhatsApp automáticos também continuam desativados até existir provedor, remetente/número e fluxo operacional aprovados.
