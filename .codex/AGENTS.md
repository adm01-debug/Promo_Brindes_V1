# Codex CLI — baseline deste repositório

Complementa o `AGENTS.md` da raiz, que continua sendo a fonte das regras de trabalho.
Referência longa por tema: `docs/agentes/<tema>.md` (comece por `mapa-repo.md`).

## Skill do repositório

- Skill para o Codex: `.agents/skills/promo-brindes-v1/SKILL.md`
- Cópia para o Claude Code: `.claude/skills/promo-brindes-v1/SKILL.md` (os dois arquivos são idênticos)
- Credenciais e MCPs privados ficam em `~/.codex/config.toml`, nunca neste repo.

## Baseline de MCP

Trate `.codex/config.toml` como o baseline para trabalho neste repositório: GitHub, Context7, Exa,
Memory, Playwright e Sequential Thinking. Escrita no GitHub é só pelo MCP `GITHUB - MCP - FOREVER`
(ver `docs/agentes/github-ci.md`); SQL é só pelos MCPs de Supabase descritos em `docs/agentes/banco.md`.

## Multi-agente

- Explorer: levantamento de evidência, somente leitura
- Reviewer: correção, segurança e regressão
- Docs researcher: verificação de API e release notes

## Arquivos de workflow

Não há arquivos de workflow de tarefa gerados para este repo; os comandos canônicos estão em
`package.json` e em `docs/agentes/mapa-repo.md`.
