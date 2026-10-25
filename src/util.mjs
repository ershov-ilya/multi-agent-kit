import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(filePath) {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

const ignoredNames = new Set([".DS_Store", "Thumbs.db"]);

export async function filesRecursively(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (ignoredNames.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesRecursively(entryPath));
    if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

export async function subdirectories(directory) {
  if (!await isDirectory(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

export const toPosix = (filePath) => filePath.split(path.sep).join("/");

// Markdown gets a generated marker and template variables; every other file is copied byte for byte.
export const isMarkdown = (filePath) => /\.(md|mdc)$/i.test(filePath);

export function expandHome(filePath) {
  if (filePath === "~") return os.homedir();
  if (filePath.startsWith("~/")) return path.join(os.homedir(), filePath.slice(2));
  return filePath;
}

export function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) return { attributes: {}, body: markdown };
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return { attributes: {}, body: markdown };
  const attributes = {};
  const lines = markdown.slice(4, end).split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    // YAML block scalar (description: >- / |): collect the indented lines that follow.
    const block = value.match(/^([>|])[+-]?$/);
    if (block) {
      const parts = [];
      while (index + 1 < lines.length && /^\s+\S/.test(lines[index + 1])) {
        parts.push(lines[index + 1].trim());
        index += 1;
      }
      value = parts.join(block[1] === ">" ? " " : "\n");
    }
    attributes[match[1]] = value.replace(/^['"]|['"]$/g, "");
  }
  return { attributes, body: markdown.slice(end + 5) };
}

export function git(cwd, args, options = {}) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    ...options,
  });
}
