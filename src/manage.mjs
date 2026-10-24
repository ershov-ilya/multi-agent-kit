import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { catalog, matchEntries } from "./catalog.mjs";
import { findPack, indexPacks, packOrigin } from "./collect.mjs";
import { CONFIG_FILE, loadConfig } from "./config.mjs";
import { discover } from "./discover.mjs";
import { resolveSources } from "./sources.mjs";
import { plan, sync } from "./sync.mjs";
import { exists, parseFrontmatter } from "./util.mjs";

// JSON with short arrays and flat objects on one line, the way people write multi-agent-kit.json by hand.
function format(value, indent = "") {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    const flat = value.every((element) => element === null || typeof element !== "object");
    const inline = `[${value.map((element) => JSON.stringify(element)).join(", ")}]`;
    if (flat && indent.length + inline.length < 100) return inline;
    return `[\n${value.map((element) => `${inner}${format(element, inner)}`).join(",\n")}\n${indent}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return "{}";
    const flat = entries.every(([, element]) => element === null || typeof element !== "object");
    const inline = `{ ${entries.map(([key, element]) => `${JSON.stringify(key)}: ${JSON.stringify(element)}`).join(", ")} }`;
    if (indent && flat && indent.length + inline.length < 110) return inline;
    return `{\n${entries.map(([key, element]) => `${inner}${JSON.stringify(key)}: ${format(element, inner)}`).join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

async function editConfig(root, edit) {
  const file = path.join(root, CONFIG_FILE);
  const raw = JSON.parse(await readFile(file, "utf8"));
  for (const key of ["packs", "include", "exclude"]) raw[key] ??= key === "packs" ? ["core"] : [];
  edit(raw);
  for (const key of ["include", "exclude"]) if (!raw[key].length) delete raw[key];
  await writeFile(file, `${format(raw)}\n`, "utf8");
}

async function packsOf(root) {
  const config = await loadConfig(root);
  const sources = await resolveSources(root, config);
  return { config, packs: await indexPacks(sources) };
}

function tryPack(packs, reference) {
  try {
    return findPack(packs, reference);
  } catch (error) {
    if (/exists in several sources/.test(error.message)) throw error;
    return null;
  }
}

const packLabel = (pack) => `${pack.source.id}:${pack.name}`;
const sameLabel = (packs) => (reference) => {
  const pack = tryPack(packs, reference);
  return pack ? packLabel(pack) : reference;
};

function single(entries, reference, verb) {
  const candidates = entries.filter((entry) => entry.source !== "local");
  if (!candidates.length) throw new Error(`Nothing called "${reference}" in the configured sources; see "multi-agent-kit list"`);
  const layers = [...new Set(candidates.map((entry) => entry.layer))];
  if (layers.length > 1) {
    throw new Error(`"${reference}" exists in several packs; ${verb} one of: ${candidates.map((entry) => `${entry.layer}/${entry.id}`).join(", ")}`);
  }
  return candidates[0];
}

// Turns a pack or a single item on in multi-agent-kit.json, then syncs.
export async function enable(root, reference) {
  const { config, packs } = await packsOf(root);
  const pack = !reference.includes("/") && tryPack(packs, reference);
  if (pack) {
    const labels = config.packs.map(sameLabel(packs));
    if (labels.includes(packLabel(pack))) return { message: `pack ${packLabel(pack)} is already enabled` };
    await editConfig(root, (raw) => raw.packs.push(reference));
    await sync(root);
    return { message: `enabled pack ${packLabel(pack)}` };
  }
  const { entries } = await catalog(root);
  const entry = single(matchEntries(entries, reference), reference, "enable");
  if (entry.status === "on") return { message: `${entry.layer}/${entry.id} is already on` };
  const packEnabled = config.packs.map(sameLabel(packs)).includes(entry.layer);
  await editConfig(root, (raw) => {
    raw.exclude = raw.exclude.filter((pattern) => pattern !== entry.id && pattern !== entry.name);
    if (!packEnabled) raw.include.push(`${entry.layer}/${entry.id}`);
  });
  await sync(root);
  return { message: `enabled ${entry.layer}/${entry.id}` };
}

// Turns a pack or a single item off in multi-agent-kit.json, then syncs.
export async function disable(root, reference) {
  const { config, packs } = await packsOf(root);
  const pack = !reference.includes("/") && tryPack(packs, reference);
  if (pack) {
    const label = packLabel(pack);
    if (!config.packs.map(sameLabel(packs)).includes(label)) return { message: `pack ${label} is not enabled` };
    await editConfig(root, (raw) => {
      raw.packs = raw.packs.filter((candidate) => sameLabel(packs)(candidate) !== label);
    });
    await sync(root);
    return { message: `disabled pack ${label}` };
  }
  const { entries } = await catalog(root);
  const matches = matchEntries(entries, reference);
  if (matches.some((entry) => entry.source === "local" && entry.status === "on")) {
    throw new Error(`"${reference}" lives in the local layer; remove it with "multi-agent-kit delete ${reference}"`);
  }
  const entry = single(matches.filter((candidate) => candidate.status === "on"), reference, "disable");
  await editConfig(root, (raw) => {
    const before = raw.include.length;
    raw.include = raw.include.filter((candidate) => {
      const match = candidate.match(/^(.+?)\/((?:skills|agents|commands|rules|context|mcp)\/.+)$/);
      return !(match && match[2] === entry.id && sameLabel(packs)(match[1]) === entry.layer);
    });
    if (raw.include.length === before && !raw.exclude.includes(entry.id)) raw.exclude.push(entry.id);
  });
  await sync(root);
  return { message: `disabled ${entry.layer}/${entry.id}` };
}

async function resolveLayer(root, config, target) {
  if (!target || target === "local") {
    if (!config.local) throw new Error('No local layer: set "local" in multi-agent-kit.json or pass --to <source:pack>');
    return { label: `local:${config.local}`, directory: path.join(root, config.local), local: true };
  }
  const sources = await resolveSources(root, config);
  const pack = findPack(await indexPacks(sources), target);
  if (pack.source.mode !== "path") {
    throw new Error(`${packLabel(pack)} comes from an installed package or git cache; add "path" to that source to write into it`);
  }
  return { label: packLabel(pack), directory: pack.directory, local: false, origin: packOrigin(pack) };
}

function destination(layerDirectory, item, file) {
  if (item.kind === "skills") return path.join(layerDirectory, "skills", item.name, file.relative);
  if (item.kind === "rules") return path.join(layerDirectory, "rules", `${item.name}.mdc`);
  return path.join(layerDirectory, item.kind, `${item.name}.md`);
}

// Moves skills, agents, commands and rules that were added straight into platform folders into a layer,
// then syncs so every tool gets them.
export async function adoptNew(root, { to, from, names = [] } = {}) {
  const config = await loadConfig(root);
  const { outputs } = await plan(root);
  const discovered = (await discover(root, outputs, config.targets))
    .filter((item) => !names.length || names.includes(item.name) || names.includes(item.id));
  if (!discovered.length) return { adopted: [], skipped: [], layer: null };
  const layer = await resolveLayer(root, config, to || config.autoAdopt);
  const packs = layer.local ? null : (await packsOf(root)).packs;
  const enabledHere = layer.local || config.packs.map(sameLabel(packs)).includes(layer.label);

  const adopted = [];
  const skipped = [];
  for (const item of discovered) {
    const copy = from ? item.copies.find((candidate) => candidate.location.startsWith(from)) : item.identical ? item.copies[0] : null;
    if (!copy) {
      skipped.push({ id: item.id, reason: from ? `no copy in ${from}` : `copies differ in ${item.copies.map((candidate) => candidate.location).join(" and ")}; pick one with --from <folder>` });
      continue;
    }
    if (item.kind === "agents") {
      const { attributes } = parseFrontmatter(copy.contents[copy.files[0].relative]);
      if (!attributes.name || !attributes.description) {
        skipped.push({ id: item.id, reason: "agent needs name and description in its frontmatter" });
        continue;
      }
    }
    const targets = copy.files.map((file) => ({ file, target: destination(layer.directory, item, file) }));
    if ((await Promise.all(targets.map(({ target }) => exists(target)))).some(Boolean)) {
      skipped.push({ id: item.id, reason: `${layer.label} already has ${item.id}` });
      continue;
    }
    for (const { file, target } of targets) {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, copy.contents[file.relative], "utf8");
    }
    for (const other of item.copies) {
      if (item.kind === "skills") await rm(path.join(root, other.location, item.name), { recursive: true, force: true });
      else for (const file of other.files) await rm(file.absolute, { force: true });
    }
    adopted.push({ id: item.id, from: copy.location, to: layer.label });
  }

  if (adopted.length && !enabledHere) {
    await editConfig(root, (raw) => {
      for (const item of adopted) raw.include.push(`${layer.label}/${item.id}`);
    });
  }
  if (adopted.length) await sync(root);
  return { adopted, skipped, layer: layer.label };
}

// Removes an item from every writable source, from this project's outputs and from hand-made copies.
export async function remove(root, reference, { yes = false } = {}) {
  const { config, entries } = await catalog(root);
  const { outputs } = await plan(root);
  const matches = matchEntries(entries, reference);
  const ids = new Set(matches.map((entry) => entry.id));
  const unmanaged = (await discover(root, outputs, config.targets))
    .filter((item) => ids.has(item.id) || item.name === reference || item.id === reference);
  if (!matches.length && !unmanaged.length) throw new Error(`Nothing called "${reference}"; see "multi-agent-kit list"`);
  if (new Set([...matches.map((entry) => entry.id), ...unmanaged.map((item) => item.id)]).size > 1) {
    throw new Error(`"${reference}" matches several kinds; write one of: ${[...new Set(matches.map((entry) => entry.id))].join(", ")}`);
  }

  const actions = [];
  const readOnly = [];
  for (const entry of matches) {
    if (entry.writable) {
      const target = entry.kind === "skills" ? path.join(entry.root, "skills", entry.name) : entry.files[0].absolute;
      actions.push({ type: "delete-source", label: `${entry.layer}/${entry.id}`, target, shared: entry.source !== "local" });
    } else {
      readOnly.push(entry);
    }
  }
  for (const item of unmanaged) {
    for (const copy of item.copies) {
      const target = item.kind === "skills" ? path.join(root, copy.location, item.name) : copy.files[0].absolute;
      actions.push({ type: "delete-copy", label: `${copy.location}/${item.name}`, target, shared: false });
    }
  }
  const id = matches[0]?.id || unmanaged[0].id;
  const exclude = readOnly.some((entry) => entry.status === "on" || entry.status === "overridden");
  if (exclude) actions.push({ type: "exclude", label: `exclude ${id} in ${CONFIG_FILE} (kept in ${readOnly.map((entry) => entry.layer).join(", ")}: read-only)` });

  if (!yes) return { dryRun: true, actions };
  for (const action of actions) {
    if (action.target) await rm(action.target, { recursive: true, force: true });
  }
  await editConfig(root, (raw) => {
    raw.include = raw.include.filter((candidate) => !candidate.endsWith(`/${id}`));
    if (exclude && !raw.exclude.includes(id)) raw.exclude.push(id);
  });
  await sync(root);
  return { dryRun: false, actions };
}
