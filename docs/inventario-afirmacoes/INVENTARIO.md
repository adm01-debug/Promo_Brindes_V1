# Inventário de afirmações comerciais (PF-55)

O site faz afirmações sobre o que o cliente vai receber. Toda afirmação precisa de
**dono** (quem responde por ela), **status** e **prova no código**. Sem isso, a frase
vira promessa sem lastro — e a primeira cobrança vira reclamação.

Fonte legível por máquina: [`afirmacoes.json`](./afirmacoes.json).
Guard: `npm run claims:check` (roda dentro de `npm run check`).

## Como o guard funciona

Para cada afirmação do JSON, `scripts/validate-commercial-claims.mjs` confere:

1. os campos obrigatórios existem (`id`, `claim`, `where`, `owner`, `status`, `evidence`, `checkedAt`);
2. cada `where.file` existe e `where.line` está dentro do arquivo;
3. o `snippet` citado **aparece naquela linha** — se alguém reescreveu a frase, o guard acusa;
4. a `evidence` aponta arquivo existente e, quando há `pattern`, o padrão aparece no arquivo.

O passo 3 é o que protege de verdade: mover a frase de lugar ou trocá-la por outra
promessa reprova o build em vez de passar silencioso.

## Afirmações registradas

| ID | Afirmação | Onde vive | Dono | Status |
| --- | --- | --- | --- | --- |
| AC-01 | "Receba uma proposta real" | `HomePage.tsx:211`, `QuoteDrawer.tsx:264` | negócio | confirmada |
| AC-02 | "Zero checkout. Zero compromisso." / "não é uma loja virtual" | `QuoteDrawer.tsx:263`, `ContextualFaq.tsx:8`, `AboutPage.tsx:18` | negócio | confirmada |
| AC-03 | "Você não paga nada pelo site" | `ProductPage.tsx:157` | negócio | confirmada |
| AC-04 | "Explore sem login" | `HomePage.tsx:369`, `CatalogPage.tsx:32` | negócio | confirmada |
| AC-05 | "curadoria humana" / "time de especialistas" | `CatalogPage.tsx:30`, `ContactPage.tsx:15`, `ProductPage.tsx:157` | negócio | ajustar-texto |
| AC-06 | "Estas referências não representam preço, estoque ou prazo" | `IdeaLandingPage.tsx:42` | negócio | confirmada |
| AC-07 | Disponibilidade, cor e prazo confirmados na proposta | `ContextualFaq.tsx:9` | negócio | confirmada |
| AC-08 | Contato continua pelo e-mail ou WhatsApp informado | `ContextualFaq.tsx:18` | negócio | confirmada |
| AC-09 | Amostra, variantes e prazo dependem do produto | `ContextualFaq.tsx:15` | negócio | confirmada |
| AC-10 | "Materiais de menor impacto" | `campaignPresets.ts:50`, `commemorativeDates.ts:103` | negócio | confirmada |
| AC-11 | "Proposta sob medida" / "recomendação sob medida" | `QuotePage.tsx:415`, `ProductCard.tsx:64` | negócio | confirmada |

## Por que cada uma tem lastro

- **AC-01**: existe proposta versionada publicada pelo back-office (PF-23) e o titular
  baixa o arquivo real na Área do Cliente (`CustomerQuotePage` — `proposal.isCurrent`).
- **AC-02 / AC-03**: não há gateway de pagamento nem rota de checkout; o único destino
  da seleção é `/orcamento`. A frase fala do site, não da proposta comercial. Em AC-03
  a prova é **mecânica**: `evidence.absenceOf` varre `src/` e `api/` e reprova se
  aparecer `stripe`, `pagarme`/`pagar.me`, `mercadopago`, `asaas`, `payment_intent`,
  `hotmart` ou `kiwify`; raiz declarada que deixar de existir reprova o inventário em
  vez de aprovar uma varredura vazia. Antes a prova citava o slogan "Zero checkout" do
  próprio site — confirmava a frase com a frase.
- **AC-04**: catálogo e produto não importam `useAuth` nem redirecionam para login. A
  conta serve para guardar histórico, não é pré-requisito para explorar.
- **AC-05**: **ajustar-texto**, não confirmada. O código prova que o back-office existe, não que haja
  gente atendendo: falta declarar o mínimo operacional (quem responde e em quanto tempo) ou trocar por um
  compromisso verificável. O acompanhamento existe em `/admin/orcamentos`; se a operação parar,
  a frase fica falsa. Decisão do dono.
- **AC-10**: "menor impacto" é atributo de filtro do catálogo (`search.ts:46` aceita o termo no
  universo sustentável), não certificação ambiental do produto entregue.
- **AC-11**: a proposta é montada pelo briefing (momento, público, escala, clima), não por preço
  de tabela; a frase não promete prazo nem desconto.
- **AC-06 / AC-07 / AC-09**: o contrato público do catálogo não publica preço, estoque
  nem prazo; a UI repete o aviso exatamente onde mostra produto.
- **AC-08**: o briefing coleta `responseChannel`; a confirmação lista e-mail e WhatsApp.

## Como adicionar uma afirmação nova

1. Escreva a frase no componente.
2. Acrescente um item em `afirmacoes.json` com `file` **e** `line` corretos e um
   `snippet` curto que só exista naquela frase.
3. Preencha `owner`, `evidence` e `checkedAt` (AAAA-MM-DD).
4. Rode `npm run claims:check`. Verde = a frase está rastreada.

## Lacunas conhecidas

- **Prazo de resposta** não é afirmado em lugar nenhum hoje — correto, porque não há SLA
  acordado com a operação. Se a promessa for criada, precisa entrar aqui primeiro.
- **Preço** nunca é afirmado. Se surgir faixa de preço na UI, ela exige entrada nova com
  dono explícito, porque é a afirmação de maior risco jurídico.
- O guard cobre os arquivos listados, não uma varredura de todo o `src/`. Uma frase nova
  em outro arquivo só é pega quando alguém a registra — o risco residual é aceito em
  troca de um guard barato e sem falso positivo.
