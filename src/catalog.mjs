import { readFile } from "node:fs/promises";
import path from "node:path";
import { collect, excluded, findPack, indexPacks, layerItems, localOrigin, packMeta, packOrigin } from "./collect.mjs";
import { loadConfig } from "./config.mjs";
import { resolveSources } from "./sources.mjs";
import { isDirectory, parseFrontmatter } from "./util.mjs";

async function describeItem(item) {
  const file = item.kind === "skills" ? item.files.find((candidate) => candidate.relative === `${item.name}/SKILL.md`) : item.files[0];
  if (!file || !/\.mdc?$/.test(file.absolute)) return "";
  return parseFrontmatter(await readFile(file.absolute, "utf8")).attributes.description || "";
}

// Everything the configured sources offer, with the state of each pack and item in this project.
export async function catalog(root, options = {}) {
  const config = await loadConfig(root);
  const sources = await resolveSources(root, config, options);
  const { items } = await collect(root, config, sources);
  const packs = await indexPacks(sources);
  const enabled = new Set(config.packs.map((reference) => {
    const pack = findPack(packs, reference);
    return `${pack.source.id}:${pack.name}`;
  }));
  const included = new Set(config.include.map((reference) => {
    const match = reference.match(/^(.+?)\/(skills|agents|commands|rules|context|mcp)\/(.+)$/);
    const pack = match && findPack(packs, match[1]);
    return pack ? `${pack.source.id}:${pack.name}/${match[2]}/${match[3]}` : reference;
  }));

  const entries = [];
  const add = async (item, packEnabled) => {
    const winner = items.get(item.id);
    let status;
    if (winner && winner.origin.label === item.origin.label) status = "on";
    else if (winner && (packEnabled || included.has(`${item.origin.label}/${item.id}`))) status = "overridden";
    else if (packEnabled && excluded(item, config.exclude)) status = "excluded";
    else status = "off";
    entries.push({
      id: item.id,
      kind: item.kind,
      name: item.name,
      layer: item.origin.label,
      source: item.origin.source,
      pack: item.origin.pack,
      private: item.origin.private,
      writable: item.origin.writable,
      root: item.origin.root,
      files: item.files,
      status,
      overriddenBy: status === "overridden" ? winner.origin.label : null,
      description: await describeItem(item),
    });
  };

  const packList = [];
  for (const pack of packs) {
    const label = `${pack.source.id}:${pack.name}`;
    const meta = await packMeta(pack.directory);
    packList.push({ label, source: pack.source.id, name: pack.name, enabled: enabled.has(label), private: pack.source.private, description: meta.description || "" });
    for (const item of await layerItems(pack.directory, packOrigin(pack))) await add(item, enabled.has(label));
  }
  if (config.local && await isDirectory(path.join(root, config.local))) {
    for (const item of await layerItems(path.join(root, config.local), localOrigin(root, config))) await add(item, true);
  }
  return { config, sources, packs: packList, entries };
}

// Finds catalog entries for a reference: "nudge", "skills/nudge", "pack/skills/nudge" or "source:pack/skills/nudge".
export function matchEntries(entries, reference) {
  const qualified = reference.match(/^(.+?)\/(skills|agents|commands|rules|context|mcp)\/(.+)$/);
  if (qualified) {
    const [, pack, kind, name] = qualified;
    return entries.filter((entry) => entry.id === `${kind}/${name}` && (entry.layer === pack || entry.pack === pack));
  }
  if (/^(skills|agents|commands|rules|context|mcp)\//.test(reference)) return entries.filter((entry) => entry.id === reference);
  const skills = entries.filter((entry) => entry.id === `skills/${reference}`);
  return skills.length ? skills : entries.filter((entry) => entry.name === reference);
}
