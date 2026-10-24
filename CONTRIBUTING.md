# Contributing

Thanks for improving multi-agent-kit. Most contributions are skills: knowledge bases and workflows
that make agents better at product, engineering and thinking work.

## Adding or changing a skill

1. Pick the pack that fits (`product`, `growth`, `safety`, `thinking`, …) or propose a new one in
   an issue first.
2. Follow the [pack format](docs/pack-format.md): `packs/<pack>/skills/<name>/SKILL.md`, folder name
   equals `name`, description under 1024 characters that says **when** to use the skill.
3. Keep `SKILL.md` short: the algorithm and the map. Move details to `references/`.
4. Write in your own words. Summarise books, talks and courses; do not paste them. Cite sources. Do
   not publish someone else's methodology without the author's permission.
5. No personal data, client names, internal hostnames, IPs or secrets. Use `{{vars.*}}` with neutral
   defaults in `pack.json` for anything environment-specific.
6. Run the checks:

   ```bash
   npm test
   npm run lint
   ```

7. In the pull request, list three or four requests that should trigger the skill and one that
   should not.

## Changing the engine

The engine has no runtime dependencies and targets Node.js 20+. Add a test in `test/` for every
behaviour change. Generated output must stay deterministic: running `sync` twice gives no diff.

## Releases

Maintainers bump `version` in `package.json` (and `create-multi-agent-project/package.json` when the
template changes), tag `vX.Y.Z` and publish both packages to npm.
