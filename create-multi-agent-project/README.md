# create-multi-agent-project

Start a multi-agent monorepo wired to [multi-agent-kit](https://github.com/ershov-ilya/multi-agent-kit):

```bash
npx create-multi-agent-project my-app
```

You get `workspace/` (orchestrator, qa, devops, ADR / RFC / OPS), `web/` and `engine/` in one git
repository, with agents, skills and rules generated for Claude Code, Cursor and Codex.

Options: `--name <kebab-name>`, `--no-install`, `--no-git`.
