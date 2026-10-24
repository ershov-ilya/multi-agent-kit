#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { adopt } from "../src/adopt.mjs";
import { create, createKit } from "../src/create.mjs";
import { decisions } from "../src/decisions.mjs";
import { init } from "../src/init.mjs";
import { lint } from "../src/lint.mjs";
import { ownPackage } from "../src/sources.mjs";
import { plan, sync } from "../src/sync.mjs";

const HELP = `multi-agent-kit ${ownPackage.version}

Usage:
  multi-agent-kit sync [--check] [--update] [--take-over]
                                              generate agent files from multi-agent-kit.json;
                                              --take-over adopts hand-made copies equal to their source
  multi-agent-kit check                       same as sync --check
  multi-agent-kit list                        show sources, packs and items in use
  multi-agent-kit adopt <file>...             copy hand edits of generated files back to their source
  multi-agent-kit lint [dir] [--deny file]    validate packs (default: ./packs or the local layer)
  multi-agent-kit decisions create TYPE scope topic [--adr NNNN] | decisions index
  multi-agent-kit init                        create multi-agent-kit.json in this project
  multi-agent-kit create <dir> [--name n] [--install] [--no-git]
                                              start a new project from the template
  multi-agent-kit new-kit <dir> [--id id] [--public] [--no-git]
                                              start a private (default) or team source of packs

Options:
  --root <dir>   project root (default: current directory)
`;

function takeOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} needs a value`);
  args.splice(index, 2);
  return value;
}

function takeFlag(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

function assertNoOptions(args) {
  const unknown = args.filter((argument) => argument.startsWith("--"));
  if (unknown.length) throw new Error(`Unknown option: ${unknown.join(", ")}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.shift();
  const root = path.resolve(takeOption(args, "--root") || process.cwd());

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }
  if (command === "--version" || command === "-v") {
    console.log(ownPackage.version);
    return;
  }

  if (command === "sync" || command === "check") {
    const check = command === "check" || takeFlag(args, "--check");
    takeFlag(args, "--write"); // accepted for compatibility with the old sync script
    const update = takeFlag(args, "--update");
    const takeOver = takeFlag(args, "--take-over");
    assertNoOptions(args);
    const result = await sync(root, { check, update, takeOver });
    if (result.takenOver.length && !check) console.log(`took over ${result.takenOver.length} hand-made copies that equal their source`);
    for (const shadow of result.shadows) console.log(`overrides ${shadow.id}: ${shadow.by} replaces ${shadow.from}`);
    const problems = [];
    if (result.trackedPrivate.length) {
      problems.push(`private files are tracked by git (run git rm --cached): ${result.trackedPrivate.join(", ")}`);
    }
    if (check) {
      if (result.changed.length || result.stale.length) {
        problems.push(`agent files are out of date: ${[...result.changed, ...result.stale].join(", ")}`);
        problems.push(`run "multi-agent-kit sync"; if you edited a generated file by hand, run "multi-agent-kit adopt <file>" first`);
      }
      if (problems.length) {
        console.error(problems.join("\n"));
        process.exitCode = 1;
      } else {
        console.log("multi-agent-kit: up to date");
      }
      return;
    }
    const privateCount = [...result.outputs.values()].filter((output) => output.private).length;
    console.log(`multi-agent-kit: ${result.outputs.size} files (${result.changed.length} changed, ${result.stale.length} removed${privateCount ? `, ${privateCount} private` : ""})`);
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exitCode = 1;
    }
    return;
  }

  if (command === "list") {
    assertNoOptions(args);
    const { sources, items } = await plan(root);
    for (const source of sources) console.log(`source ${source.id}${source.private ? " (private)" : ""}: ${source.directory} [${source.mode}]`);
    const grouped = new Map();
    for (const item of items.values()) {
      const key = item.origin.label;
      grouped.set(key, [...(grouped.get(key) || []), item.id]);
    }
    for (const [label, ids] of grouped) console.log(`\n${label}\n  ${ids.sort().join("\n  ")}`);
    return;
  }

  if (command === "adopt") {
    assertNoOptions(args);
    if (!args.length) throw new Error("adopt needs at least one generated file");
    const results = await adopt(root, args);
    for (const result of results) {
      console.log(`${result.status.padEnd(9)} ${result.file}${result.source ? ` -> ${result.source}` : ""}${result.message ? `: ${result.message}` : ""}`);
    }
    if (results.some((result) => result.status === "error")) process.exitCode = 1;
    return;
  }

  if (command === "lint") {
    const denyFile = takeOption(args, "--deny");
    assertNoOptions(args);
    const deny = denyFile ? (await readFile(denyFile, "utf8")).split("\n") : [];
    const directory = path.resolve(root, args[0] || "packs");
    const problems = await lint(directory, { deny });
    for (const problem of problems) console.log(`${problem.level.padEnd(7)} ${problem.file}: ${problem.message}`);
    const errors = problems.filter((problem) => problem.level === "error").length;
    console.log(`multi-agent-kit lint: ${errors} errors, ${problems.length - errors} warnings`);
    if (errors) process.exitCode = 1;
    return;
  }

  if (command === "decisions") {
    const created = await decisions(root, args);
    if (created) console.log(created);
    return;
  }

  if (command === "init") {
    assertNoOptions(args);
    const config = await init(root);
    console.log(`created multi-agent-kit.json for ${config.name}${config.local ? ` with local layer ${config.local}` : ""}`);
    return;
  }

  if (command === "create") {
    const name = takeOption(args, "--name");
    const install = takeFlag(args, "--install");
    const initGit = !takeFlag(args, "--no-git");
    assertNoOptions(args);
    if (args.length !== 1) throw new Error("create needs a target directory");
    const result = await create(args[0], { name, install, initGit });
    console.log(`created ${result.projectName} in ${result.directory} (${result.generated} agent files)`);
    console.log(`next: cd ${path.relative(process.cwd(), result.directory) || "."}${install ? "" : " && npm install"} && npm run agents:check`);
    return;
  }

  if (command === "new-kit") {
    const id = takeOption(args, "--id");
    const publicKit = takeFlag(args, "--public");
    const initGit = !takeFlag(args, "--no-git");
    assertNoOptions(args);
    if (args.length !== 1) throw new Error("new-kit needs a target directory");
    const result = await createKit(args[0], { id, publicKit, initGit });
    console.log(`created ${publicKit ? "public" : "private"} kit "${result.id}" in ${result.directory}`);
    console.log(`next: edit packs/team, push it to a ${publicKit ? "" : "private "}repository and add it to "sources" in a project (see README.md)`);
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${HELP}`);
}

try {
  await main();
} catch (error) {
  console.error(`multi-agent-kit: ${error.message}`);
  process.exitCode = 1;
}
