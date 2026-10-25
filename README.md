# multi-agent-kit

One source of skills, agents, rules, commands and MCP servers for **Claude Code**, **Cursor** and **Codex**. Write a skill once, connect the packs a project needs, and every project gets the same up-to-date files for all three tools. Public packs live here; your private and project-specific layers stay in your own repositories.

> The bundled skills are written in Russian. The engine and the pack format are language-agnostic.

## Why

If you work with AI coding agents across several projects, you probably know these problems:

- **Copies drift.** A good skill gets copied from project to project; you improve it in one place and
  the other copies stay old.
- **Three tools, three formats.** Claude Code wants `.claude/skills/`, Cursor wants `.cursor/rules/*.mdc`,
  Codex wants `.agents/skills/` and TOML agents. Keeping them in sync by hand is busywork.
- **Personal and public get mixed.** Some skills are fine to share, others contain your clients, hosts
  or notes. Copy-paste does not know the difference.
- **A new laptop or a new teammate starts from zero.** The skills live only in the projects they were
  copied into.
- **Every new project starts from scratch.** Orchestrator, QA and devops agents, decision records —
  set up again each time.

## What you get

- **One source, many projects.** Skills live in packs (this package, your team kit, your private kit).
  Projects say which packs they want; `sync` generates the files. Improve a skill once — every project
  picks it up on the next `sync`.
- **All three tools at once.** One skill or agent becomes `.claude/`, `.cursor/` and `.codex/` / `.agents/`
  files automatically.
- **Public and private layers.** Private kits stay out of git in every project that uses them; public
  ones can be shared and improved by anyone.
- **Pick what each project needs.** `list` shows everything available; `enable` / `disable` switch packs
  or single skills.
- **Edit anywhere.** Fixed a skill inside a project, or an agent created a new one in `.claude/skills/`?
  `adopt` moves it back to the source, and from there to every tool and project.
- **Safe by design.** The engine only touches files it generated (they carry a marker) and refuses to
  overwrite anything else. `check` in CI catches stale files and private files that slipped into git.
- **A ready project template.** `create-multi-agent-project` starts a monorepo with an orchestrator,
  zone subagents, QA, devops and an ADR / RFC process.

## Two commands, two jobs

This repository publishes **two npm packages**. They are easy to confuse:

| | `npx create-multi-agent-project my-app` | `npx multi-agent-kit <command>` |
|---|---|---|
| What it is | a one-time project generator (like `create-react-app`) | the tool itself |
| When | once, when a project is born | every day, inside an existing project |
| What it does | creates the `my-app` folder from the template, adds `multi-agent-kit` to `devDependencies`, installs it, generates agent files | `sync`, `check`, `list`, `enable`, `adopt`, `delete`, … |
| Afterwards | not needed any more | stays in the project as a dev dependency |

The generator is a thin wrapper: `npx create-multi-agent-project my-app` does the same as
`npx -y multi-agent-kit create my-app --install`. `npm create multi-agent-project my-app` is another
spelling of the same thing.

### Where npx gets the code, and which version

`npx <package>` looks for the package in this order and runs the first match:

1. the current project's `node_modules` (a dev dependency);
2. a global install (`npm i -g`);
3. npx's own cache (`~/.npm/_npx/`) from earlier runs;
4. the npm registry: it downloads the package into the cache, asking "Ok to proceed?" first.

What this means in practice:

| You write | You get |
|-----------|---------|
| `npx multi-agent-kit sync` in a project with the dev dependency | the version pinned in that project's `package.json` — the same for the whole team |
| `npx -y multi-agent-kit sync` in a folder without `package.json` | whatever npx finds in its cache, or the latest from npm; `-y` skips the question |
| `npx -y multi-agent-kit@latest sync` | always the newest release |
| `npx -y multi-agent-kit@1 sync` | the newest 1.x: fresh fixes, no surprise major upgrade |
| `npx -y github:ershov-ilya/multi-agent-kit#v1.0.0 sync` | straight from GitHub at a tag, no npm involved |

Your local clone of this repository is **never** used by npx on its own. To work on the kit itself,
either run `node ~/code/multi-agent-kit/bin/multi-agent-kit.mjs <command>`, or `npm link` once in the
clone, or point the source at it in `multi-agent-kit.json`:
`{ "package": "multi-agent-kit", "path": "~/code/multi-agent-kit" }`.

## Getting started

**A new project** — monorepo with `workspace/`, `web/`, `engine/`, an orchestrator and decision records:

```bash
npx create-multi-agent-project@latest my-app
```

Then fill `workspace/agent-kit/context/project.md` and `vars` in `multi-agent-kit.json`.

**An existing Node.js project:**

```bash
npm i -D multi-agent-kit
npx multi-agent-kit init      # writes multi-agent-kit.json (reuses an old agent-kit/ folder if there is one)
npx multi-agent-kit sync      # generates .claude/ .cursor/ .codex/ .agents/
```

**A folder without `package.json`** (notes, an Obsidian vault, a non-JS project) — write
`multi-agent-kit.json` (or run `npx -y multi-agent-kit init`) and use `npx -y multi-agent-kit@1 sync`.
Set `"cli": "npx -y multi-agent-kit@1"` in the config so agents in that project run the same command.

**A project that already has hand-copied skills:** write the config, then

```bash
npx multi-agent-kit sync --take-over
```

Copies identical to their source become managed; the rest are listed so you can decide for each.

**A teammate clones the project, or you get a new laptop:**

```bash
npm install
npx multi-agent-kit sync --update   # also pulls team and private kits from git
```

Projects created from the template have npm scripts for this: `npm run agents:sync`,
`agents:update`, `agents:check`.

## Everyday examples

```bash
npx multi-agent-kit sync               # regenerate files from the sources you already have
npx multi-agent-kit sync --update      # first pull fresh versions of git kits (team, private), then regenerate
npx multi-agent-kit check              # change nothing, fail if files are stale — for CI and pre-commit
```

`sync` uses what is on disk and in the git cache; `sync --update` fetches git sources first. `check`
never writes anything.

```bash
npx multi-agent-kit list --long        # everything available: [x] enabled packs, on / ex / ovr per item
npx multi-agent-kit enable growth      # turn on a whole pack
npx multi-agent-kit enable seogeo      # turn on one skill, the rest of its pack stays off
npx multi-agent-kit disable octalysis  # turn one skill off
```

`enable` / `disable` edit `packs`, `include` and `exclude` in `multi-agent-kit.json` and run `sync`.

```bash
npx multi-agent-kit adopt .claude/skills/nudge/SKILL.md    # you edited a generated file: move the edit to its source
npx multi-agent-kit adopt --new                            # a skill was created by hand in .claude/skills/: move it to the local layer
npx multi-agent-kit adopt --new --to acme-kit:team         # … or into a team kit, so other projects get it too
```

`adopt <file>` is for **changes** to existing items; `adopt --new` is for **new** items that no source
has yet. Set `"autoAdopt": "local"` in the config to adopt new items on every `sync`.

```bash
npx multi-agent-kit delete old-skill        # preview: what would be removed and where
npx multi-agent-kit delete old-skill --yes  # remove from writable sources, generated files and hand-made copies
```

Deleting from a shared kit affects every project that uses it; read-only sources (the npm package, git
caches) get an `exclude` in this project instead.

## Cheat sheet

| I want to… | Run |
|------------|-----|
| start a new project | `npx create-multi-agent-project@latest my-app` |
| add the kit to an existing project | `npm i -D multi-agent-kit && npx multi-agent-kit init` |
| regenerate agent files | `npx multi-agent-kit sync` (`npm run agents:sync`) |
| get fresh team / private kits | `npx multi-agent-kit sync --update` (`npm run agents:update`) |
| check in CI | `npx multi-agent-kit check` (`npm run agents:check`) |
| take over hand-copied skills | `npx multi-agent-kit sync --take-over` |
| see what is available | `npx multi-agent-kit list --long` |
| turn a pack or skill on / off | `npx multi-agent-kit enable <name>` / `disable <name>` |
| keep an edit made in a generated file | `npx multi-agent-kit adopt <file>` |
| publish a skill created by hand | `npx multi-agent-kit adopt --new [--to source:pack]` |
| remove a skill everywhere | `npx multi-agent-kit delete <name>` → `--yes` |
| start a team or private kit | `npx multi-agent-kit new-kit acme-team-kit` |
| check packs before publishing | `npx multi-agent-kit lint packs --deny lint-deny.txt` |
| record a decision | `npx multi-agent-kit decisions create ADR platform topic` |
| use the newest kit once | `npx -y multi-agent-kit@latest <command>` |

## How it works

```
multi-agent-kit.json ──► sources ──► packs ──► local layer ──► .claude/ .cursor/ .codex/ .agents/ .mcp.json AGENTS.md
                         (package,    (core,    (your own
                          git, path)   product…) agents, rules)
```

- **Sources** are places with `packs/`: this npm package, a git repository, or a local folder.
- **Packs** are folders with `skills/`, `agents/`, `commands/`, `rules/`, `context/`, `mcp/`.
- **Local layer** is the project's own folder in the same format. It wins over packs.
- Later layers override earlier ones by item name (`skills/nudge`, `agents/qa`, …).
- Generated files carry a `Generated by multi-agent-kit. Source: …` marker. The engine only
  touches files with that marker and refuses to overwrite anything else.
- Nothing is on by default except the `core` pack: a project gets exactly the packs it lists.

### Config

```json
{
  "name": "my-app",
  "targets": ["claude", "cursor", "codex"],
  "sources": [
    "multi-agent-kit",
    { "git": "git@github.com:me/my-private-kit.git", "ref": "main", "path": "~/code/my-private-kit", "private": true, "optional": true }
  ],
  "packs": ["core", "decisions", "product", "safety", "personal"],
  "include": ["growth/skills/seogeo"],
  "exclude": ["octalysis"],
  "local": "workspace/agent-kit",
  "vars": { "prod_host": "app-1", "domain": "example.com" },
  "decisions": { "directory": "workspace/docs/decisions", "scopes": ["platform", "web", "engine"] }
}
```

| Key | Meaning |
|-----|---------|
| `targets` | which tools to generate for: `claude`, `cursor`, `codex` |
| `sources` | `"package-name"`, `{ "package" }`, `{ "git", "ref" }` or `{ "path" }`; `path` wins when it exists |
| `packs` | packs to enable; write `source-id:pack` when two sources have the same pack name |
| `include` / `exclude` | single items from other packs / items to drop |
| `local` | the project's own layer |
| `vars` | values for `{{vars.name}}` in pack files (defaults come from `pack.json`) |
| `decisions` | enables the RFC / ADR / OPS workflow and `multi-agent-kit decisions` |
| `cli` | how agents in this project should call the tool (default `npx multi-agent-kit`) |
| `commitPrivate` | commit files from private sources too (default: keep them out of git) |
| `autoAdopt` | `"local"` or `"source:pack"`: move items added by hand into that layer on every `sync` |

### Public and private layers

Mark a source `"private": true` (or put `"private": true` into its `multi-agent-kit.source.json`).
Files generated from it are listed in `.git/info/exclude`, never in committed manifests, and
`multi-agent-kit check` fails if one of them is tracked. A private item may not share a name with a
public one, so the same path is never public in one checkout and private in another. Teammates without
access to a source marked `"optional": true` get a warning instead of an error.

### Your own kits

Team process, internal services and personal notes live in kits: separate (usually private)
repositories with the same format. Start one with `npx multi-agent-kit new-kit acme-team-kit` and
follow [docs/private-and-team-kits.md](docs/private-and-team-kits.md).

## All commands

| Command | What it does |
|---------|--------------|
| `sync [--update] [--take-over]` | generate files; `--update` refreshes git sources first; reports items added by hand |
| `check` | CI mode: changes nothing, fails when generated files are stale or private files are tracked |
| `list [--long] [--enabled] [--json]` | catalog of every source (public, team, private): packs, items and their state here |
| `enable <pack\|item>` / `disable <pack\|item>` | turn a pack or one skill/agent/rule on or off, then sync |
| `adopt <file>…` | copy hand edits of generated files back to the source |
| `adopt --new [--to local\|source:pack] [--from .claude]` | move skills/agents/rules added by hand into a layer and generate them for every tool |
| `delete <item> [--yes]` | remove an item from writable sources, outputs and hand-made copies (preview without `--yes`) |
| `lint [dir] [--deny file]` | validate packs: metadata, links, secrets, denied words |
| `decisions create TYPE scope topic` / `decisions index` | numbered RFC / ADR / OPS documents |
| `init` | create `multi-agent-kit.json` (reuses a legacy `agent-kit/` folder) |
| `create <dir> [--name] [--install] [--no-git]` | start a project from the template (what `create-multi-agent-project` calls) |
| `new-kit <dir> [--public]` | start a private or team source of packs |

Commands that work on a project accept `--root <dir>` to run against another folder.

## Packs in this package

| Pack | Contents |
|------|----------|
| `core` | agent-kit workflow, `/do`, `/refresh-context`, `/summary`, `search` agent |
| `decisions` | RFC / ADR / OPS process, `/adr`, `decision-review` agent |
| `thinking` | `exothinking` — thinking partner for open-ended problems |
| `product` | `jobs-to-be-done`, `octalysis`, `nudge`, `user-best-practices-and-habits`, `presentation`, `state-transitions` |
| `growth` | `seogeo`, `internet-marketing`, `micro-markup` (Open Graph, JSON-LD) |
| `safety` | `secure-by-design`, `legal` (Russian and international law for digital products) |

## Contributing

New skills and fixes are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) and the
[pack format](docs/pack-format.md).

## License

[MIT](LICENSE)
