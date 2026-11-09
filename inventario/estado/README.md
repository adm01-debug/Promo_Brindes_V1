# inventario/estado — gerado, não edite

`banco.json` é o estado real do banco do site + alertas, gravado por
`scripts/inventario/gerar-banco.mjs` e entregue por PR pelo workflow
`.github/workflows/inventario-estado-semanal.yml` (segunda 10:23 UTC).

- Não edite à mão: a próxima coleta sobrescreve.
- O arquivo está no `.gitignore` e entra no repo só pelo PR `automation/inventario-estado`
  (`add-paths`), para que uma coleta local não vire commit sem passar pelo workflow.
- O que cada campo significa e a lista de alertas: `scripts/inventario/README.md`.
- Rotas, módulos, hooks e grafo **não** ficam aqui: `docs/contexto/codigo/` na branch `contexto`
  (índice em `docs/contexto/00-INDEX.md`).
