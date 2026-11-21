// Reads upstream/jargon.xml and turns it into a DOM of the online edition.
//
// The master file is DocBook with three things a plain XML parser can't take as they are:
// an internal DTD subset with the File's own entities, HTML-style named entities from the
// DocBook DTD (&lsquo; and friends), and Raymond's xmlif processing instructions
// (<?if condition='web'?> … <?else?> … <?fi?>), which choose between the online edition
// and the printed book. This module resolves all three the way the web edition's build did
// (`xmlif condition='web'`), then parses what is left.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DOMParser } from "@xmldom/xmldom";
import { HTML_ENTITIES } from "@xmldom/xmldom/lib/entities.js";

export const SOURCE = fileURLToPath(new URL("../upstream/jargon.xml", import.meta.url));

// The conditions the online edition was built with. Anything not listed is unset, so
// `<?if history='full'?>` (the long revision history) is left out, as on catb.org.
const CONDITIONS = { condition: "web" };

// Upstream mistakes in entity names, corrected so the file parses. Each one is reported
// in FIXES.md by the build.
export const ENTITY_TYPOS = { rsqyuo: "rsquo" };
export const ENTITY_TYPO_PLACES = { rsqyuo: "once, in the chapter Revision History" };

// Entities whose expansion is XML markup or must stay escaped.
const KEEP = new Set(["lt", "gt", "amp", "quot", "apos"]);

/** The file's own <!ENTITY name 'value'> declarations, with values expanded. */
export function declaredEntities(text) {
  const out = {};
  for (const m of text.matchAll(/<!ENTITY\s+(\w+)\s+'([^']*)'\s*>/g)) out[m[1]] = m[2];
  // Values may refer to earlier entities (&jargonurl; uses &esrhome;).
  for (let pass = 0; pass < 3; pass++) {
    for (const k of Object.keys(out)) out[k] = out[k].replace(/&(\w+);/g, (all, n) => out[n] ?? all);
  }
  return out;
}

function lastEntry(text, offset) {
  const at = text.lastIndexOf("<glossentry id=", offset);
  return at < 0 ? null : text.slice(at).match(/id=['"]([^'"]+)/)[1];
}

/** Applies <?if a='b'?> … <?else?> … <?fi?> with the given conditions. Nested blocks work. */
export function applyConditions(text, conditions = CONDITIONS, strays = []) {
  const re = /<\?(if|else|fi)\b([^?]*)\?>/g;
  const stack = []; // each: { take, parentOn }
  let on = true;
  let out = "";
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (on) out += text.slice(last, m.index);
    last = m.index + m[0].length;
    const [, kind, args] = m;
    if (kind === "if") {
      const take = [...args.matchAll(/(\w+)\s*=\s*['"]([^'"]*)['"]/g)].every(([, k, v]) => conditions[k] === v);
      stack.push({ take, parentOn: on });
      on = on && take;
    } else if (kind === "else") {
      const top = stack.at(-1);
      if (!top) throw new Error(`<?else?> without <?if?> at offset ${m.index}`);
      on = top.parentOn && !top.take;
    } else {
      const top = stack.pop();
      // Upstream has one stray <?fi?> (in the entry `fascist`); xmlif ignored it, and so do we.
      if (!top) strays.push({ line: text.slice(0, m.index).split("\n").length, entry: lastEntry(text, m.index) });
      else on = top.parentOn;
    }
  }
  if (stack.length) throw new Error(`${stack.length} <?if?> block(s) never closed`);
  return out + text.slice(last);
}

/** The prepared text: conditions applied, DOCTYPE removed, every entity but the five XML ones expanded. */
export function prepare(raw) {
  const own = declaredEntities(raw);
  const strays = [];
  let text = applyConditions(raw, CONDITIONS, strays);
  text = text.replace(/<!DOCTYPE[\s\S]*?\]>/, "");
  const unknown = new Set();
  text = text.replace(/&(\w+);/g, (all, name) => {
    if (KEEP.has(name)) return all;
    const fixed = ENTITY_TYPOS[name] ?? name;
    if (fixed in own) return own[fixed];
    const ch = HTML_ENTITIES[fixed];
    if (ch !== undefined) return ch;
    unknown.add(name);
    return all;
  });
  if (unknown.size) throw new Error(`Unknown entities: ${[...unknown].join(", ")}`);
  return { text, entities: own, strays };
}

/** Parses the online edition. Returns { doc, entities, raw, strays }. */
export function load(path = SOURCE) {
  // The file is ISO-8859-1 by declaration (in practice ASCII): latin1 is that exactly.
  const raw = readFileSync(path).toString("latin1").replace(/^<\?xml[^>]*\?>/, "");
  const { text, entities, strays } = prepare(raw);
  const errors = [];
  const doc = new DOMParser({
    onError: (level, msg) => {
      if (level !== "warning") errors.push(msg);
    },
  }).parseFromString(text, "text/xml");
  if (errors.length) throw new Error(`jargon.xml did not parse:\n${errors.slice(0, 10).join("\n")}`);
  return { doc, entities, raw, strays };
}
