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
| 6 | Consentimento disfarcado | Aceite de contato ou marketing precisa de acao explicita; caixa pre-marcada nao e consentimento. | "ao continuar voce aceita receber", checkbox com `defaultChecked` sem valor / `={true}` / expressao (o scanner aceita `defaultChecked={false}` e ignora exemplo comentado, e valor de rotulo como `aria-label="defaultChecked"` nao conta), spread de literal (`{...{ defaultChecked: true }}`), "ja aceitou" |

## Como a aprovacao e exigida em cada revisao de interface

1. `npm run check` (que encadeia `persuasion:check` e `claims:check`) roda no CI
   (`.github/workflows/quality.yml:88-90`, job `validate`), e é esse check que a PR precisa
   ter verde. Nos hooks locais o alcance é menor e vale saber exatamente qual:
   - `pre-push` roda as `testSuites` de `scripts/automation.config.json`, que incluem
     `tests/validate-persuasion-limits.node.mjs` — esse teste varre a interface real, então
     o limite de persuasão é conferido antes do push;
   - a cobertura local só existe com os hooks instalados (`npm run automation:install-hooks`);
     sem eles o repositório roda apenas o CI, e é o `validate` do `quality.yml` que segura a
     PR. Na instalação padrão o hook gerado executa o dispatcher e a config versionados no
     repositório (`scripts/automation.mjs:936-949`) e só cai para a cópia em `~/.git-hooks`
     quando o arquivo não existe — mudar `scripts/automation.config.json` já vale no hook
     seguinte, sem reinstalar nada. Se o hook foi instalado apontando para um perfil fora do
     repositório, é esse caminho que continua valendo: aí a edição da config versionada não
     muda nada e reinstalar (ou revisar o perfil apontado) é o que resolve;
   - `pre-commit` só roda as `testSuites` quando o commit toca automação
     (`scripts/**`, `.github/**`, `.husky/**`, `package.json`, lockfiles — `scripts/automation.mjs:1089-1097`).
     Commit que muda só `src/` não roda esse bloco: a varredura acontece no `pre-push` e no CI,
     não no commit. Foi assim que este checklist passou a descrever o que de fato acontece.
2. Reprovar significa reescrever o texto: o guard nao tem lista de excecoes, porque a etapa 009
   pede que nenhuma pagina escape do limite.
3. Linha de comentario que apenas cita o padrao para documentar a regra nao conta como promessa
   na tela, e por isso e ignorada.

## O que este checklist nao cobre

- Spread opaco de props numa caixa de consentimento (`<input {...props} />`): a varredura le
  texto, nao avalia o objeto, entao `defaultChecked` que chegue por um spread desses nao e
  visto. Spread de literal (`{...{ defaultChecked: true }}`) e visto e reprovado. Quem
  espalhar props numa caixa de consentimento precisa garantir que elas nao liguem
  `defaultChecked`.
- Honestidade do conteudo de produto e prazo — materia do inventario de afirmacoes
  (`docs/inventario-afirmacoes/INVENTARIO.md`, PF-55).
- Comparacao de mockup contra tela renderizada em 5 larguras — PF-56: o registro versionado em
  `docs/aprovacoes-visuais/` cobre a rastreabilidade byte a byte (sha256, dimensoes e bytes de cada
  PNG aprovado); a comparacao por largura segue pendente).
