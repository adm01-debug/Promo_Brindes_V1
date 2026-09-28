# Revisão das 50 etapas de 24/09 — posição em 28/09/2026

Plano: [PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260924.md](PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260924.md). Leia o [parecer](REVISAO_PLANOS_20260928.md). T = entrega técnica no recorte; P = parcial/defeito/aceite não certificado; N = entrega não localizada; E = dependência externa/decisão. Provas herdadas são distinguidas das novas no parecer; não houve 50 testes independentes.

Contagem: 5 T; 32 P; 2 N; 11 E.

| ID | Estado | Entrega | Evidência e aceite restante |
|---|---|---|---|
| T24-01 | T | Base e alvo | HEAD 2b53b85, main/produção 40e05ab; raiz do site explícita; Promo Gifts preservado. |
| T24-02 | P | Ledger semântico | Validador passa, mas UX35/49/88, LK10 e notas de conteúdo/migrations estão desatualizados. Este parecer explicita as diferenças sem apagar história. |
| T24-03 | P | Ambiente reproduzível | Local Node24.19/npm11.17, engines>=24.15<25, CI24.15; Vercel22.x ainda diferente. |
| T24-04 | T | Cenários adversariais | Suíte e probes anteriores preservados; dois novos probes F28 reproduzem lacunas fora da cobertura existente. |
| T24-05 | P | Responsáveis e decisões | Governança documentada; responsáveis comerciais/aceites ausentes e revisão obrigatória sem segundo revisor bloqueia PR67. |
| T24-06 | P | Modelo dos favoritos | Titular, epoch, intenção e fila existem; não cancelam despacho após troca de conta nem restauram último confirmado após duas falhas. |
| T24-07 | T | F24-03 isolamento de render | visibleFavorites protege render por titular; regressão com useLayoutEffect passa. Não confundir com isolamento de despacho F28-01. |
| T24-08 | T | F24-01 adição versus leitura antiga | applyIntents e regressão permanente passam. |
| T24-09 | T | F24-02 remoção versus leitura antiga | Intenção negativa preservada; regressão passa. |
| T24-10 | P | Mutações concorrentes | Serialização por titular/data implementada; F28-01/02 provam limites de sessão e rollback ainda abertos. |
| T24-11 | P | Promoção anônima/limites | Promoção e recusa ao limite existem; ensaio completo de falha parcial/limite/múltiplas sessões não certificado. |
| T24-12 | P | Múltiplas abas/dispositivos | Storage por proprietário e regressões existem; não há homologação física/offline completa e despacho cruzado permanece. |
| T24-13 | P | Auth/recuperação | Código e testes existem; recebimento real/refresh/expiração não reexecutados; F28 impede aceite global de sessão. |
| T24-14 | P | Campanhas/links/propostas | Versionamento, conflito, revogação, PDF privado existem; falta ciclo comercial real controlado e homologação de documentos. |
| T24-15 | P | Fechar favoritos | F24 corrigidos; dois novos F28 reproduzidos impedem fechamento integral. |
| T24-16 | P | Política de anexos | PDF recusado por segurança no código atual; inspeção estrutural/CDR e política integral de arquivos continuam distintas. |
| T24-17 | P | Ciclo de inspeção | Assinaturas de imagem, dupla leitura e rejeição/limpeza implementadas/testadas; não equivalem a saneamento estrutural completo. |
| T24-18 | P | Privacidade e retenção | RPCs/filas/runbook existem; operação real de direitos, recuperação de falha e aceite do responsável não certificados. |
| T24-19 | P | Contratos SQL/API/UI | Tipos gerados, parsers e catálogo de erros presentes; fronteiras JSON manuais permanecem, sem inventário integral fechado. |
| T24-20 | P | ACL do banco isolado | Migration 20260927103000 restringe RPCs de favoritos a authenticated; ledger atual alinhado. Novo diff completo de ACL/default privileges via pg_catalog não executado. |
| T24-21 | N | Contrato público vivo no CI | Workflows não contêm teste remoto cross-projeto. Consumo/mocks não certificam schema/grants da origem. |
| T24-22 | E | Preview realmente isolado | Guardas e runbook existem; provisionamento, credenciais/dados sintéticos e jornada real dependem de decisão específica. |
| T24-23 | E | Restore e RPO/RTO | Runbook não é drill. Nenhuma restauração realizada nesta auditoria; cobertura/PITR atual não certificados. |
| T24-24 | P | Cron silencioso | Saúde/alertas da fila preparados; observador independente e entrega operacional não demonstrados. Canal adiado. |
| T24-25 | P | Operação/privilégio mínimo | Role/rotinas/runbooks presentes; SITE_SUPABASE_SERVICE_JWT adiado, manutenção/rotação recorrentes sem aceite operacional. |
| T24-26 | P | Corpus de relevância | Baseline lexical/ranking testados; 30 intenções com produtos julgados por humanos não comprovadas. |
| T24-27 | P | Ranking e paginação | Ranking por intenção/diversidade existe; preserva ordem explícita. Curadoria global multipágina e aceite comercial não concluídos. |
| T24-28 | E | Dados comerciais/kits | Kit/aritmética/alternativas existem; fontes aprovadas de múltiplos/técnicas/áreas/composição ainda exigem confirmação. |
| T24-29 | P | Home e fotografias | Cards de categorias fotográficos existem e quatro frases presentes; repertório/diversidade/descoberta por compradores sem aceite. |
| T24-30 | P | Filtros/mobile | Implementação/E2E presentes; política final de interação e homologação física/assistiva não certificadas nesta rodada. |
| T24-31 | E | Acervo e direitos | Usuário declarou materiais aprovados, mas inventário/localização/direitos por ativo não localizados no repositório. |
| T24-32 | E | PDFs/revistas reais | Dez coleções são online; formatos modelados não significam PDF/revista publicado. Depende de materiais identificados. |
| T24-33 | E | Cases reais | Três cases verificáveis e fotografias de produção autorizadas não localizados; não inventar conteúdo. |
| T24-34 | P | Cópia enriquecida | api/notifications.ts inclui kits, alternativas, campanha, datas e verba. Falta aceite editorial; recebimento real é outro critério. |
| T24-35 | E | Destino comercial | Persistência não entrega ao vendedor. CRM/fila/destinatário/responsável precisam decisão explícita. |
| T24-36 | N | Encaminhamento comercial | Adaptador/outbox comercial separado não localizado; confirmação audience=customer não satisfaz este item. |
| T24-37 | E | Responsável e SLA | Timeline/estados técnicos existem; atribuição e prazo operacional aprovados não demonstrados. |
| T24-38 | E | Homologação de canais | Provedores/callbacks preparados e testados; ativação/credenciais e ensaio real expressamente adiados. |
| T24-39 | P | Funil | Minimização e testes presentes; Web Analytics desabilitado na Vercel, script404. Sem prova de recepção/deduplicação real. |
| T24-40 | P | Marca/SEO/ICS | Frases, badge único, Tendências, metadados/ICS implementados; alias antigo preserva links. Prévia em canais/indexação/importação real pendentes. |
| T24-41 | E | Acessibilidade manual | Axe/teclado não substituem leitor de tela, zoom/reflow completos e avaliador humano. |
| T24-42 | E | Pesquisa/dispositivos reais | Sessões com compradores e iOS/Android físicos não comprovadas. |
| T24-43 | P | Componentes/performance | Budget/lazy/decomposição parciais; Home366/Quote412/Catalogs303/Dates350 linhas. Linha por si não é defeito; CWV de campo não comprovado. |
| T24-44 | P | Requisitos no Graphify | AST/query/path/benchmark existem; corpus documental e vínculo requisito-fonte-teste mantido não implementados. |
| T24-45 | P | Resiliência Graphify | Lock/candidato/guardas/testes existentes; matriz completa disco/interrupção/upgrade/HTML/aliases não certificada. |
| T24-46 | P | Compatibilidade/gates | CI principal verde; Node de produção difere, actionlint não inclui zizmor, critérios documentais de majors não integralmente concluídos. |
| T24-47 | P | Regressão integrada | 399 testes atuais passam; dois probes novos falham. CI SQL/browser aprovado não cobre todas as sequências adversariais. |
| T24-48 | P | Liberação segura | Migrations alinhadas/main publicada; smoke após promoção e sem rollback automático. Correção drift só no PR67. |
| T24-49 | P | Observar produção | SHA conferido; smoke atual falha em Analytics. Nenhuma janela operacional/SLA completo certificada. |
| T24-50 | P | Fechamento por requisito | Não concluído; tabelas desta revisão preservam implementado, parcial, não implementado e dependências externas. |

## Correspondência das 50 etapas de 23/09

O plano de 24/09 amplia o de 23/09; não são cem funcionalidades independentes. Esta correspondência mantém todas as referências históricas localizáveis. Quando há vários destinos, vale a união dos critérios e o estado mais restritivo, não o melhor estado.

| T23 | T24 correspondentes |
|---|---|
| T23-01 | T24-01 |
| T23-02 | T24-02 |
| T23-03 | T24-04, T24-07, T24-08, T24-09, T24-10, T24-15 |
| T23-04 | T24-06, T24-19, T24-28 |
| T23-05 | T24-05, T24-48 |
| T23-06 | T24-06 |
| T23-07 | T24-11 |
| T23-08 | T24-07, T24-12 |
| T23-09 | T24-07, T24-10 |
| T23-10 | T24-11, T24-12, T24-13, T24-15 |
| T23-11 | T24-27 |
| T23-12 | T24-27 |
| T23-13 | T24-26, T24-27 |
| T23-14 | T24-26 |
| T23-15 | T24-29 |
| T23-16 | T24-34 |
| T23-17 | T24-34 |
| T23-18 | T24-35, T24-36 |
| T23-19 | T24-37 |
| T23-20 | T24-38 |
| T23-21 | T24-19 |
| T23-22 | T24-28 |
| T23-23 | T24-16, T24-17 |
| T23-24 | T24-13, T24-14 |
| T23-25 | T24-18 |
| T23-26 | T24-31 |
| T23-27 | T24-32 |
| T23-28 | T24-33 |
| T23-29 | T24-30 |
| T23-30 | T24-40 |
| T23-31 | T24-41 |
| T23-32 | T24-42 |
| T23-33 | T24-43 |
| T23-34 | T24-39 |
| T23-35 | T24-40 |
| T23-36 | T24-20 |
| T23-37 | T24-22 |
| T23-38 | T24-23 |
| T23-39 | T24-24, T24-25 |
| T23-40 | T24-21 |
| T23-41 | T24-44 |
| T23-42 | T24-44 |
| T23-43 | T24-45 |
| T23-44 | T24-44, T24-45 |
| T23-45 | T24-45 |
| T23-46 | T24-47 |
| T23-47 | T24-46 |
| T23-48 | T24-48 |
| T23-49 | T24-49 |
| T23-50 | T24-50 |
