# Private and team kits

The public package covers what is useful to everyone. Most teams also need things that cannot be
public: their own process, internal services, client knowledge, personal notes. Keep them in a
**kit** — a separate repository with the same pack format — and connect it next to the public package.

```
project/multi-agent-kit.json
  sources:
    1. multi-agent-kit            public packs (npm)
    2. git@…/acme-team-kit        team packs (private repo, everyone in the team)
    3. ~/code/my-kit              personal packs (private repo, only you)
  local: workspace/agent-kit      this project's own agents and rules
```

Later sources win over earlier ones; the local layer wins over all of them.

## 1. Create the kit

```bash
npx multi-agent-kit new-kit acme-team-kit          # private by default
npx multi-agent-kit new-kit acme-open-kit --public # a public community kit
```

You get `multi-agent-kit.source.json` (`id`, `private`), an example `team` pack, a lint deny list and a
CI workflow. Rename the pack, replace the example skill with your own, push it to a private repository
on GitHub, GitLab or Bitbucket and give the team read access.

## 2. Connect it to a project

```json
{
  "sources": [
    "multi-agent-kit",
    { "git": "git@github.com:acme/acme-team-kit.git", "ref": "main", "path": "~/code/acme-team-kit", "optional": true }
  ],
  "packs": ["core", "decisions", "product", "acme-team-kit:team"],
  "vars": { "tracker_url": "https://acme.atlassian.net/jira" }
}
```

| Field | Why |
|-------|-----|
| `git` + `ref` | everyone clones the kit into `~/.cache/multi-agent-kit`; `sync --update` pulls the latest `ref` |
| `path` | maintainers keep a working copy; when it exists it wins, so edits are live and `adopt` writes there |
| `optional` | contractors, CI and open-source contributors without access get a warning, not a failure |
| `id:pack` | qualify a pack name when two sources have packs with the same name |

Pin `ref` to a tag (`v1.4.0`) when projects must not change under people's feet; track `main` when
they should always get the latest.

## 3. What "private" guarantees

When a source is private (`"private": true` in `multi-agent-kit.source.json` or in the project's
source entry):

- generated files from it are written to `.git/info/exclude`, so they never show up in `git status`;
- they are not listed in the committed `.agent-kit-manifest.json` files, so even their names stay out of git;
- `multi-agent-kit check` fails if one of them gets tracked anyway;
- a private item may not share a name with a public one: the same path would be committed in one
  checkout and hidden in another.

Set `"commitPrivate": true` in a project that is itself private and should carry the files in git
(for example, so cloud agents see them without access to the kit).

## 4. Keep infrastructure out of packs

Packs describe *how*; projects say *where*. Write hosts, IPs, domains and paths as `{{vars.name}}`
with neutral defaults in `pack.json`, and set the real values in each project's `vars`:

```json
// packs/ops/pack.json
{ "vars": { "prod_ssh": "root@<prod-host>", "nginx_vhosts": "/etc/nginx/sites-enabled" } }
```

Secrets never go into packs or `vars`: generated files are committed. Refer to environment variable
names instead.

## 5. Editing workflow

- Change a team skill in the kit repo, open a pull request there, merge, then `sync --update` in projects.
- Created a skill right in a project (`.claude/skills/<name>/`)? `npx multi-agent-kit adopt --new --to <kit-id>:<pack>`
  moves it into the kit and adds it to this project; commit it in the kit, other projects get it with
  `enable <name>` after `sync --update`.
- Changed it inside a project by accident? `npx multi-agent-kit adopt <generated file>` moves the edit
  into your working copy of the kit (needs `path`), then commit it in the kit.
- Promote a skill to the public package: run `npx multi-agent-kit lint packs --deny lint-deny.txt`
  in the kit, remove anything internal, and open a pull request to multi-agent-kit.

## 6. Onboarding a teammate

1. Give them read access to the kit repository and make sure `ssh -T git@github.com` works.
2. In the project: `npm install`, then `npm run agents:update` (or `npx multi-agent-kit sync --update`).
3. Maintainers who edit the kit also clone it to the `path` from the config.
