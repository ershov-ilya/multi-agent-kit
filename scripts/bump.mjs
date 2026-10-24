#!/usr/bin/env node
// Bumps multi-agent-kit and create-multi-agent-project together, commits and tags vX.Y.Z.
// Usage: node scripts/bump.mjs major|minor|patch [--no-git]
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [level, ...flags] = process.argv.slice(2);
if (!["major", "minor", "patch"].includes(level) || flags.some((flag) => flag !== "--no-git")) {
  console.error("Usage: node scripts/bump.mjs major|minor|patch [--no-git]");
  process.exit(1);
}
const useGit = !flags.includes("--no-git");

const git = (...args) => {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.trim()}`);
  return result.stdout.trim();
};

if (useGit && git("status", "--porcelain")) {
  console.error("Working tree is not clean: commit or stash changes before a release");
  process.exit(1);
}

const files = {
  kit: path.join(root, "package.json"),
  create: path.join(root, "create-multi-agent-project", "package.json"),
};
const kit = JSON.parse(await readFile(files.kit, "utf8"));
const create = JSON.parse(await readFile(files.create, "utf8"));

const [major, minor, patch] = kit.version.split(".").map(Number);
const version = level === "major" ? `${major + 1}.0.0` : level === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

kit.version = version;
create.version = version;
create.dependencies["multi-agent-kit"] = `^${version}`;
await writeFile(files.kit, `${JSON.stringify(kit, null, 2)}\n`);
await writeFile(files.create, `${JSON.stringify(create, null, 2)}\n`);

if (useGit) {
  git("add", files.kit, files.create);
  git("commit", "-q", "-m", `release: v${version}`);
  git("tag", "-a", `v${version}`, "-m", `v${version}`);
}
console.log(`multi-agent-kit and create-multi-agent-project: ${major}.${minor}.${patch} -> ${version}${useGit ? ` (commit and tag v${version}; push with: git push --follow-tags)` : ""}`);
