// Builds dist/ from upstream/ and data/. Offline and deterministic: same input, same output.
//
//   dist/meta.json      the edition: title, version, date, editor, citation, source, licence
//   dist/entries.json   the 2,307 lexicon entries, in the File's own order
//   dist/pages.json     the pages outside the lexicon (preface, introduction, appendices…)
//   dist/visuals.json   the picture for each entry (see lib/visuals.js)
//   dist/images/        the images the text uses
//   dist/report.json    what the build changed or could not resolve
//
// The data format is described in README.md, "The data".

import { mkdirSync, rmSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { build, readData } from "../lib/build.js";
import { linksMarkdown, fixesMarkdown } from "../lib/reports.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

const { meta, entries, pages, visuals, report } = build();

const fatal = report.problems.filter((p) => p.fatal);
if (fatal.length) {
  console.error(`The build found ${fatal.length} problem(s):`);
  for (const p of fatal.slice(0, 30)) console.error(`  ${p.kind}: ${JSON.stringify(p.detail)}`);
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "images"), { recursive: true });
const write = (name, data) => writeFileSync(join(dist, name), JSON.stringify(data, null, 1) + "\n");
write("meta.json", meta);
write("entries.json", entries);
write("pages.json", pages);
write("visuals.json", visuals);
write("report.json", report);

const images = new Set([...entries, ...pages].flatMap((x) => x.images));
for (const file of images) {
  const from = join(root, "upstream", "graphics", file);
  if (!existsSync(from)) throw new Error(`Missing image ${file}`);
  copyFileSync(from, join(dist, "images", file));
}

writeFileSync(join(root, "LINKS.md"), linksMarkdown(readData("links.json"), report.links));
writeFileSync(join(root, "FIXES.md"), fixesMarkdown(report));

const kinds = {};
for (const v of Object.values(visuals)) kinds[v.kind] = (kinds[v.kind] ?? 0) + 1;
console.log(
  `dist/: ${entries.length} entries, ${pages.length} pages, ${images.size} images, visuals ${JSON.stringify(kinds)}; ` +
    `${report.links.length} outside links (${report.links.filter((l) => l.status !== "live").length} changed)`,
);
