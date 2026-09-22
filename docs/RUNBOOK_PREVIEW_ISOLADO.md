# Preview isolado do Site Promo Brindes

O Preview da Vercel não pode ler/escrever o banco **de produção do site** (`xlzmclcjdncjfdrjxclt`) nem o banco do Promo Gifts (`doufsxqlfjyuvxuezpln`). O build e as APIs falham fechados se receberem as variáveis compartilhadas de Production. Isso é intencional: uma tela de login indisponível em Preview é mais segura que um ensaio escrevendo dados reais.

## Ativação por branch/deploy

1. Criar ou identificar uma branch Supabase isolada vinculada ao PR, confirmar que seu ref não coincide com nenhum dos dois refs acima e que as migrations do site foram aplicadas. Branch efêmera não serve para um Preview permanente após o merge.
2. No escopo **Preview** da Vercel (ou na branch específica), atribuir `VITE_SITE_PREVIEW_PROJECT_REF` e `SITE_PREVIEW_SUPABASE_PROJECT_REF` com esse ref; `VITE_SITE_SUPABASE_URL` e `SITE_SUPABASE_URL` com `https://<ref>.supabase.co`; e publishable/secret key próprias da branch. Não colocar secrets em variáveis `VITE_`.
3. Usar `SITE_REQUEST_HASH_SALT` exclusivo da branch. Não configurar `RESEND_API_KEY`/Meta para ensaios públicos; o worker e o envio imediato recusam mensagens reais em `VERCEL_ENV=preview` mesmo se elas forem herdadas.
4. A origem aceita pelas APIs em Preview é **somente** `https://${VERCEL_URL}`. A origem de Production configurada em `SITE_PUBLIC_ORIGIN` é recusada ali. Testar a mesma submissão sintética nas duas origens e verificar que a origem de Production recebe `403`.
5. Atualizar a política `connect-src` do Preview para o ref específico antes de habilitar Auth no navegador. `vercel.json` hoje contém allowlist estática dos dois bancos de produção para Production; não ampliar a política a todos os projetos Supabase por conveniência. A publicação desse ref deve ser revisada no PR e revertida ao desativar a branch.
6. Criar duas contas sintéticas na branch; verificar que uma não lê seleções nem pedidos da outra, que o Preview não mostra dados de Production e que não há novos pedidos no banco de Production após o ensaio. Não usar destinatários reais, produtos fictícios no catálogo canônico nem credenciais copiadas do banco principal.

## Condição de publicação

Enquanto a Vercel mantiver `SITE_SUPABASE_URL`, `VITE_SITE_SUPABASE_URL` e `SITE_SUPABASE_SECRET_KEY` compartilhadas entre Production e Preview, o Preview é **somente leitura do catálogo público**. Não marcar isolamento ponta a ponta como validado. Não remover a guarda para “fazer o formulário funcionar”.

Para um Preview permanente, decidir explicitamente custo, retenção e dono da branch/projeto isolado; só depois automatizar a rotação das variáveis e a CSP específica. A integração GitHub do Supabase pode criar branches efêmeras por PR, mas isso não injeta automaticamente URL, chaves e ref no runtime Vercel.
