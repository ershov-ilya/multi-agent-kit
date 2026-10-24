import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG_FILE } from "./config.mjs";
import { exists, isDirectory } from "./util.mjs";

// Writes multi-agent-kit.json for an existing project, reusing a legacy agent-kit folder as the local layer.
export async function init(root) {
  const file = path.join(root, CONFIG_FILE);
  if (await exists(file)) throw new Error(`${CONFIG_FILE} already exists`);
  const config = { name: path.basename(root), sources: ["multi-agent-kit"], packs: ["core"] };
  const packageFile = path.join(root, "package.json");
  if (await exists(packageFile)) {
    const name = JSON.parse(await readFile(packageFile, "utf8")).name;
    if (name) config.name = name.replace(/^@[^/]+\//, "");
  }
  for (const candidate of ["workspace/agent-kit", "agent-kit"]) {
    if (!await isDirectory(path.join(root, candidate))) continue;
    config.local = candidate;
    const legacy = path.join(root, candidate, "project.json");
    if (await exists(legacy)) {
      const project = JSON.parse(await readFile(legacy, "utf8"));
      if (project.name) config.name = project.name;
      if (project.decisionsDirectory && Array.isArray(project.scopes)) {
        config.packs.push("decisions");
        config.decisions = { directory: project.decisionsDirectory, scopes: project.scopes };
      }
    }
    break;
  }
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return config;
}
