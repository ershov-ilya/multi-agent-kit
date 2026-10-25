---
title: cross-tool-duplicates
status: implemented
created: 2026-10-25
implementation: A and C released in 1.1.0; Cursor verification pending
---

# RFC-0002: the same agent or skill seen twice by one tool

## Context

Each tool reads the folders of the others for compatibility (official docs, checked 2026-10-25):

| Tool | Subagents | Skills |
|------|-----------|--------|
| Cursor | `.cursor/agents/`, `.claude/agents/`, `.codex/agents/` — "`.cursor/` takes precedence over `.claude/` or `.codex/`" | `.cursor/skills/`, `.agents/skills/`, plus `.claude/skills/`, `.codex/skills/`; a nested `.cursor/skills/` or `.agents/skills/` anywhere in the repo applies to its folder; precedence not documented |
| Claude Code | `.claude/agents/`, walking up from the working directory | `.claude/skills/` (start folder and parents at launch; nested ones on first file access) |
| Codex | `.codex/agents/` | `.agents/skills/` |

Sources: https://cursor.com/docs/agent/subagents, https://cursor.com/docs/context/skills,
https://code.claude.com/docs/en/sub-agents.md, https://code.claude.com/docs/en/skills.md.

The engine writes one copy per target into the same folder. So:

- **Template projects** (targets `cursor`, `claude`, `codex`): Cursor finds every skill three times
  (`.cursor/skills`, `.claude/skills`, `.agents/skills`) and every subagent three times.
- **Claude + Codex projects** opened in Cursor: two copies of each skill and subagent.
- **Monorepos (RFC-0001)**: the root's `.claude/` and `.codex/` aggregate all subprojects; when the
  repository root is also a folder of a Cursor multi-root workspace, Cursor sees the root copies next to
  each subproject's `.cursor/`. Multi-root behaviour is not documented.

The copies are identical apart from the marker, and Cursor prefers `.cursor/` for subagents, so the
harm is probably limited to noise. It is not verified for skills or across workspace roots.

## Options

A. **Emit skills once for Cursor and Codex.** When both `cursor` and `codex` are targets, write skills
   only to `.agents/skills/` (read by both) and skip `.cursor/skills/`. Removes one copy; Claude still
   needs `.claude/skills/`.

B. **Per-target opt-out of compatibility copies.** Config `"compat": { "cursor": "dedupe" }`: when
   Cursor is a target, skip `.claude/agents` / `.codex/agents` entries whose names also exist in
   `.cursor/agents`. Not possible: Claude and Codex need those files.

C. **Document and accept.** Rely on Cursor's `.cursor/` precedence; tell users not to open a monorepo
   root as an extra Cursor folder, or to keep the root generating only for tools that start there.

D. **Root aggregation into a separate folder** read only by Claude Code and Codex. Not possible for
   Claude Code subagents and skills, which must be in `.claude/`.

## Recommendation

A + C. Implement A (one copy fewer, no loss for any tool) and document C in README and AGENTS.md.

## Decision

A + C, released in 1.1.0.

- When both `cursor` and `codex` are targets, skills (and commands turned into skills) go only to
  `.agents/skills/`; `.cursor/skills/` is written only for projects that target Cursor without Codex.
  Copies left by earlier versions are removed by the next `sync` as stale files. Hand-made skills in
  `.cursor/skills/` are not touched.
- Subagents keep one copy per tool: Cursor prefers `.cursor/agents/`.
- README and AGENTS.md describe the remaining duplicates and how to avoid them in multi-root
  workspaces.
- Test: "targets limit outputs and drop old platform files" covers the switch from `cursor` to
  `cursor` + `codex`.

If the checks below show that Cursor ignores `.agents/skills/` in some setup, revert to writing
`.cursor/skills/` and record that in an ADR.

## Verification plan (in Cursor)

1. Project with targets `cursor` + `codex`: does the skills list show one entry per skill after A?
2. Multi-root workspace with the repository root as a folder: are subagents from root `.claude/agents/`
   listed next to the same-named `.cursor/agents/` of a subproject root? Which one runs?
3. Same-named skill in `.cursor/skills/` and `.claude/skills/`: which one does Cursor load?
4. Is an `.mdc` file in `.cursor/agents/` ignored by Cursor? The engine already turns `agents/*.mdc`
   into `.cursor/rules/*.mdc`; confirm this matches what users had before migrating.
