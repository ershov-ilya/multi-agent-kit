---
title: monorepo-subprojects
status: implemented
created: 2026-10-25
implementation: released in 1.1.0
---

# RFC-0001: multi-root monorepos

## Context

The first real migration of a multi-root monorepo (corpent-portal: eight Cursor roots — `workspace/`
with the orchestrator, `web/`, `content/`, `registry/`, `auth/`, `relay-ai-corpen/`,
`control-tg-corpent/` and the `api/` git submodule) showed gaps in 1.0.1:

1. Every Cursor root needs its own `.cursor/`, but Claude Code and Codex start at the repository root
   and must see the agents of all subprojects. Claude Code discovers project subagents only by walking
   **up** from the working directory, so agents defined in `web/` are invisible from the root.
2. Skills may ship scripts (`control-tg-corpent` has `scripts/import_public_preview.py`). The engine
   treated every skill file as markdown: it would insert an HTML comment into the Python file, apply
   `{{…}}` substitution to it and drop the executable bit.
3. A root and its subprojects share one `.git/info/exclude`. Each `sync` rewrote the single private
   block, so the last project to sync un-excluded the private files of the others.
4. Cursor-only and Claude-only projects got an `AGENTS.md` with the workflow block although only Codex
   reads `AGENTS.md`; in a multi-root workspace this created stray `AGENTS.md` files in subproject roots.
5. In a monorepo, `adopt <file>` resolved paths against `--root` and did not find files of
   subprojects; `delete`, `enable`, `disable` and `adopt --new` re-synced only the project they ran in;
   stale removal left empty skill folders behind.

## Proposal

**`subprojects` in `multi-agent-kit.json`.** A list of folders, each with its own config and `local`
layer: `["web", { "path": "workspace", "scope": false }, { "path": "api", "optional": true }]`.

- The root collects agents, skills, commands, rules and MCP servers of every subproject layer, after
  packs and before its own local layer. Context stays with the subproject.
- The same item name in two subprojects is an error; the root's own local layer may override.
- Rules from a subproject get `paths: ["<subproject>/**"]` in `.claude/rules/`, so Claude Code applies
  them only to that folder (documented in Claude Code: rules without `paths` load at launch, path-scoped
  rules load when a matching file is read or edited). `scope: false` keeps a subproject's rules global
  (for the orchestrator's folder).
- `sync` and `check` at the root run every subproject first, then the root, and report per project.
- `optional: true` skips a subproject whose config is missing (an uninitialised git submodule).

**Files that are not markdown** are copied byte for byte, keep the executable bit, get no marker and
no variable substitution. They count as generated when an earlier sync listed them in a manifest, so
stale ones are removed and hand-made ones are never overwritten.

**One exclude block per project**, tagged with the project's path inside the repository
(`# multi-agent-kit:private:start web`).

**`AGENTS.md` workflow block only when `codex` is a target.** Cursor and Claude Code already get the
`agent-kit-workflow` rule.

**Monorepo ergonomics.**

- `adopt <file>`: paths are relative to the current directory; each file goes to the nearest project
  with `multi-agent-kit.json`, so `adopt web/.cursor/agents/web-subagent.md` works from the root.
- `adopt --new --to <subproject>` moves a hand-made item into that subproject's layer.
- `delete`, `enable`, `disable`, `adopt --new` re-sync the whole tree.
- Stale removal prunes empty folders.

## Compatibility

- New config key; projects without `subprojects` behave as before.
- Projects with only `cursor` or only `claude` targets stop updating the `AGENTS.md` block; an existing
  block stays as it is.
- Non-markdown skill files in existing projects lose the marker comment on the next sync (they never
  should have had one).

Released in 1.1.0.

## Verification

- `test/engine.test.mjs`: "a monorepo root aggregates subprojects and syncs them recursively" covers
  aggregation, scoped rules, scripts, per-project exclude blocks, recursive check, adopt from the root,
  `adopt --new --to <subproject>`, recursive delete and empty-folder pruning.
- corpent-portal on branch `multi-agent`: 26 of 36 Cursor files byte-identical to the originals except
  the marker; the other 10 differ only in intended reference updates; `check` passes in all nine roots.

## Open questions

Not blocking; left for later releases.


- Should `init` detect a `.code-workspace` file and write the root and subproject configs?
- Should subprojects inherit the root's `sources` so they can enable packs without repeating them?
