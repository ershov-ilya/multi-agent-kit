import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { exists, filesRecursively, isDirectory, toPosix } from "./util.mjs";
import { isOwned } from "./sync.mjs";

// Where a person or an agent may drop a new skill, agent, command or rule by hand, per target.
const LOCATIONS = {
  claude: [
    { kind: "skills", directory: ".claude/skills" },
    { kind: "agents", directory: ".claude/agents", extension: ".md" },
    { kind: "commands", directory: ".claude/commands", extension: ".md" },
    { kind: "rules", directory: ".claude/rules", extension: ".md" },
  ],
  cursor: [
    { kind: "skills", directory: ".cursor/skills" },
    { kind: "agents", directory: ".cursor/agents", extension: ".md" },
    { kind: "commands", directory: ".cursor/commands", extension: ".md" },
    { kind: "rules", directory: ".cursor/rules", extension: ".mdc" },
  ],
  codex: [
    { kind: "skills", directory: ".agents/skills" },
  ],
};

async function newest(files) {
  let time = 0;
  for (const file of files) time = Math.max(time, (await stat(file)).mtimeMs);
  return time;
}

// Items present in platform folders that no source produced and that carry no generated marker.
export async function discover(root, outputs, targets) {
  const found = new Map();
  const add = async (kind, name, location, files) => {
    const id = `${kind}/${name}`;
    const copy = {
      location,
      files,
      modified: await newest(files.map((file) => file.absolute)),
      contents: Object.fromEntries(await Promise.all(files.map(async (file) => [file.relative, await readFile(file.absolute, "utf8")]))),
    };
    found.set(id, { id, kind, name, copies: [...(found.get(id)?.copies || []), copy] });
  };

  for (const target of targets) {
    for (const location of LOCATIONS[target]) {
      const directory = path.join(root, location.directory);
      if (!await isDirectory(directory)) continue;
      if (location.kind === "skills") {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const skillDirectory = path.join(directory, entry.name);
          if (!await exists(path.join(skillDirectory, "SKILL.md"))) continue;
          const files = (await filesRecursively(skillDirectory)).map((file) => ({
            absolute: file,
            relative: toPosix(path.relative(skillDirectory, file)),
            output: toPosix(path.relative(root, file)),
          }));
          if (files.some((file) => outputs.has(file.output))) continue;
          if (await isOwned(path.join(skillDirectory, "SKILL.md"))) continue;
          await add("skills", entry.name, location.directory, files);
        }
      } else {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          if (!entry.isFile() || path.extname(entry.name) !== location.extension) continue;
          const file = path.join(directory, entry.name);
          const output = toPosix(path.relative(root, file));
          if (outputs.has(output) || await isOwned(file)) continue;
          await add(location.kind, path.basename(entry.name, location.extension), location.directory, [{ absolute: file, relative: entry.name, output }]);
        }
      }
    }
  }

  return [...found.values()].map((item) => {
    const [first, ...rest] = item.copies;
    const same = (left, right) => JSON.stringify(Object.entries(left.contents).sort()) === JSON.stringify(Object.entries(right.contents).sort());
    // Rules and commands keep their name but not their extension across tools, so compare text only.
    const identical = rest.every((copy) => item.kind === "skills" ? same(first, copy) : Object.values(first.contents)[0] === Object.values(copy.contents)[0]);
    return { ...item, identical };
  }).sort((left, right) => left.id.localeCompare(right.id));
}
