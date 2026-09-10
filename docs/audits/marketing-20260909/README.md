# Evidências da avaliação de experiência — 09/09/2026

Relatório principal: [Experiência de marketing](../../RELATORIO_EXPERIENCIA_MARKETING_GEN_Z_20260909.md).

## Método

Chromium em 1440 × 1000 e 390 × 844. Navegação pública com dados reais do catálogo. Nenhuma submissão real de contato, orçamento, autenticação ou WhatsApp. Áreas autenticadas e respostas de envio foram simuladas por interceptação no navegador com dados fictícios.

`page-inventory.json` reúne 36 navegações de 18 rotas/estados. `journeys.json`, `portal-mobile.json` e `final-probes.json` documentam os percursos complementares. Não são métricas de uso real nem uma medição de conversão.

## Como ler os arquivos

- `*-top.png`: primeira tela da página, adequada para avaliar hierarquia inicial.
- `*-full.png`: documento completo após percorrer a página. Elementos fixos podem aparecer na posição da captura; não usar essas imagens para atribuir posição fixa incorreta à interface.
- `*-viewport.png`: captura do estado de um painel/calendário no viewport, preferível às capturas de página inteira com sobreposição.
- `*-simulado.png`, `*-simulada.png`: dados fictícios. Não representam solicitações de clientes reais.
- `dia-cliente.ics`: calendário exportado pela própria interface, sem envio a terceiros.
- `selecao-impressao.pdf`: impressão local da seleção montada na auditoria.

## Capturas recomendadas

| Área | Evidência |
|---|---|
| Home | [Desktop](desktop-home-top.png) · [Mobile](mobile-home-top.png) |
| Catálogo e faixa de autocomplete | [Desktop](desktop-catalogo-top.png) · [Mobile](mobile-catalogo-top.png) |
| Novidades | [Erro reproduzido](novidades-erro-reproduzido.png) |
| Filtros | [Painel móvel](mobile-filtros-viewport.png) |
| Produto | [Ficha desktop](desktop-produto-top.png) |
| Comparação | [Desktop](desktop-comparacao.png) · [Mobile](mobile-comparacao-viewport.png) |
| Seleção | [Painel móvel](mobile-selecao-viewport.png) |
| Briefing | [Desktop](desktop-orcamento-preenchivel.png) · [Sucesso simulado](desktop-orcamento-sucesso-simulado.png) |
| Biblioteca | [Desktop](desktop-catalogos-top.png) |
| Datas | [Detalhe](desktop-data-detalhe.png) · [Calendário móvel](mobile-calendario-viewport.png) |
| Área do cliente | [Histórico simulado](desktop-portal-simulado.png) · [Solicitação simulada](desktop-solicitacao-simulada.png) |
| Erro de endereço | [404 da hospedagem](mobile-404-top.png) |

Limites: nenhum exame de todas as linhas do catálogo, auditoria administrativa do banco, teste real de entrega de e-mail/WhatsApp, teste em aparelho físico ou certificação integral de acessibilidade foi realizado nesta revisão de UX.
