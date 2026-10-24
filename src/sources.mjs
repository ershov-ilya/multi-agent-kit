import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exists, expandHome, git } from "./util.mjs";

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ownPackage = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
const SOURCE_FILE = "multi-agent-kit.source.json";

const cacheRoot = () => process.env.MULTI_AGENT_KIT_CACHE || path.join(os.homedir(), ".cache", "multi-agent-kit");

function describe(spec) {
  return spec.path || spec.package || spec.git;
}

async function resolvePackage(root, name) {
  try {
    const require = createRequire(path.join(root, "package.json"));
    return path.dirname(require.resolve(`${name}/package.json`));
  } catch {
    // Before `npm install` (or when run through npx) the running CLI is the package itself.
    return name === ownPackage.name ? packageRoot : null;
  }
}

function cacheDirectory(url, ref) {
  const slug = `${url}#${ref || "HEAD"}`.replace(/^[a-z]+:\/\//i, "").replace(/[^A-Za-z0-9._-]+/g, "_");
  return path.join(cacheRoot(), "git", slug);
}

function cloneOrUpdate(url, ref, update) {
  const directory = cacheDirectory(url, ref);
  return (async () => {
    if (await exists(path.join(directory, ".git"))) {
      if (!update) return { directory };
      const fetched = git(directory, ["fetch", "--depth", "1", "origin", ref || "HEAD"]);
      if (fetched.status !== 0) return { error: fetched.stderr.trim() };
      const reset = git(directory, ["reset", "--hard", "FETCH_HEAD"]);
      return reset.status === 0 ? { directory } : { error: reset.stderr.trim() };
    }
    await mkdir(path.dirname(directory), { recursive: true });
    const args = ["clone", "--depth", "1", ...(ref ? ["--branch", ref] : []), url, directory];
    const cloned = git(path.dirname(directory), args);
    return cloned.status === 0 ? { directory } : { error: cloned.stderr.trim() };
  })();
}

async function locate(root, spec, update) {
  if (spec.path) {
    const directory = path.resolve(root, expandHome(spec.path));
    if (await exists(directory)) return { directory, mode: "path" };
    if (!spec.git && !spec.package) return { error: `path not found: ${spec.path}` };
  }
  if (spec.package) {
    const directory = await resolvePackage(root, spec.package);
    if (directory) return { directory, mode: "package" };
    if (!spec.git) return { error: `package not installed: ${spec.package} (run npm install)` };
  }
  if (spec.git) {
    const result = await cloneOrUpdate(spec.git, spec.ref, update);
    return result.error ? { error: `git ${spec.git}: ${result.error}` } : { directory: result.directory, mode: "git" };
  }
  return { error: "source needs one of: path, package, git" };
}

export async function resolveSources(root, config, { update = false, warn = console.warn } = {}) {
  const sources = [];
  for (const entry of config.sources) {
    const spec = typeof entry === "string" ? { package: entry } : entry;
    if (!spec || typeof spec !== "object") throw new Error(`Invalid source: ${JSON.stringify(entry)}`);
    const located = await locate(root, spec, update);
    if (located.error) {
      if (spec.optional) {
        warn(`multi-agent-kit: skipped optional source ${describe(spec)}: ${located.error}`);
        continue;
      }
      throw new Error(`Source ${describe(spec)}: ${located.error}`);
    }
    const metaFile = path.join(located.directory, SOURCE_FILE);
    const meta = await exists(metaFile) ? JSON.parse(await readFile(metaFile, "utf8")) : {};
    const id = spec.id || meta.id || path.basename(located.directory);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Source id must be kebab-case: ${id}`);
    if (sources.some((source) => source.id === id)) throw new Error(`Duplicate source id: ${id}`);
    sources.push({
      id,
      directory: located.directory,
      mode: located.mode,
      private: spec.private ?? meta.private ?? false,
    });
  }
  return sources;
}
