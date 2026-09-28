# Revisão das 100 etapas de workflows — 28/09/2026

Plano: [PLANO_WORKFLOWS_100_ETAPAS_20260927.md](PLANO_WORKFLOWS_100_ETAPAS_20260927.md). Base main `40e05ab`; candidato `2b53b85` somente onde indicado. Evidências e limites: [parecer](REVISAO_PLANOS_20260928.md).

T = entrega técnica comprovada no recorte; P = parcial/defeituosa/não publicada; N = não implementada/configuração desativada; E = decisão ou dependência externa; D = condicional/opcional. Não são percentuais de qualidade. T não é certificação universal nem aceite humano.

Contagem: 11 T; 38 P; 43 N; 6 E; 2 D.

| ID | Estado | Critério | Evidência e lacuna |
|---|---|---|---|
| WF01 | T | Token Vercel operacional | Release 36416239921 concluiu build e deploy. Política da conta de serviço não certificada; ver WF40. |
| WF02 | P | Preflight antecipado | Presença/acesso verificados, mas apenas no deploy, depois dos gates e ledger. |
| WF03 | P | Bash padronizado | Workflows principais declaram defaults; release não declara defaults. Seus blocos críticos têm pipefail explícito. |
| WF04 | T | Falhas em pipelines | Release usa set -eo pipefail antes de deploy/smoke com tee. |
| WF05 | P | Capturar e validar URL | deployment-url.txt existe; deploy ainda usa tee e não valida URL nem direciona smoke ao candidato. |
| WF06 | N | Deploy, smoke, promoção | --prod promove antes do smoke. Não há candidato isolado validado antes de receber o alias. |
| WF07 | N | Rollback automático | Sem rollback no workflow; runbook prevê operação manual. |
| WF08 | N | Release manual por ref | release.yml só responde a push main; não possui workflow_dispatch. |
| WF09 | T | Produção no SHA da main | Alias ativo e main remota apontam para 40e05ab. Não encerra saúde funcional: Analytics falha. |
| WF10 | P | Detector de drift | Main falhou com HTTP 400. Correção testada em PR67, ainda OPEN/BLOCKED; não publicada. |
| WF11 | P | Timeout viável | Jobs separados, mas verify-db tem 35 min para loops de até aproximadamente 30+15 min, além de rede. |
| WF12 | N | Gates por eventos | Polling continua; workflow_run não implementado. |
| WF13 | P | Check correto/paginação | Ordena por started_at; não filtra app nem pagina; avisa ao exceder 100. |
| WF14 | P | Conclusões terminais | failure/cancelled/timed_out/action_required encerram; neutral/skipped/stale aguardam timeout. |
| WF15 | T | Erro legível de API | curl --fail, erro de acesso e validação de array no jq presentes. |
| WF16 | N | Ordenação determinística | LC_ALL=C não definido nos sort/comm do ledger. |
| WF17 | T | Artefatos SQL tolerantes | mkdir precede pgTAP; upload always e if-no-files-found warn. Logs disponíveis quando etapas são alcançadas. |
| WF18 | N | Porta SQL derivada | tests/queue-concurrency.node.mjs fixa 56322. |
| WF19 | P | Drift de gerados | Tipos/dicionário/ERD falham e mostram diff; upload cobre logs, não os arquivos/diffs gerados. |
| WF20 | E | Política de autocorreção | Decisão operacional não certificada; nenhum PR automático de gerados configurado. |
| WF21 | T | Artefatos Graphify em falha | Upload if:always e warn implementados. |
| WF22 | P | Dependências Python reproduzíveis | requirements e cache pip presentes; só dependências diretas pinadas, sem hashes/transitivas fechadas. |
| WF23 | N | Base Graphify ausente | Executa script no worktree base sem guarda específica para script ausente. |
| WF24 | N | Evitar Vitest duplicado | npm run check inclui npm test; job ainda executa test:coverage depois. |
| WF25 | T | npm audit cedo | Executado após npm ci, antes de browsers/check. |
| WF26 | N | Cache Chromium | Instalação em cada run; cache de browsers não localizado. |
| WF27 | N | Reusar build cross-browser | Playwright webServer faz novo build em cada execução. |
| WF28 | T | Permissão Graphify mínima | pull-requests:read removida; contents:read. |
| WF29 | P | CodeQL ampliado | security-extended e paths-ignore declarados; análise passa. Efeito real da exclusão por input requer comprovação/configuração específica da action. |
| WF30 | P | Licenças no dependency review | deny-licenses e comentário presentes; escopo runtime não explicitado, demais licenças ainda sem inventário completo. |
| WF31 | N | SHA pinning obrigatório no GitHub | API: sha_pinning_required=false, apesar das actions pinadas nos arquivos. |
| WF32 | N | Allowlist de actions | API: allowed_actions=all. |
| WF33 | N | Secret scanning/push protection | API: ambos disabled. Gitleaks não substitui prevenção de push. |
| WF34 | N | Dependabot security updates | API: disabled/enabled=false; atualizações regulares são recurso diferente. |
| WF35 | N | Harden runner | step-security/harden-runner não localizado. |
| WF36 | P | Lint de workflows | actionlint ativo e aprovado; zizmor e validação de checksum do download não implementados. |
| WF37 | T | CODEOWNERS | Arquivo cobre todos os caminhos; revisão obrigatória ativa. Ver bloqueio de governança WF74. |
| WF38 | N | Segredos no Environment | Production tem zero secrets; jobs release sem environment. |
| WF39 | N | Restrição de branches por Environment | Production/Preview sem deployment_branch_policy. |
| WF40 | E | Conta administrativa isolada | Escopo da identidade/PAT não certificado; decisão e provisão específicas necessárias. |
| WF41 | P | Lembrete de rotação | Workflow trimestral existe; labels security/maintenance ausentes, sem deduplicação nem prova de execução efetiva/rotação. |
| WF42 | N | Limpeza de .vercel | Nenhum passo final de limpeza no release. |
| WF43 | P | Checkout sem credenciais persistidas | Maioria false; release sem configuração, stale-branches explicitamente true. |
| WF44 | N | Permissões por job | Permissões seguem no topo; ausência da separação prevista. |
| WF45 | P | Dependabot refinado | Pip/labels/prefixo presentes; cooldown e grupo de majors ausentes. |
| WF46 | T | Limite de PRs de dependências | 3 por ecossistema nos três ecossistemas configurados. |
| WF47 | E | Auto-merge de dependências | allow_auto_merge=false; workflow ausente, decisão pendente. |
| WF48 | P | Assinaturas npm | Somente quality, com continue-on-error; não aplicado a graphify/release nem bloqueante. |
| WF49 | N | SBOM de release | Não encontrado npm sbom nem artefato correspondente. |
| WF50 | P | Gitleaks por evento | Action presente; política completa por evento/schedule não explicitada no workflow. |
| WF51 | P | Composite setup-node-project | Arquivo existe, mas nenhum workflow o consome; duplicação permanece. |
| WF52 | P | Centralizar instalação npm | Composite usa npm install global; mesmos blocos continuam duplicados nos consumidores. |
| WF53 | P | Runtime local e engines | .nvmrc 24.15.0/engines alinhados na família 24; .npmrc engine-strict ausente; Vercel ainda 22. |
| WF54 | P | Runner fixo | Principais workflows usam ubuntu-24.04; release usa ubuntu-latest. |
| WF55 | N | Docs-only com no-op | Quality/database/graphify seguem executando para todo PR; no-op não localizado. |
| WF56 | N | Cache Firefox/WebKit | Browsers instalados novamente em cross-browser. |
| WF57 | N | Supabase mínimo/cache Docker | supabase start sem exclusões/cache no workflow. |
| WF58 | N | Setup CLI oficial | Permanece npm install --global supabase@2.115.0. |
| WF59 | P | Fetch-depth por evento | Quality/Graphify usam fetch-depth:0 incondicional; política reduzida não aplicada. |
| WF60 | N | Chromium em job separado | E2E Chromium continua dentro de validate, antes de cross-browser. |
| WF61 | D | Sharding condicional | Não implementado; plano condiciona a duração >6 min do job dedicado. Não ativar sem medição. |
| WF62 | P | Concurrency padronizada | Há controles, mas convenções diferentes e workflows sem concurrency; release serializado corretamente. |
| WF63 | N | Retenção por evento | Continuam 30/14/90 fixos, não PR=7/main=30/release=90. |
| WF64 | P | Runtime Vercel alinhado | API do projeto: nodeVersion=22.x; CI usa 24.15.0. Igualdade de runtime não comprovada. |
| WF65 | N | Timeout por passo de rede | Só timeouts de job; limites específicos de passos não encontrados. |
| WF66 | N | Backoff dos loops release | Sleeps fixos de 20s/15s. |
| WF67 | P | Summaries completos | Quality/health/drift têm resumos; cobertura não universal e quality repete job.status para todos os checks. |
| WF68 | P | Relatório Playwright | Reporter github/html e artefatos existem; sem summary dedicado/blob/shards. |
| WF69 | N | Cobertura com delta | Sem comparação vs main e summary específico de cobertura. |
| WF70 | P | Métricas semanais | ci-health conta últimos 50 runs; não mede mediana/p95/minutos/janela semanal. Trata não-falha como sucesso. |
| WF71 | E | Alertas para pessoas | Canais/destinatários adiados; workflow não entrega alertas externos. |
| WF72 | N | Issue de release e recuperação | Não há abertura/atualização/fechamento automático no release. |
| WF73 | P | Badges dos workflows | README contém cinco badges; não os seis originais/todos os onze atuais. |
| WF74 | P | PR obrigatório viável | Proteção exige 1 code-owner; único colaborador/CODEOWNER é autor adm01-debug. PR67 bloqueado sem revisor elegível. |
| WF75 | P | Squash/histórico linear | Conversa resolvida exigida, mas merge/rebase permitidos e linear_history=false. |
| WF76 | N | Excluir branch após merge | delete_branch_on_merge=false. |
| WF77 | N | Atualizar branch pelo GitHub | allow_update_branch=false. |
| WF78 | N | Ruleset | API retorna lista vazia. |
| WF79 | N | Checks de segurança obrigatórios | Proteção exige só quatro gates; CodeQL/dependency review não incluídos. |
| WF80 | P | Nomes explícitos estáveis | validate/cross-browser permanecem IDs sem name; release hardcodeia lista de quatro gates. |
| WF81 | N | Contrato dos nomes de gates | tests/workflow-gates.node.mjs não localizado. |
| WF82 | T | Template de PR | Checklist de CI, migrations, gerados e documentação existente. |
| WF83 | P | Templates de incidentes | Dois arquivos presentes; usam labels ci/release/priority:high não cadastradas. |
| WF84 | N | Deployment pelo Environment | Release sem environment/url; não certificado registro conforme fluxo proposto. |
| WF85 | P | Runbooks atuais | Arquivos presentes, mas fluxo ainda é promoção antes de smoke; runbook afirma branch atualizada, API strict=false. |
| WF86 | E | Preview por PR | preview.yml ausente; serviço/custo e ambiente realmente isolado dependem de decisão. |
| WF87 | N | Smoke no preview | Sem pipeline contra runtime Vercel de preview; E2E usa vite preview local. |
| WF88 | N | Lighthouse CI | Não localizado job de Lighthouse/CWV no preview; budget de bytes não substitui. |
| WF89 | E | Dry-run remoto no PR | Não há job; credencial/ambiente dedicado e autorização devem ser definidos, sem expor produção a PR. |
| WF90 | N | Ordem vs ledger remoto no PR | Validador local existe, mas comparação remota só ocorre após merge no release. |
| WF91 | P | Contrato de vercel.json | verify-vercel-artifact no release e smoke presentes; validação integral de rewrites/headers/crons no PR não demonstrada. |
| WF92 | N | SHA no pós-deploy | Workflow não consulta deployment para comparar githubCommitSha com GITHUB_SHA. Auditoria manual confirmou igualdade atual. |
| WF93 | P | Relatório de branches | Job lista >60 dias sem commit; não identifica merge>14d nem abre issue; contents:write desnecessário para leitura. |
| WF94 | P | CI health sem commit | Relatório diário lê histórico, não dispara quality/database/graphify como previsto no plano. |
| WF95 | N | ci:local | Script não existe; check também difere do quality (coverage/audit/ledger). |
| WF96 | D | Hook opcional | Não implementado; explicitamente opcional e deve respeitar decisão Graphify de não instalar hooks ocultos. |
| WF97 | N | Ledger WF100 | Validador aceita exatamente UX100/LK50/GR50/AC30. As 100 etapas não integradas; este anexo só as audita. |
| WF98 | N | Licenças de todo o inventário | Dependency review cobre mudanças; não encontrado verificador integral/SBOM+allowlist. |
| WF99 | P | SLO mensurado | Metas no plano; sem métricas p95/duração/falha semanal conforme critério. Health usa limiar 30%, não 5%. |
| WF100 | P | Fechamento do programa | Main/produção e versões SQL alinhadas; release falha no Analytics, pendências anteriores e aceites externos impedem conclusão. |
