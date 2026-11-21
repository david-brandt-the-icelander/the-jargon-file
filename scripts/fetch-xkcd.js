// Fetches xkcd's comic list into data/xkcd/, for matching comics to entries.
//
//   npm run xkcd:fetch
//
// Run by hand, not by the build: the build reads only the cached files, so it stays offline
// and gives the same result every time. A run fetches only the comics not cached yet.
//
//   data/xkcd/comics.json       xkcd's own data (https://xkcd.com/<n>/info.0.json): number,
//                               title, alt text, image, date, and xkcd's transcript where it has one.
//                               xkcd is CC BY-NC 2.5, Randall Munroe (https://xkcd.com/license.html).
//   data/xkcd/transcripts.json  the transcripts written on explainxkcd (https://www.explainxkcd.com),
//                               used only to find matches, never shown. CC BY-SA 3.0, explainxkcd's editors.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const DIR = new URL("../data/xkcd/", import.meta.url);
const UA = "the-jargon-file (xkcd index for matching; https://github.com/david-brandt-the-icelander/the-jargon-file)";
mkdirSync(DIR, { recursive: true });

const read = (name, fallback) => {
  try {
    return JSON.parse(readFileSync(new URL(name, DIR), "utf8"));
  } catch {
    return fallback;
  }
};
const comics = read("comics.json", {});
const transcripts = read("transcripts.json", {});

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

const latest = (await getJson("https://xkcd.com/info.0.json")).num;
const missing = [];
for (let n = 1; n <= latest; n++) if (!comics[n] && n !== 404) missing.push(n);
console.log(`xkcd: latest ${latest}, ${missing.length} to fetch`);

let i = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (i < missing.length) {
      const n = missing[i++];
      const c = await getJson(`https://xkcd.com/${n}/info.0.json`);
      if (!c) continue;
      comics[n] = {
        num: c.num,
        title: c.safe_title || c.title,
        alt: c.alt,
        img: c.img,
        date: `${c.year}-${c.month.padStart(2, "0")}-${c.day.padStart(2, "0")}`,
        transcript: c.transcript || "",
      };
      if (i % 250 === 0) process.stderr.write(`  ${i}/${missing.length}\n`);
    }
  }),
);

// explainxkcd: wiki pages are named "<n>: <title>"; the bare number redirects there.
function transcriptOf(wikitext) {
  const m = wikitext.match(/==\s*Transcript\s*==([\s\S]*?)(\n==[^=]|$)/i);
  if (!m) return "";
  return m[1]
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+ ([^\]]*)\]/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/'{2,}/g, "")
    .replace(/^[:*#]+/gm, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

const want = Object.keys(comics).filter((n) => !(n in transcripts));
console.log(`explainxkcd: ${want.length} transcripts to fetch`);
for (let k = 0; k < want.length; k += 50) {
  const batch = want.slice(k, k + 50);
  const url =
    "https://www.explainxkcd.com/wiki/api.php?action=query&redirects=1&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles=" +
    encodeURIComponent(batch.join("|"));
  const json = await getJson(url);
  const back = new Map((json.query.redirects ?? []).map((r) => [r.to, r.from]));
  for (const p of json.query.pages ?? []) {
    const n = back.get(p.title) ?? p.title.split(":")[0];
    const text = p.revisions?.[0]?.slots?.main?.content;
    if (text !== undefined) transcripts[n] = transcriptOf(text);
  }
  for (const n of batch) transcripts[n] ??= "";
  await new Promise((r) => setTimeout(r, 500));
}

const sortNum = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => Number(a) - Number(b)));
writeFileSync(new URL("comics.json", DIR), JSON.stringify(sortNum(comics), null, 0).replace(/\},"/g, '},\n"') + "\n");
writeFileSync(new URL("transcripts.json", DIR), JSON.stringify(sortNum(transcripts), null, 0).replace(/","/g, '",\n"') + "\n");
console.log(`data/xkcd/: ${Object.keys(comics).length} comics, ${Object.values(transcripts).filter(Boolean).length} transcripts`);
