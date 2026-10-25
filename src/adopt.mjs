import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { plan, stripMarker } from "./sync.mjs";
import { exists, toPosix } from "./util.mjs";

// Copies hand edits of generated files back into the source they came from.
export async function adopt(root, files) {
  const { outputs } = await plan(root);
  const results = [];
  for (const file of files) {
    const relative = toPosix(path.relative(root, path.resolve(root, file)));
    const output = outputs.get(relative);
    if (!output) {
      results.push({ file: relative, status: "error", message: "not a generated file" });
      continue;
    }
    if (!output.source) {
      results.push({ file: relative, status: "error", message: "this output is converted from its source; edit the source .md instead" });
      continue;
    }
    const present = await exists(path.join(root, relative));
    const actual = present ? await readFile(path.join(root, relative), output.verbatim ? undefined : "utf8") : null;
    if (actual === null || (output.verbatim ? actual.equals(output.content) : actual === output.content)) {
      results.push({ file: relative, status: "unchanged" });
      continue;
    }
    const source = await readFile(output.source.absolute, "utf8");
    if (!output.verbatim && /\{\{\s*(mak|vars)\./.test(source)) {
      results.push({ file: relative, status: "error", message: `${output.source.label} uses template variables; copy the edit by hand` });
      continue;
    }
    if (!output.source.writable) {
      results.push({
        file: relative,
        status: "error",
        message: `${output.source.label} comes from an installed package or git cache; add "path" to that source in multi-agent-kit.json to edit it live`,
      });
      continue;
    }
    await writeFile(output.source.absolute, output.verbatim ? actual : stripMarker(actual));
    results.push({ file: relative, status: "adopted", source: output.source.absolute });
  }
  return results;
}
