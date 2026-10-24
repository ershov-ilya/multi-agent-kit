# {{kit.id}}

A source of packs for [multi-agent-kit](https://github.com/ershov-ilya/multi-agent-kit): skills, agents,
rules and commands that do not belong in the public package — personal or team ones.

## Layout

```
multi-agent-kit.source.json   source id and the private flag
packs/
  team/                       example pack: rename it or add your own
    pack.json                 description and defaults for {{vars.*}}
    skills/team-conventions/  example skill
    rules/no-secrets.mdc      example rule
lint-deny.txt                 words that must not appear (before moving a skill to the public package)
.github/workflows/lint.yml    pack checks in CI
```

Pack format: [docs/pack-format.md](https://github.com/ershov-ilya/multi-agent-kit/blob/main/docs/pack-format.md).
Setup guide: [docs/private-and-team-kits.md](https://github.com/ershov-ilya/multi-agent-kit/blob/main/docs/private-and-team-kits.md).

## Use it in a project

In the project's `multi-agent-kit.json`:

```json
{
  "sources": [
    "multi-agent-kit",
    {
      "git": "git@github.com:<org>/{{kit.id}}.git",
      "ref": "main",
      "path": "~/code/{{kit.id}}",
      "optional": true
    }
  ],
  "packs": ["core", "product", "{{kit.id}}:team"]
}
```

- `git` — where to clone from; cached in `~/.cache/multi-agent-kit`, refreshed by `npx multi-agent-kit sync --update`.
- `path` — the maintainer's working copy: edits show up at once and `adopt` writes here. Machines
  without it fall back to `git`.
- `optional` — people without access to the repository get a warning instead of an error.
- `private` comes from `multi-agent-kit.source.json`: files from a private source are never committed to projects.

Project-specific values for `{{vars.*}}` (hosts, URLs, paths) go into the project's `vars`, not into
the packs. Secrets go nowhere near either.

## Day to day

```bash
npx multi-agent-kit lint .                            # check the packs
cd <project> && npx multi-agent-kit sync              # regenerate agent files in a project
npx multi-agent-kit adopt .claude/skills/x/SKILL.md   # move an edit made in a project back here
```

A skill turned out useful for everyone? Send it to the public multi-agent-kit as a pull request after
`npx multi-agent-kit lint packs --deny lint-deny.txt`.
