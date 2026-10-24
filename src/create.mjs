import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CONFIG_FILE } from "./config.mjs";
import { decisions } from "./decisions.mjs";
import { ownPackage, packageRoot } from "./sources.mjs";
import { sync } from "./sync.mjs";
import { exists, filesRecursively, git, isDirectory, toPosix } from "./util.mjs";

// npm drops .gitignore files from published packages, so the template stores them as _gitignore.
// __project__ in a file name becomes the project name.
const renamed = (relative, projectName) => relative
  .split("/")
  .map((part) => (part === "_gitignore" ? ".gitignore" : part.replaceAll("__project__", projectName)))
  .join("/");

async function emptyTarget(target, name) {
  const directory = path.resolve(target);
  if (await isDirectory(directory) && (await readdir(directory)).length) throw new Error(`Directory is not empty: ${directory}`);
  const resolvedName = name || path.basename(directory);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(resolvedName)) throw new Error(`Name must be kebab-case: ${resolvedName}`);
  return { directory, resolvedName };
}

async function copyTemplate(templateName, directory, name, replacements) {
  const templateRoot = path.join(packageRoot, templateName);
  for (const file of await filesRecursively(templateRoot)) {
    const relative = renamed(toPosix(path.relative(templateRoot, file)), name);
    const destination = path.join(directory, relative);
    let content = await readFile(file, "utf8");
    for (const [placeholder, value] of Object.entries(replacements)) content = content.replaceAll(placeholder, value);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}

function initRepository(directory, initGit) {
  if (initGit && git(directory, ["rev-parse", "--is-inside-work-tree"]).status !== 0) {
    git(directory, ["init", "-q", "-b", "main"]);
  }
}

// Starts a private or team source: packs/ with an example skill, lint deny list and CI.
export async function createKit(target, { id, publicKit = false, initGit = true } = {}) {
  const { directory, resolvedName } = await emptyTarget(target, id);
  await copyTemplate("kit-template", directory, resolvedName, {
    "{{kit.id}}": resolvedName,
    "{{kit.private}}": String(!publicKit),
    "{{kit.version}}": ownPackage.version,
  });
  initRepository(directory, initGit);
  return { directory, id: resolvedName };
}

export async function create(target, { name, install = false, initGit = true } = {}) {
  const { directory, resolvedName: projectName } = await emptyTarget(target, name);
  await copyTemplate("template", directory, projectName, {
    "{{project.name}}": projectName,
    "{{kit.version}}": ownPackage.version,
  });
  if (!await exists(path.join(directory, CONFIG_FILE))) throw new Error(`Template has no ${CONFIG_FILE}`);

  initRepository(directory, initGit);
  await decisions(directory, ["index"]);
  const result = await sync(directory);
  if (install) {
    const npm = spawnSync("npm", ["install"], { cwd: directory, stdio: "inherit" });
    if (npm.status !== 0) throw new Error("npm install failed");
  }
  return { directory, projectName, generated: result.outputs.size };
}
