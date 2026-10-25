import { readFile } from "node:fs/promises";
import path from "node:path";
import { exists } from "./util.mjs";

export const CONFIG_FILE = "multi-agent-kit.json";
export const TARGETS = ["cursor", "claude", "codex"];
const KNOWN_KEYS = new Set([
  "$schema", "name", "targets", "sources", "packs", "include", "exclude",
  "local", "vars", "cli", "commitPrivate", "decisions", "autoAdopt", "subprojects",
]);

export async function loadConfig(root) {
  const file = path.join(root, CONFIG_FILE);
  if (!await exists(file)) {
    throw new Error(`${CONFIG_FILE} not found in ${root}. Run "multi-agent-kit init" to create it.`);
  }
  let raw;
  try {
    raw = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`${CONFIG_FILE}: invalid JSON (${error.message})`);
  }
  const unknown = Object.keys(raw).filter((key) => !KNOWN_KEYS.has(key));
  if (unknown.length) throw new Error(`${CONFIG_FILE}: unknown keys ${unknown.join(", ")}`);

  const config = {
    name: raw.name || path.basename(root),
    targets: raw.targets || [...TARGETS],
    sources: raw.sources || ["multi-agent-kit"],
    packs: raw.packs || ["core"],
    include: raw.include || [],
    exclude: raw.exclude || [],
    local: raw.local || null,
    vars: raw.vars || {},
    cli: raw.cli || "npx multi-agent-kit",
    commitPrivate: raw.commitPrivate === true,
    decisions: raw.decisions || null,
    autoAdopt: raw.autoAdopt || null,
    subprojects: (raw.subprojects || []).map((entry) => (typeof entry === "string" ? { path: entry } : entry)),
  };

  const badTargets = config.targets.filter((target) => !TARGETS.includes(target));
  if (badTargets.length) throw new Error(`${CONFIG_FILE}: unknown targets ${badTargets.join(", ")}; allowed: ${TARGETS.join(", ")}`);
  for (const key of ["sources", "packs", "include", "exclude"]) {
    if (!Array.isArray(config[key])) throw new Error(`${CONFIG_FILE}: "${key}" must be an array`);
  }
  if (config.local !== null && (typeof config.local !== "string" || path.isAbsolute(config.local) || config.local.split(/[\\/]/).includes(".."))) {
    throw new Error(`${CONFIG_FILE}: "local" must be a path inside the project`);
  }
  for (const subproject of config.subprojects) {
    if (!subproject || typeof subproject.path !== "string" || path.isAbsolute(subproject.path) || subproject.path.split(/[\\/]/).includes("..")) {
      throw new Error(`${CONFIG_FILE}: every "subprojects" entry needs a "path" inside the project`);
    }
  }
  if (config.decisions) {
    const { directory, scopes } = config.decisions;
    if (typeof directory !== "string" || !Array.isArray(scopes) || !scopes.length) {
      throw new Error(`${CONFIG_FILE}: "decisions" needs "directory" and a non-empty "scopes" array`);
    }
  }
  return config;
}

// Projects created before multi-agent-kit keep decisions settings in workspace/agent-kit/project.json.
export async function loadDecisionsConfig(root) {
  if (await exists(path.join(root, CONFIG_FILE))) {
    const config = await loadConfig(root);
    if (!config.decisions) throw new Error(`${CONFIG_FILE}: add a "decisions" section to use decisions`);
    return config.decisions;
  }
  const legacy = path.join(root, "workspace", "agent-kit", "project.json");
  if (await exists(legacy)) {
    const project = JSON.parse(await readFile(legacy, "utf8"));
    return { directory: project.decisionsDirectory, scopes: project.scopes };
  }
  throw new Error(`${CONFIG_FILE} not found in ${root}`);
}
