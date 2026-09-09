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

## Ativação remota controlada

1. Autenticar a CLI do Supabase com uma sessão administrativa nova.
2. Executar `npm run db:site:guard` e confirmar `xlzmclcjdncjfdrjxclt`.
3. Executar `npm run db:site:dry-run` e revisar somente a migration nova.
4. Aplicar `SUPABASE_WORKDIR=site-supabase npx supabase@latest db push`.
5. Configurar Site URL, redirects e confirmação de e-mail no Auth.
6. Adicionar `VITE_SITE_SUPABASE_URL` e `VITE_SITE_SUPABASE_PUBLISHABLE_KEY` à Vercel em Production e Preview.
7. Fazer novo build, publicar e executar o smoke test pós-deploy com duas contas distintas.
8. Confirmar no banco que nenhum dado foi escrito no projeto canônico.

Não executar `db reset --linked`, não copiar a secret key para variáveis `VITE_` e não aplicar esta migration ao catálogo canônico.
