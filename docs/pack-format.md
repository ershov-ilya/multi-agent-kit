# Pack format

A **source** is a directory (npm package, git repository or local folder) with:

```
multi-agent-kit.source.json   { "id": "my-kit", "private": false }
packs/
  <pack>/
    pack.json                 { "description": "…", "vars": { "name": "default" } }   optional
    skills/<name>/SKILL.md    + any reference files
    agents/<name>.md          subagent (Claude Code, Cursor, Codex)
    agents/<name>.mdc         always-applied agent prompt, emitted as a rule
    commands/<name>.md        slash command (Cursor) and skill (all tools)
    rules/<name>.mdc          Cursor rule; Claude Code gets it as .claude/rules/<name>.md
    context/<name>.md         project context (.cursor/context/)
    mcp/<name>.json           { "mcpServers": { … } }, merged across layers
```

A project's **local layer** has the same structure as a single pack.

## Skills

Skills follow the [Agent Skills](https://agentskills.io) format:

```markdown
---
name: my-skill                # must match the folder name
description: >-
  What the skill knows and when to use it. Lists the words and situations that should
  trigger it. At most 1024 characters.
---

# Body: algorithm, maps, checklists. Long material goes to references/*.md.
```

Link sibling skills by relative path (`../other-skill/SKILL.md`): all skills end up side by side
in `skills/`, whatever pack they come from.

## Agents

```markdown
---
name: reviewer
description: What it does. Use when …
model: inherit                # or a model name for Codex
readonly: true                # Codex: sandbox_mode = "read-only"
---

Instructions.
```

## Variables

Pack files may use:

| Variable | Value |
|----------|-------|
| `{{mak.project}}` | `name` from the project config |
| `{{mak.local}}` | the local layer path |
| `{{mak.decisions}}`, `{{mak.scopes}}` | decisions directory and scopes |
| `{{mak.cli}}` | how to run the CLI (`npx multi-agent-kit` by default) |
| `{{vars.<name>}}` | project `vars`, falling back to `pack.json` defaults |

An unknown variable fails `sync`. Never put secrets into `vars`: they end up in committed files.
Reference environment variable names instead.

## Checks

`multi-agent-kit lint` validates frontmatter, description length, relative links, variables without
defaults, and looks for secrets (private keys, tokens, connection strings with passwords). Pass
`--deny <file>` with words or `/regex/` lines that must not appear, for example personal names
and internal hostnames before publishing a pack.
