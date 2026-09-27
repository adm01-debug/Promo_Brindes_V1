## O que esta PR faz

<!-- Descreva o que mudou e por quê. Seja específico: "Corrige bug X que causava Y" ou "Adiciona feature Z para permitir W". -->

## Como testar

<!-- Se aplicável, descreva passos para verificar manualmente. -->

## Checklist

- [ ] CI verde — Quality gate + Isolated site database + Graphify structural map
- [ ] Sem drift em tipos (`site-database.types.ts`), dicionário ou ERD
- [ ] Sem vulnerabilidades de `npm audit --audit-level=high`
- [ ] Migrations nomeadas conforme padrão (`YYYYMMDDHHMMSS_descricao.sql`)
- [ ] Documentação atualizada (se aplicável)

## Itens bloqueantes para merge

<!-- Liste qualquer dependência externa, PR relacionada ou item pendente. -->
