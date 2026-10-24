import { readFile } from "node:fs/promises";
import path from "node:path";
import { KINDS, layerItems, packMeta } from "./collect.mjs";
import { exists, isDirectory, parseFrontmatter, subdirectories, toPosix } from "./util.mjs";

const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\b(ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}/, "GitHub token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, "Slack token"],
  [/\bsk-(ant-)?[A-Za-z0-9_-]{24,}/, "API key"],
  [/\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s@/]+@/, "connection string with password"],
];

function denyMatchers(lines) {
  return lines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const regex = line.match(/^\/(.+)\/([a-z]*)$/);
      return regex ? new RegExp(regex[1], regex[2].includes("i") ? regex[2] : `${regex[2]}i`) : new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    });
}

// Accepts a source root (with packs/), a packs directory, or a single pack / local layer.
async function layers(directory) {
  const packsDirectory = await isDirectory(path.join(directory, "packs")) ? path.join(directory, "packs") : directory;
  const children = await subdirectories(packsDirectory);
  if (packsDirectory === directory && children.some((name) => KINDS.includes(name))) {
    return [{ name: path.basename(directory), root: directory }];
  }
  if (!children.length) throw new Error(`No packs found in ${directory}`);
  return children.map((name) => ({ name, root: path.join(packsDirectory, name) }));
}

export async function lint(directory, { deny = [] } = {}) {
  const problems = [];
  const report = (level, file, message) => problems.push({ level, file: toPosix(path.relative(process.cwd(), file)), message });
  const denied = denyMatchers(deny);
  const allLayers = await layers(directory);
  // Skills from every pack end up side by side in skills/, so links to sibling skills resolve after sync.
  const skillNames = new Set();
  for (const layer of allLayers) for (const name of await subdirectories(path.join(layer.root, "skills"))) skillNames.add(name);
  const siblingSkill = (target) => {
    const match = target.match(/^(?:\.\.\/)+([a-z0-9-]+)\/SKILL\.md$/);
    return match && skillNames.has(match[1]);
  };

  for (const layer of allLayers) {
    const { vars } = await packMeta(layer.root);
    for (const item of await layerItems(layer.root, { label: layer.name })) {
      if (item.kind === "skills") {
        const skillFile = item.files.find((file) => file.relative === `${item.name}/SKILL.md`);
        if (!skillFile) {
          report("error", path.join(layer.root, "skills", item.name), "missing SKILL.md");
        } else {
          const { attributes } = parseFrontmatter(await readFile(skillFile.absolute, "utf8"));
          if (attributes.name !== item.name) report("error", skillFile.absolute, `frontmatter name must be "${item.name}"`);
          if (!attributes.description) report("error", skillFile.absolute, "frontmatter description is required");
          else if (attributes.description.length > 1024) report("error", skillFile.absolute, "description is longer than 1024 characters");
        }
      }
      if (item.kind === "agents" && item.files[0].relative.endsWith(".md")) {
        const { attributes } = parseFrontmatter(await readFile(item.files[0].absolute, "utf8"));
        if (!attributes.name || !attributes.description) report("error", item.files[0].absolute, "agent needs name and description");
      }
      if (["commands", "rules"].includes(item.kind) || (item.kind === "agents" && item.files[0].relative.endsWith(".mdc"))) {
        const { attributes } = parseFrontmatter(await readFile(item.files[0].absolute, "utf8"));
        if (!attributes.description) report(item.kind === "commands" ? "error" : "warning", item.files[0].absolute, "description is missing");
      }

      for (const file of item.files) {
        const content = await readFile(file.absolute, "utf8");
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          for (const [pattern, name] of SECRET_PATTERNS) {
            if (pattern.test(line)) report("error", `${file.absolute}:${index + 1}`, `looks like a ${name}`);
          }
          for (const pattern of denied) {
            if (pattern.test(line)) report("error", `${file.absolute}:${index + 1}`, `matches deny pattern ${pattern}`);
          }
        });
        for (const match of content.matchAll(/\{\{\s*vars\.([A-Za-z0-9_-]+)\s*\}\}/g)) {
          if (!(match[1] in vars)) report("warning", file.absolute, `{{vars.${match[1]}}} has no default in ${layer.name}/pack.json`);
        }
        const prose = content.replace(/^```[\s\S]*?^```/gm, "").replace(/`[^`\n]*`/g, "");
        for (const match of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
          const target = match[1];
          if (/^([a-z]+:|#|\{\{)/i.test(target) || siblingSkill(target)) continue;
          const resolved = path.resolve(path.dirname(file.absolute), decodeURI(target.split("#")[0]));
          if (!await exists(resolved)) report("warning", file.absolute, `broken link ${target}`);
        }
      }
    }
  }
  return problems;
}
