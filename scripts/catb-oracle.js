// Records how catb.org's own HTML edition linked each cross-reference, so the tests can
// check that this build links every term to the same entry Raymond's build did.
//
// Run once, against the official HTML edition (see SOURCE.md for where to get it and its checksum):
//   tar xzf jargon-4.4.7.tar.gz && node scripts/catb-oracle.js jargon-4.4.7/html
// It writes data/catb-crossrefs.json: for each entry id, the terms its page marks as
// cross-references, in order, each with the entry id it links to (null when unlinked).

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/catb-oracle.js <path to jargon-4.4.7/html>");
  process.exit(2);
}

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

const text = (html) => decode(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

const out = {};
for (const letter of readdirSync(dir).sort()) {
  const sub = join(dir, letter);
  if (!statSync(sub).isDirectory() || letter === "graphics") continue;
  for (const file of readdirSync(sub).sort()) {
    if (!file.endsWith(".html")) continue;
    const id = decodeURIComponent(basename(file, ".html"));
    const html = readFileSync(join(sub, file)).toString("latin1");
    // The entry itself: from its <dt> to the navigation footer.
    const body = html.slice(html.indexOf("<dt>"), html.indexOf('<div class="navfooter"'));
    const terms = [];
    const re = /(<a href="([^"]*)">)?<i class="glossterm">([\s\S]*?)<\/i>/g;
    for (const m of body.matchAll(re)) {
      const target = m[2] ? decodeURIComponent(basename(m[2].split("#")[0], ".html")) : null;
      terms.push([text(m[3]), target]);
    }
    out[id] = terms;
  }
}
const path = new URL("../data/catb-crossrefs.json", import.meta.url);
writeFileSync(path, JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"') + "\n");
console.log(`${Object.keys(out).length} entries, ${Object.values(out).flat().length} cross-references`);
