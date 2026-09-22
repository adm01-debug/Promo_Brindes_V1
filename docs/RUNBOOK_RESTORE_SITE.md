# Ensaio de recuperação — banco isolado do Site Promo Brindes

Alvo exclusivo: `xlzmclcjdncjfdrjxclt`. **Nunca** escolher o banco do Promo Gifts (`doufsxqlfjyuvxuezpln`). Este procedimento não executa restauração nem define sozinho o RPO/RTO contratual. Responsável operacional, janela, destino pago e tolerância de perda/indisponibilidade exigem decisão registrada antes do ensaio.

## Preparação e travas

1. Registrar incidente ou ticket do ensaio, responsável, aprovações, horário UTC e São Paulo, RPO/RTO-alvo e custo do projeto de destino. Confirmar no Dashboard do projeto isolado a lista, horário e integridade dos backups. Backups diários não são PITR; o último ponto recuperável pode implicar perda de até aproximadamente um dia. **Não ativar PITR nem restaurar sobre produção sem decisão explícita.**
2. Selecionar **Restore to a New Project** no painel do Supabase do projeto isolado e um backup anterior ao marco de teste. Anotar ref do novo projeto antes de alterar qualquer configuração. Nunca escolher “restore” sobre o projeto atual para um drill; isso causa indisponibilidade e substituição de dados.
3. Restringir acesso ao clone: ele contém banco, usuários Auth, permissões e dados pessoais. Não conectar o clone à Vercel pública ou aos provedores. A restauração física pode religar `pg_cron`, `pg_net` e outros jobs imediatamente; para dados reais, isolar previamente a saída de rede no ambiente de destino ou escolher um ensaio lógico sem jobs externos. Se não for possível garantir esse isolamento, interromper o drill antes de restaurar.
4. A cópia física **não inclui objetos do Storage nem suas configurações**, mesmo que traga metadados do banco. Planejar cópia/teste separado para PDFs privados; não declarar proposta recuperada porque a linha `proposal_documents` existe. Auth settings, API keys, funções e configurações de Realtime/extensões também exigem verificação própria.

## Aceite do ensaio

- Medir tempo entre início e clone pronto (RTO observado), e diferença entre último dado reconhecido e último recuperado (RPO observado). Comparar com os alvos aprovados.
- Via `pg_catalog` no **clone**, verificar as 17 tabelas privadas esperadas, FORCE RLS em todas, funções/grants e ledger de migrations; validar contagens amostrais de pedidos, eventos, outbox, seleções e titulares. Não usar PostgREST/OpenAPI para certificar trigger, RLS ou grants.
- Exercitar com **contas sintéticas** isolamento A/B, leitura do histórico, restauração de seleção, assinatura de PDF apenas se o objeto foi copiado separadamente, e recusa de uma origem/credencial de produção. Não enviar e-mail/WhatsApp reais.
- Documentar lacunas, custo, evidência sanitizada, responsável e data do próximo ensaio. Só excluir o clone após confirmar que não é mais necessário para investigação e que não está conectado a nenhum serviço.

Fontes operacionais atuais: [Backups do Supabase](https://supabase.com/docs/guides/platform/backups) e [Restore to a New Project](https://supabase.com/docs/guides/platform/clone-project). A segunda opção está documentada como beta e pode ter custo; conferir disponibilidade e preço no momento do ensaio.
