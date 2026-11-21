// The whole build in memory: parse, apply the link fixes, choose visuals, report.

import { readFileSync } from "node:fs";
import { parse } from "./parse.js";
import { ENTITY_TYPOS, ENTITY_TYPO_PLACES } from "./source.js";
import { chooseVisuals } from "./visuals.js";

const dataFile = (name) => new URL(`../data/${name}`, import.meta.url);
export const readData = (name) => JSON.parse(readFileSync(dataFile(name), "utf8"));

const ANCHOR = /<a href="([^"]*)">([\s\S]*?)<\/a>/g;

/** HTML-escaped attribute text back to a URL, and the other way. */
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const escape = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Rewrites the outside links in `html` according to data/links.json.
 * Every outside link must be listed there; one that is not is a fatal problem, so a new or
 * changed link can't reach the site unchecked (run `npm run links:check`).
 */
export function applyLinks(html, links, where, used, problems) {
  // A paragraph that exists only to carry a link we drop goes with it.
  html = html.replace(/<p>([^<]*)<a href="([^"]*)">([\s\S]*?)<\/a>([^<]*)<\/p>/g, (all, before, href, inner, after) => {
    const fix = links[unescape(href).trim()];
    if (fix?.status !== "drop-paragraph") return all;
    used.push({ where, original: unescape(href).trim(), ...fix });
    return "";
  });
  return html.replace(ANCHOR, (all, rawHref, inner) => {
    const original = unescape(rawHref).trim();
    if (/^(entry|section):/.test(original)) return all;
    const fix = links[original];
    if (!fix) {
      problems.push({ kind: "unchecked-link", fatal: true, detail: { where, url: original } });
      return all;
    }
    used.push({ where, original, ...fix });
    switch (fix.status) {
      case "live":
      case "moved":
      case "unchecked":
        return `<a href="${escape(fix.url)}">${inner}</a>`;
      case "archived":
        return `<a class="jf-archived" href="${escape(fix.url)}" data-original="${escape(original)}">${inner}</a> <small class="jf-note">(archived)</small>`;
      case "dead":
        return `<span class="jf-dead-link" data-original="${escape(original)}">${inner}</span>`;
      default:
        problems.push({ kind: "bad-link-status", fatal: true, detail: { where, url: original, status: fix.status } });
        return all;
    }
  });
}

export function build() {
  const linkData = readData("links.json");
  const { meta, entries, pages, problems, strays } = parse({ fixes: { terms: linkData.terms ?? {} } });
  for (const p of problems) p.fatal = p.kind !== "duplicate-term";

  const used = [];
  for (const e of entries) {
    e.html = applyLinks(e.html, linkData.links, `entry:${e.id}`, used, problems);
  }
  for (const p of pages) {
    p.html = applyLinks(p.html, linkData.links, `section:${p.id}`, used, problems);
  }

  // Every link in links.json should still be in the text; a stale one is reported, not fatal.
  const seen = new Set(used.map((u) => u.original));
  for (const url of Object.keys(linkData.links)) {
    if (!seen.has(url)) problems.push({ kind: "unused-link-fix", fatal: false, detail: { url } });
  }

  // Cross-references: every entry: and section: link must point at something that exists.
  const ids = new Set(entries.map((e) => e.id));
  const pageIds = new Set(pages.map((p) => p.id));
  for (const x of [...entries.map((e) => [`entry:${e.id}`, e.html]), ...pages.map((p) => [`section:${p.id}`, p.html])]) {
    for (const m of x[1].matchAll(/href="(entry|section):([^"#]+)/g)) {
      const ok = m[1] === "entry" ? ids.has(m[2]) : pageIds.has(m[2]);
      if (!ok) problems.push({ kind: "broken-crossref", fatal: true, detail: { where: x[0], target: `${m[1]}:${m[2]}` } });
    }
  }

  const visuals = chooseVisuals(entries);

  const report = {
    upstreamFixes: [
      ...Object.entries(ENTITY_TYPOS).map(([from, to]) => ({
        kind: "Misspelt entity",
        detail: `\`&${from};\` (${ENTITY_TYPO_PLACES[from]}) is read as \`&${to};\`, a closing single quote.`,
      })),
      ...(strays ?? []).map((s) => ({
        kind: "Unmatched condition",
        detail: `A \`<?fi?>\` with no \`<?if?>\` (line ${s.line}${s.entry ? `, in the entry \`${s.entry}\`` : ""}) is ignored. catb.org's own edition shows the entry in full, cartoon included.`,
      })),
    ],
    links: used,
    problems,
  };
  meta.links = { checked: linkData.checked };
  return { meta, entries, pages, visuals, report };
}
