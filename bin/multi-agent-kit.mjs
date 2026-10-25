#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { adopt } from "../src/adopt.mjs";
import { catalog } from "../src/catalog.mjs";
import { discover } from "../src/discover.mjs";
import { adoptNew, disable, enable, remove } from "../src/manage.mjs";
import { CONFIG_FILE, loadConfig } from "../src/config.mjs";
import { exists } from "../src/util.mjs";
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
  multi-agent-kit list [--enabled] [--long] [--json]
                                              catalog of all sources (public, team, private), packs and
                                              items with their state in this project
  multi-agent-kit enable <pack|item>          turn a pack or a single skill/agent/rule on, then sync
  multi-agent-kit disable <pack|item>         turn it off, then sync
  multi-agent-kit adopt <file>...             copy hand edits of generated files back to their source
  multi-agent-kit adopt --new [name...] [--to local|source:pack] [--from .claude]
                                              move skills/agents/rules added by hand into a layer and
                                              generate them for every tool
  multi-agent-kit delete <item> [--yes]       remove an item from writable sources, outputs and copies;
                                              without --yes only shows what would be removed
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

function truncate(text, length) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function printCatalog({ sources, packs, entries }, discovered, { enabledOnly, long }) {
  const mark = { on: "on ", off: "   ", excluded: "ex ", overridden: "ovr" };
  for (const source of sources) {
    console.log(`\n${source.id} — ${source.private ? "private" : "public"}, ${source.mode} ${source.directory}`);
    for (const pack of packs.filter((candidate) => candidate.source === source.id)) {
      const items = entries.filter((entry) => entry.layer === pack.label && (!enabledOnly || entry.status === "on"));
      if (enabledOnly && !pack.enabled && !items.length) continue;
      console.log(`  [${pack.enabled ? "x" : " "}] ${pack.name}${pack.description ? ` — ${truncate(pack.description, 90)}` : ""}`);
      for (const entry of items) {
        const note = entry.status === "overridden" ? ` (replaced by ${entry.overriddenBy})` : "";
        const description = long && entry.description ? ` — ${truncate(entry.description, 110)}` : "";
        console.log(`        ${mark[entry.status]} ${entry.id}${note}${description}`);
      }
    }
  }
  const own = entries.filter((entry) => entry.source === "local" || entry.source === "sub");
  for (const layer of [...new Set(own.map((entry) => entry.layer))]) {
    console.log(`\n${layer} — ${layer.startsWith("sub:") ? "subproject layer" : "this project's own layer"}`);
    for (const entry of own.filter((candidate) => candidate.layer === layer)) {
      const note = entry.status === "overridden" ? ` (replaced by ${entry.overriddenBy})` : "";
      console.log(`        ${mark[entry.status]} ${entry.id}${note}${long && entry.description ? ` — ${truncate(entry.description, 110)}` : ""}`);
    }
  }
  if (discovered.length) {
    console.log("\nnot managed yet (added by hand):");
    for (const item of discovered) console.log(`        new ${item.id} — ${item.copies.map((copy) => copy.location).join(", ")}`);
  }
  console.log("\non = in use, ex = excluded, ovr = replaced by a later layer, [x] = pack enabled");
  console.log('change: multi-agent-kit enable|disable <pack|item>; take new ones: multi-agent-kit adopt --new');
}

function reportDiscovered(discovered, config) {
  if (!discovered.length) return;
  console.log(`found ${discovered.length} item(s) added by hand: ${discovered.map((item) => item.id).join(", ")}`);
  if (config.local) {
    console.log(`move them to the local layer (${config.local}) and generate them for every tool: multi-agent-kit adopt --new`);
  } else if (config.subprojects.length) {
    const names = config.subprojects.map((entry) => entry.path).join(", ");
    console.log(`move them to a subproject (${names}) or a pack and generate them for every tool: multi-agent-kit adopt --new --to <subproject|source:pack>`);
  } else {
    console.log("move them to a pack and generate them for every tool: multi-agent-kit adopt --new --to <source:pack>");
  }
}

function reportAdoption({ adopted, skipped }) {
  for (const item of adopted) console.log(`adopted  ${item.id}: ${item.from} -> ${item.to}`);
  for (const item of skipped) console.log(`skipped  ${item.id}: ${item.reason}`);
}

// Syncs or checks one project and prints its report; returns false when something needs attention.
async function syncProject(root, label, { check, update, takeOver }) {
  let result = await sync(root, { check, update, takeOver });
  if (!check && result.config.autoAdopt && result.discovered.length) {
    const adoption = await adoptNew(root, { to: result.config.autoAdopt });
    reportAdoption(adoption);
    result = await sync(root, { check, takeOver });
  }
  if (result.takenOver.length && !check) console.log(`${label}took over ${result.takenOver.length} hand-made copies that equal their source`);
  reportDiscovered(result.discovered, result.config);
  for (const shadow of result.shadows) console.log(`${label}overrides ${shadow.id}: ${shadow.by} replaces ${shadow.from}`);
  const problems = [];
  if (result.trackedPrivate.length) {
    problems.push(`private files are tracked by git (run git rm --cached): ${result.trackedPrivate.join(", ")}`);
  }
  if (check) {
    if (result.changed.length || result.stale.length) {
      problems.push(`agent files are out of date: ${[...result.changed, ...result.stale].join(", ")}`);
      problems.push(`run "multi-agent-kit sync"; if you edited a generated file by hand, run "multi-agent-kit adopt <file>" first`);
    }
    if (problems.length) console.error(problems.map((problem) => `${label}${problem}`).join("\n"));
    else console.log(`${label}multi-agent-kit: up to date`);
    return !problems.length;
  }
  const privateCount = [...result.outputs.values()].filter((output) => output.private).length;
  console.log(`${label}multi-agent-kit: ${result.outputs.size} files (${result.changed.length} changed, ${result.stale.length} removed${privateCount ? `, ${privateCount} private` : ""})`);
  if (problems.length) console.error(problems.map((problem) => `${label}${problem}`).join("\n"));
  return !problems.length;
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
    // In a monorepo every subproject is synced with its own config first, then the root.
    const { subprojects } = await loadConfig(root);
    const projects = [];
    for (const subproject of subprojects) {
      const subRoot = path.join(root, subproject.path);
      if (await exists(path.join(subRoot, CONFIG_FILE))) projects.push({ root: subRoot, label: `${subproject.path}: ` });
    }
    projects.push({ root, label: subprojects.length ? "(root) " : "" });
    let failed = false;
    for (const project of projects) {
      failed = !await syncProject(project.root, project.label, { check, update, takeOver }) || failed;
    }
    if (failed) process.exitCode = 1;
    return;
  }

  if (command === "list") {
    const enabledOnly = takeFlag(args, "--enabled");
    const long = takeFlag(args, "--long");
    const json = takeFlag(args, "--json");
    assertNoOptions(args);
    const result = await catalog(root);
    const { outputs } = await plan(root);
    const discovered = await discover(root, outputs, result.config.targets);
    if (json) {
      const entries = result.entries.map(({ files, root: _root, ...entry }) => entry);
      console.log(JSON.stringify({ sources: result.sources.map(({ id, private: hidden, mode, directory }) => ({ id, private: hidden, mode, directory })), packs: result.packs, entries, new: discovered.map(({ id, copies, identical }) => ({ id, locations: copies.map((copy) => copy.location), identical })) }, null, 2));
      return;
    }
    printCatalog(result, discovered, { enabledOnly, long });
    return;
  }

  if (command === "enable" || command === "disable") {
    assertNoOptions(args);
    if (args.length !== 1) throw new Error(`${command} needs one pack or item, see "multi-agent-kit list"`);
    const result = await (command === "enable" ? enable : disable)(root, args[0]);
    console.log(result.message);
    return;
  }

  if (command === "delete") {
    const yes = takeFlag(args, "--yes");
    assertNoOptions(args);
    if (args.length !== 1) throw new Error("delete needs one item, see \"multi-agent-kit list\"");
    const result = await remove(root, args[0], { yes });
    for (const action of result.actions) {
      const verb = action.type === "exclude" ? "" : action.type === "delete-source" ? "delete source " : "delete copy   ";
      console.log(`${result.dryRun ? "would " : ""}${verb}${action.label}${action.target ? ` (${path.relative(root, action.target) || action.target})` : ""}`);
    }
    const shared = result.actions.filter((action) => action.shared);
    if (shared.length) {
      console.log(`${result.dryRun ? "this would change" : "changed"} shared sources: commit and push them; other projects drop the item on their next "sync --update"`);
    }
    if (result.dryRun) console.log('nothing removed yet: run again with --yes');
    return;
  }

  if (command === "adopt" && args.includes("--new")) {
    takeFlag(args, "--new");
    const to = takeOption(args, "--to");
    const from = takeOption(args, "--from");
    assertNoOptions(args);
    const result = await adoptNew(root, { to, from, names: args });
    if (!result.adopted.length && !result.skipped.length) console.log("no new items found");
    reportAdoption(result);
    if (result.skipped.length) process.exitCode = 1;
    return;
  }

  if (command === "adopt") {
    assertNoOptions(args);
    if (!args.length) throw new Error("adopt needs at least one generated file, or --new");
    // Paths are relative to where the command runs; each file goes to the project that generated it
    // (the nearest folder with multi-agent-kit.json), so this also works from a monorepo root.
    const byProject = new Map();
    for (const argument of args) {
      const absolute = path.resolve(process.cwd(), argument);
      let owner = path.dirname(absolute);
      while (!await exists(path.join(owner, CONFIG_FILE)) && path.dirname(owner) !== owner) owner = path.dirname(owner);
      if (!await exists(path.join(owner, CONFIG_FILE))) owner = root;
      byProject.set(owner, [...(byProject.get(owner) || []), absolute]);
    }
    const results = [];
    for (const [owner, files] of byProject) results.push(...await adopt(owner, files));
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
