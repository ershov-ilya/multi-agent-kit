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

export async function create(target, { name, install = false, initGit = true } = {}) {
  const directory = path.resolve(target);
  if (await isDirectory(directory) && (await readdir(directory)).length) throw new Error(`Directory is not empty: ${directory}`);
  const projectName = name || path.basename(directory);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(projectName)) throw new Error(`Project name must be kebab-case: ${projectName}`);

  const templateRoot = path.join(packageRoot, "template");
  for (const file of await filesRecursively(templateRoot)) {
    const relative = renamed(toPosix(path.relative(templateRoot, file)), projectName);
    const destination = path.join(directory, relative);
    const content = (await readFile(file, "utf8"))
      .replaceAll("{{project.name}}", projectName)
      .replaceAll("{{kit.version}}", ownPackage.version);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
  if (!await exists(path.join(directory, CONFIG_FILE))) throw new Error(`Template has no ${CONFIG_FILE}`);

  if (initGit && git(directory, ["rev-parse", "--is-inside-work-tree"]).status !== 0) {
    git(directory, ["init", "-q", "-b", "main"]);
  }
  await decisions(directory, ["index"]);
  const result = await sync(directory);
  if (install) {
    const npm = spawnSync("npm", ["install"], { cwd: directory, stdio: "inherit" });
    if (npm.status !== 0) throw new Error("npm install failed");
  }
  return { directory, projectName, generated: result.outputs.size };
}
