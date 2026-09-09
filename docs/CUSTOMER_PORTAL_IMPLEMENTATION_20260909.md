# Área do Cliente — implementação e critérios de aceite

Data: 09/09/2026

Destino exclusivo: Supabase `xlzmclcjdncjfdrjxclt`

Catálogo canônico: `doufsxqlfjyuvxuezpln` — somente leitura, sem alterações nesta entrega

## Resultado projetado

A experiência preserva o principal ativo do site: o cliente pode montar e enviar seu primeiro briefing sem cadastro. A conta surge como continuidade útil, não como barreira. Depois de verificar o mesmo e-mail informado no orçamento, a pessoa passa a consultar o histórico, acompanhar movimentos reais, abrir propostas publicadas e reaproveitar uma seleção.

Não há checkout, pagamento, preço ou promessa de estoque. Não há status inventado: a interface mostra apenas os estados e eventos persistidos pelo fluxo comercial.

## Trinta checkpoints executados

1. Jornada sem cadastro preservada no primeiro envio.
2. Entrada “Meus orçamentos” adicionada ao cabeçalho, menu móvel e rodapé.
3. Tela de acesso editorial e responsiva criada.
4. Link mágico/código por e-mail suportado.
5. Entrada com senha suportada.
6. Criação de senha com confirmação de e-mail suportada.
7. Recuperação e redefinição de senha suportadas.
8. Redirect pós-login limitado a caminhos internos da Área do Cliente.
9. Callback inválido recebe estado de erro recuperável, sem carregamento infinito.
10. Sessão persistente e atualização automática delegadas ao Supabase Auth.
11. Credencial pública validada antes de entrar no bundle; secret keys são recusadas.
12. Cliente Auth fixado defensivamente no Supabase isolado do site.
13. Titular opcional adicionado aos pedidos existentes sem quebrar o envio anônimo.
14. Associação retroativa limitada a e-mail confirmado e normalizado.
15. Associação idempotente: repetir o login não duplica nem transfere solicitações.
16. RPC de listagem limitada por `auth.uid()`, status, busca e paginação.
17. RPC de detalhe retorna somente o pedido do titular autenticado.
18. Snapshot do briefing original mantido imutável na experiência.
19. Linha do tempo pública separada de eventos internos.
20. Mudanças reais de status geram eventos auditáveis.
21. Painel com busca, filtros, paginação e estados vazio/erro/carregamento.
22. Detalhe com produtos, quantidades, contato, prazo e contexto original.
23. “Solicitar novamente” repõe o snapshot no moodboard antes de um novo envio.
24. Metadados de propostas versionados e visíveis somente após publicação.
25. PDFs limitados ao bucket privado `customer-proposals`, apenas `application/pdf`, até 20 MB.
26. Download exige sessão do titular e URL assinada por somente 60 segundos.
27. Endpoint recusa origem estranha, UUID inválido, bucket estranho e URL externa.
28. Páginas privadas recebem `noindex`; analytics usam allowlist sem e-mail ou protocolo.
29. Aviso de privacidade atualizado para conta, sessão, histórico, isolamento e direitos.
30. Fluxos desktop/mobile, acessibilidade, banco, API, tipos, build e dependências cobertos por testes automatizados.

## Modelo de segurança

- `site_private` permanece fora dos schemas expostos pela Data API.
- `anon` não executa RPCs da Área do Cliente e não recebe grants nas tabelas privadas.
- `authenticated` executa apenas funções públicas específicas; as funções validam `auth.uid()`.
- Os RPCs são `security definer` com `search_path` vazio para evitar object shadowing.
- A confirmação do e-mail é consultada em `auth.users`, não aceita como alegação do navegador.
- Um pedido já titularizado nunca é reivindicado por outra conta.
- Um UUID alheio retorna o mesmo estado genérico de item inexistente.
- A secret key permanece exclusivamente nas Functions da Vercel.
- O bucket não é público e nenhum cliente recebe política direta em `storage.objects`.
- O endpoint assina apenas objetos autorizados pelo RPC, no bucket esperado e no host isolado.

## Evidências locais de validação

```text
TypeScript: aprovado
Vitest: aprovado
Build de produção: aprovado
Playwright: 44 aprovados; 4 exclusões intencionais dependentes de viewport
WCAG automatizado A/AA: nenhuma violação nos templates verificados
pgTAP: 42 asserções aprovadas
Supabase db lint: nenhum erro de schema
npm audit --omit=dev --audit-level=high: 0 vulnerabilidades
git diff --check: aprovado
```

Os testes de banco usam duas identidades confirmadas e uma não confirmada. Eles demonstram isolamento cruzado, reivindicação seletiva por e-mail, idempotência, negação ao anônimo e bloqueio da identidade ainda não verificada.

## Ativação remota controlada — executada em 09/09/2026

1. CLI autenticada com uma sessão administrativa nova.
2. `db:site:guard` confirmou exclusivamente `xlzmclcjdncjfdrjxclt`.
3. O dry-run mostrou somente `20260909180000_create_customer_quote_portal.sql`.
4. A migration foi aplicada e o ledger local/remoto ficou reconciliado.
5. O lint remoto terminou sem erro nos schemas `public` e `site_private`.
6. Site URL, redirects e senha mínima de oito caracteres foram configurados no Auth.
7. Redirects, MFA, Twilio, pooler, SSL e Storage Analytics preexistentes foram preservados.
8. `VITE_SITE_SUPABASE_URL` e `VITE_SITE_SUPABASE_PUBLISHABLE_KEY` foram adicionadas à Vercel em Production e Preview, sem expor secret keys.

O smoke test pós-deploy deve validar a interface publicada, o login real, uma identidade sem histórico e a impossibilidade de acesso cruzado. Qualquer registro sintético precisa ser removido por identificador exato ao final.

Não executar `db reset --linked`, não copiar a secret key para variáveis `VITE_` e não aplicar esta migration ao catálogo canônico.
