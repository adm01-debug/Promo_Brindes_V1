# Índice de planos e aceites

Fonte vigente dos 230 requisitos: [matriz de fechamento](MATRIZ_FECHAMENTO_PLANOS_20260912.csv). A data no nome é a origem do arquivo, não a data da última revisão.

Última execução técnica: [navegação, impressão e governança editorial de 22/09/2026](EXECUCAO_VALIDACOES_UX_EDITORIAL_20260922.md), com código funcional `909b1eff043a45690a8b08f3b0f55d1dd624474f`. O [fechamento técnico anterior](EXECUCAO_FECHAMENTO_TECNICO_20260922.md), a [rodada complementar](EXECUCAO_COMPLEMENTAR_20260922.md) e a [validação independente](AUDITORIA_5_ESPECIALISTAS_20260922.md) permanecem como evidências históricas.

Distribuição vigente: **118 I / 100 P / 1 N / 11 E**. A contagem não é um percentual de qualidade: cada linha conserva seu próprio critério e dependências externas não viram implementação por decreto.

## Como ler

- I: implementação técnica no escopo da linha, com fontes e testes; não certifica aceites humanos.
- P: implementação parcial ou falta de validação específica.
- N: funcionalidade ainda ausente.
- E: material, pesquisa, decisão ou operação externa.
- A: alternativa arquitetural aguardando decisão.

Cada linha mantém sua própria versão auditada. Linhas não reavaliadas conservam a evidência anterior; a passagem do pipeline não atualiza automaticamente 230 aceites. Relatórios antigos são retratos históricos e não substituem a matriz.

## Pendências que não podem desaparecer

| Frente | Situação e critério restante |
| --- | --- |
| Integrações adiadas | Usuário adiou JWT de role limitada, Resend, WhatsApp, webhooks e alertas. Não afirmar envio de cópias em produção. |
| Catálogos editoriais | UX84 passou de ausente para parcial: publicação, revisão, validade e retirada já governam biblioteca, preview e sitemap. PDFs/revistas reais, autorizados e seu controle de arquivo ainda precisam ser localizados e operados. |
| Conteúdo visual e cases | LK10 e os aceites de fotos, bastidores, cases e prova social precisam de acervo identificado, direitos e associação com as páginas. O usuário confirmou que tem materiais, mas não forneceu sua localização. |
| Previews e indexação | Coleções e datas têm HTML inicial, canonical e entradas curadas no sitemap. A imagem social ainda é compartilhada e cache/renderização nos canais e indexação exigem validação externa. |
| Campanhas | Biblioteca, versionamento, arquivo e resolução guiada de concorrência existem. A continuidade é explícita por seleções salvas; o carrinho local não é sincronizado automaticamente em segundo plano. |
| Graphify | Query/path/explain e benchmark estrutural disponíveis. Pass documental/semântico, precisão de aliases e recuperação adversarial completa continuam parciais. |
| Produto e curadoria | Julgamento comercial de relevância, materiais/técnicas/múltiplos e diversidade precisam de dados aprovados; não inventar condições. |
| Operação | Restore com RPO/RTO, publicação real de propostas e SLA/encaminhamento ao atendimento dependem de ensaios e responsáveis. |
| Pesquisa e acessibilidade | Entrevistas, leitor de tela, aparelhos físicos e métricas de campo não são substituídos por axe, emulação ou mocks. |
| Sistema interno | Etapas de banco/código do Promo Gifts ficam fora da execução do site; propostas antigas não autorizam alterações nesse sistema. |

## Plano de correções de 17/09

As 50 etapas técnicas têm histórico e checklists em [plano de 17/09](PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260917.md). Diversos trechos narram bloqueios já resolvidos: ledger administrativo, merges anteriores, geração de tipos, runbook de restore e cobertura do CI. Consultar a execução atual antes de agir sobre aquelas instruções.

A etapa 48 passa a ter índice e fontes validadas automaticamente. Etapas de operação, mudanças internas protegidas e aceites humanos não ficam concluídas por esse documento existir.

## Verificação

`npm run ledger:check` exige os IDs exatos dos quatro planos, campos essenciais, SHA auditado e existência das fontes dentro do repositório do site; testa o próprio validador. Continua sendo uma verificação estrutural, sem certificar que cada critério foi homologado ou publicado.
