# Índice de planos e aceites

Fonte vigente dos 230 requisitos: [matriz de fechamento](MATRIZ_FECHAMENTO_PLANOS_20260912.csv). A data no nome é a origem do arquivo, não a data da última revisão.

Última execução complementar: [22/09/2026](EXECUCAO_COMPLEMENTAR_20260922.md), com código funcional auditado `ef97fc75e4109b90e5b25d14d9418d6557bb4640`. A validação independente está consolidada na [auditoria dos cinco especialistas](AUDITORIA_5_ESPECIALISTAS_20260922.md).

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
| Catálogos editoriais | UX84 permanece ausente: publicação/revisão/validade de PDFs e revistas ainda não tem fluxo operacional. A biblioteca de coleções online não equivale a isso. Materiais aprovados precisam ser localizados. |
| Conteúdo visual e cases | LK10 e os aceites de fotos, bastidores, cases e prova social precisam de acervo identificado, direitos e associação com as páginas. O usuário confirmou que tem materiais, mas não forneceu sua localização. |
| Arquivos privados | Upload, titularidade e retenção existem; verificação server-side do conteúdo binário ainda falta. MIME e tamanho declarados não são inspeção de arquivo. |
| Campanhas | Biblioteca/versionamento/arquivo existem; comparar e mesclar conflitos guiados continua pendente. O carrinho não sincroniza automaticamente. |
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
