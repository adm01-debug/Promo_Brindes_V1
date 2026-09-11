## Graphify

This repository has a local knowledge graph at `graphify-out/`. It is an engineering aid: source code, tests and verified deployment state remain authoritative.

- For a codebase question, run `npm run graph:status` first. If it is current, use `npm run graph:query -- "<question>"`; use `npm run graph:impact -- "<symbol>"` only as a scoped neighborhood map.
- If the graph is absent or stale, use `npm run graph:update` (the project wrapper performs an atomic, code-only rebuild). Do not call `graphify update .` directly because it bypasses the project safety checks.
- The automated map is local AST extraction only: it must not use AI providers, network access, the Supabase projects, or the internal Promo Gifts repository.
- Treat `graphify-out/` as generated and ignored. Do not add it to the frontend, commit it, or infer that a migration is remotely applied merely because a relationship exists in the graph.
- The current headless Graphify format is undirected. A reported impact is a reading/test lead, not proof of causal reverse dependency; verify relevant files and tests before changing behavior.
