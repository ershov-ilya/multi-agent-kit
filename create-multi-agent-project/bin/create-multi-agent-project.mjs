#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { create } from "multi-agent-kit/create";

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
};
const option = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  args.splice(index, 2);
  return value;
};

if (flag("--help") || flag("-h") || !args.length) {
  console.log("Usage: npx create-multi-agent-project <dir> [--name <kebab-name>] [--no-install] [--no-git]");
  process.exit(args.length ? 0 : 1);
}

try {
  const name = option("--name");
  const install = !flag("--no-install");
  const initGit = !flag("--no-git");
  const result = await create(args[0], { name, install, initGit });
  const relative = path.relative(process.cwd(), result.directory) || ".";
  console.log(`\nCreated ${result.projectName} in ${relative} (${result.generated} agent files).`);
  console.log(`Next: cd ${relative}, fill workspace/agent-kit/context/project.md and "vars" in multi-agent-kit.json.`);
} catch (error) {
  console.error(`create-multi-agent-project: ${error.message}`);
  process.exitCode = 1;
}
