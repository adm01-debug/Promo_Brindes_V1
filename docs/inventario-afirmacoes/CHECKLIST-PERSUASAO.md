# Checklist de limites de persuasao (etapa 009 do plano Carnegie)

O plano Carnegie exige, na etapa 009, um checklist contra seis praticas: urgencia ficticia,
culpa ao recusar, elogio automatico exagerado, dado presumido, prova social inventada e
consentimento disfarcado. Este documento e a versao legivel do que
`scripts/validate-persuasion-limits.mjs` verifica automaticamente.

| # | Limite | Por que existe | Como e reprovado |
| - | ------ | -------------- | ---------------- |
| 1 | Urgencia ficticia | Prazo ou escassez inventados pressionam uma decisao que o negocio nao impoe. O prazo real do orcamento vem do briefing, nao de um contador. | "ultimas unidades", "so hoje", "ultima chance", "oferta acaba", "vagas limitadas", "tempo restante", "expira em" |
| 2 | Culpa ao recusar | Sair, pular uma etapa ou escolher outro produto nao pode gerar mensagem depreciativa; abandonar o briefing e um direito do visitante. | "vai se arrepender", "nao deixe para depois", "vai perder essa chance", "voce esta deixando" |
| 3 | Elogio automatico exagerado | Elogiar a escolha sem conhecer o pedido e adulacao vazia e reduz a confianca no restante da pagina. | "excelente escolha", "otima escolha", "perfeita escolha", "voce tem bom gosto", "escolha inteligente" |
| 4 | Prova social inventada | Numero de clientes, nota e depoimento so entram se forem reais e rastreaveis; sem fonte, e fabricacao. | "N mil clientes", "mais de N empresas", "nota X de 5", "5 estrelas", "melhor do mercado" |
| 5 | Dado presumido | Campo de formulario so pode vir do visitante ou da conta dele (`useAuth`), nunca de suposicao sobre o historico. | "supomos que", "provavelmente voce", "sabemos que voce", "como voce sempre" |
| 6 | Consentimento disfarcado | Aceite de contato ou marketing precisa de acao explicita; caixa pre-marcada nao e consentimento. | "ao continuar voce aceita receber", `defaultChecked` em checkbox, "ja aceitou" |

## Como a aprovacao e exigida em cada revisao de interface

1. `npm run persuasion:check` no `npm run check` e nos hooks `pre-commit`/`pre-push`
   (`scripts/automation.config.json`, campo `testSuites`).
2. Reprovar significa reescrever o texto: o guard nao tem lista de excecoes, porque a etapa 009
   pede que nenhuma pagina escape do limite.
3. Linha de comentario que apenas cita o padrao para documentar a regra nao conta como promessa
   na tela, e por isso e ignorada.

## O que este checklist nao cobre

- Honestidade do conteudo de produto e prazo — materia do inventario de afirmacoes
  (`docs/inventario-afirmacoes/INVENTARIO.md`, PF-55).
- Comparacao de mockup contra tela renderizada em 5 larguras — PF-56: o registro versionado em
  `docs/aprovacoes-visuais/` cobre a rastreabilidade byte a byte (sha256, dimensoes e bytes de cada
  PNG aprovado); a comparacao por largura segue pendente).
