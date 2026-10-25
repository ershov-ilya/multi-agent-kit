import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG_FILE, loadConfig } from "./config.mjs";
import { exists, filesRecursively, isDirectory, subdirectories, toPosix } from "./util.mjs";

// pack.json may hold defaults for {{vars.*}}: the project's multi-agent-kit.json overrides them.
export async function packMeta(directory) {
  const file = path.join(directory, "pack.json");
  if (!await exists(file)) return { vars: {} };
  const meta = JSON.parse(await readFile(file, "utf8"));
  return { ...meta, vars: meta.vars || {} };
}

export const KINDS = ["skills", "agents", "commands", "rules", "context", "mcp"];

// Lists the items of one layer: a pack directory or the project's local directory.
export async function layerItems(layerRoot, origin) {
  const items = [];
  const add = (kind, name, files) => items.push({ id: `${kind}/${name}`, kind, name, files, origin });
  const relative = (kind, file) => toPosix(path.relative(path.join(layerRoot, kind), file));

  for (const name of await subdirectories(path.join(layerRoot, "skills"))) {
    const files = await filesRecursively(path.join(layerRoot, "skills", name));
    add("skills", name, files.map((file) => ({ absolute: file, relative: relative("skills", file) })));
  }
  for (const kind of ["agents", "commands"]) {
    const directory = path.join(layerRoot, kind);
    if (!await isDirectory(directory)) continue;
    for (const file of await filesRecursively(directory)) {
      const extension = path.extname(file);
      if (kind === "agents" ? ![".md", ".mdc"].includes(extension) : extension !== ".md") continue;
      add(kind, path.basename(file, extension), [{ absolute: file, relative: relative(kind, file) }]);
    }
  }
  for (const kind of ["rules", "context"]) {
    const directory = path.join(layerRoot, kind);
    if (!await isDirectory(directory)) continue;
    for (const file of await filesRecursively(directory)) {
      const name = relative(kind, file).replace(/\.(md|mdc)$/, "");
      add(kind, name, [{ absolute: file, relative: relative(kind, file) }]);
    }
  }
  const mcpDirectory = path.join(layerRoot, "mcp");
  if (await isDirectory(mcpDirectory)) {
    for (const file of await filesRecursively(mcpDirectory)) {
      if (path.extname(file) !== ".json") continue;
      add("mcp", relative("mcp", file).replace(/\.json$/, ""), [{ absolute: file, relative: relative("mcp", file) }]);
    }
  }
  return items;
}

export async function indexPacks(sources) {
  const packs = [];
  for (const [order, source] of sources.entries()) {
    for (const name of await subdirectories(path.join(source.directory, "packs"))) {
      packs.push({ source, order, name, directory: path.join(source.directory, "packs", name) });
    }
  }
  return packs;
}

export function findPack(packs, reference) {
  const [sourceId, name] = reference.includes(":") ? reference.split(":") : [null, reference];
  const matches = packs.filter((pack) => pack.name === name && (!sourceId || pack.source.id === sourceId));
  if (!matches.length) {
    const known = packs.map((pack) => `${pack.source.id}:${pack.name}`).join(", ") || "none";
    throw new Error(`Unknown pack "${reference}". Available: ${known}`);
  }
  if (matches.length > 1) {
    throw new Error(`Pack "${reference}" exists in several sources; write ${matches.map((pack) => `${pack.source.id}:${pack.name}`).join(" or ")}`);
  }
  return matches[0];
}

export const excluded = (item, patterns) => patterns.some((pattern) => pattern === item.id || pattern === item.name);

export async function subprojectLayers(root, config, warn = console.warn) {
  const layers = [];
  for (const subproject of config.subprojects) {
    const subRoot = path.join(root, subproject.path);
    if (!await exists(path.join(subRoot, CONFIG_FILE))) {
      if (subproject.optional) {
        warn(`multi-agent-kit: skipped optional subproject ${subproject.path}: no ${CONFIG_FILE}`);
        continue;
      }
      throw new Error(`Subproject ${subproject.path} has no ${CONFIG_FILE}`);
    }
    const subConfig = await loadConfig(subRoot);
    if (!subConfig.local) throw new Error(`Subproject ${subproject.path} has no "local" layer in its ${CONFIG_FILE}`);
    const directory = path.join(subRoot, subConfig.local);
    const label = `sub:${toPosix(path.join(subproject.path, subConfig.local))}`;
    layers.push({
      path: subproject.path,
      root: subRoot,
      directory,
      vars: subConfig.vars,
      origin: { source: "sub", pack: null, private: false, root: directory, label, writable: true, scope: subproject.scope === false ? null : subproject.path },
    });
  }
  return layers;
}

// Later layers win: packs follow source order, then config order; single includes, subprojects and
// the local layer come last.
export async function collect(root, config, sources, { warn = console.warn } = {}) {
  const packs = await indexPacks(sources);
  const selected = config.packs.map((reference, position) => ({ pack: findPack(packs, reference), position }));
  selected.sort((left, right) => left.pack.order - right.pack.order || left.position - right.position);

  const items = new Map();
  const shadows = [];
  const put = (item) => {
    const previous = items.get(item.id);
    if (previous) {
      // A shared name would make the same path public in one checkout and private in another.
      if (item.origin.private !== previous.origin.private) {
        const [privateItem, publicItem] = item.origin.private ? [item, previous] : [previous, item];
        throw new Error(`Private item ${item.id} from ${privateItem.origin.label} collides with a public one from ${publicItem.origin.label}; rename it`);
      }
      shadows.push({ id: item.id, from: previous.origin.label, by: item.origin.label });
    }
    items.set(item.id, item);
  };
  const defaults = {};
  for (const { pack } of selected) {
    Object.assign(defaults, (await packMeta(pack.directory)).vars);
    for (const item of await layerItems(pack.directory, packOrigin(pack))) {
      if (!excluded(item, config.exclude)) put(item);
    }
  }
  for (const reference of config.include) {
    const match = reference.match(/^(.+?)\/(skills|agents|commands|rules|context|mcp)\/(.+)$/);
    if (!match) throw new Error(`Include must look like pack/kind/name: ${reference}`);
    const pack = findPack(packs, match[1]);
    const item = (await layerItems(pack.directory, packOrigin(pack))).find((candidate) => candidate.id === `${match[2]}/${match[3]}`);
    if (!item) throw new Error(`Include not found: ${reference}`);
    Object.assign(defaults, (await packMeta(pack.directory)).vars);
    put(item);
  }
  // Subprojects of a monorepo lend their local layer to the root, so tools started at the root see
  // every agent, skill, command and rule. Context stays with the subproject that owns it.
  for (const layer of await subprojectLayers(root, config, warn)) {
    Object.assign(defaults, layer.vars);
    for (const item of await layerItems(layer.directory, layer.origin)) {
      if (item.kind === "context") continue;
      const previous = items.get(item.id);
      if (previous?.origin.source === "sub") {
        throw new Error(`${item.id} is defined in both ${previous.origin.label} and ${item.origin.label}; rename one of them`);
      }
      put(item);
    }
  }
  if (config.local) {
    const localRoot = path.join(root, config.local);
    if (!await isDirectory(localRoot)) throw new Error(`Local layer not found: ${config.local}`);
    for (const item of await layerItems(localRoot, localOrigin(root, config))) put(item);
  }
  return { items, shadows, defaults };
}

export const packOrigin = (pack) => ({
  source: pack.source.id,
  pack: pack.name,
  private: pack.source.private,
  root: pack.directory,
  label: `${pack.source.id}:${pack.name}`,
  writable: pack.source.mode === "path",
});

export function localOrigin(root, config) {
  return { source: "local", pack: null, private: false, root: path.join(root, config.local), label: `local:${config.local}`, writable: true };
}

export function fileLabel(item, file) {
  return `${item.origin.label}/${item.kind}/${file.relative}`;
}
