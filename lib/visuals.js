// Which picture each entry gets: an xkcd comic when one is clearly about the entry, and
// otherwise a card the site draws itself. Deterministic: no model, no network, the same
// answer from the same data every time.
//
// Sources, all cached in data/xkcd/ (scripts/fetch-xkcd.js):
//   comics.json       xkcd's own titles, alt text and transcripts
//   transcripts.json  explainxkcd's transcripts (only used to find matches)
//   overrides.json    a person's decisions: force a comic for an entry, or forbid one
//
// How a comic is chosen for an entry:
//   1. The entry's headword, as a phrase, must appear in the comic: in its title, its alt
//      text or its transcript (whole words; a plural "s" allowed). Headwords of fewer than
//      three letters are never matched.
//   2. The comic must also be about the same thing, shown by sharing the entry's distinctive
//      words: words frequent in the entry, rare across the File and rare across xkcd (in at
//      most RARE_IN_XKCD of the comics), so that "always" or "wrong" never count.
//        - a headword of several words: the comic's title is the headword (articles aside),
//          or the title contains it and the comic shares at least one distinctive word;
//        - a one-word headword: the title contains it and the comic shares at least two;
//        - a headword found only in the alt text or transcript: the comic shares at least
//          three, and the score (below) reaches MIN_SCORE_TEXT.
//   3. Each comic left is scored: where the phrase appears (title 5, alt text 2, transcript 1)
//      times how rare the phrase is across xkcd, plus 1.5 for each shared word. The best wins.
//   4. These rules prefer missing a good comic to showing a wrong one. A person can add what
//      they miss, or forbid what they get wrong, in data/xkcd/overrides.json.
//
// Every xkcd visual carries what the licence asks for: the comic's own page and
// https://xkcd.com/license.html (CC BY-NC 2.5). The site must stay non-commercial.

import { readFileSync } from "node:fs";

const data = (name) => JSON.parse(readFileSync(new URL(`../data/xkcd/${name}`, import.meta.url), "utf8"));

export const XKCD_LICENCE = { name: "CC BY-NC 2.5", url: "https://xkcd.com/license.html", author: "Randall Munroe" };

const MIN_SCORE_TEXT = 12;
const KEYWORDS = 20;
const RARE_IN_XKCD = 0.02;
const ARTICLES = new Set(["a", "an", "the", "of", "on", "in", "my", "your"]);

const STOP = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can
  could did do does doing down during each even few for from further get got had has have having he her here hers him his how i if
  in into is it its itself just let like make many may me more most much must my no nor not now of off often on once one only or
  other our out over own same say see she should since so some such than that the their them then there these they thing things
  this those through to too two under until up upon us use used using very was way we well were what when where which while who
  whom why will with would yes yet you your also one see esp e g i e etc n v vt vi adj adv interj`.split(/\s+/),
);

/** Lower-case word tokens. Keeps letters, digits, and a few characters jargon needs (c++, c#). */
export function tokens(text) {
  return (text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]+(?:[+#]+)?/g) ?? []);
}

function contains(hay, phrase) {
  // hay: token array; phrase: token array. Allows a plural "s"/"es" on the last token.
  const n = phrase.length;
  const last = phrase[n - 1];
  outer: for (let i = 0; i + n <= hay.length; i++) {
    for (let j = 0; j < n - 1; j++) if (hay[i + j] !== phrase[j]) continue outer;
    const w = hay[i + n - 1];
    if (w === last || w === last + "s" || w === last + "es") return true;
  }
  return false;
}

let cache;
function index() {
  if (cache) return cache;
  const comics = data("comics.json");
  const extra = data("transcripts.json");
  const list = Object.values(comics).map((c) => {
    const title = tokens(c.title);
    const alt = tokens(c.alt ?? "");
    const transcript = tokens(`${c.transcript ?? ""} ${extra[c.num] ?? ""}`);
    return { ...c, t: { title, alt, transcript }, all: new Set([...title, ...alt, ...transcript]) };
  });
  // Word → comics containing it, to find candidates without scanning every comic.
  const byWord = new Map();
  for (const c of list) for (const w of c.all) (byWord.get(w) ?? byWord.set(w, []).get(w)).push(c);
  cache = { list, byWord, byNum: new Map(list.map((c) => [c.num, c])) };
  return cache;
}

/** The entry's most distinctive words: frequent in it, rare across the File. */
function keywordsFor(entries, idx) {
  const rareLimit = idx.list.length * RARE_IN_XKCD;
  const df = new Map();
  const tf = entries.map((e) => {
    const counts = new Map();
    for (const w of tokens(e.text)) if (w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
    for (const w of counts.keys()) df.set(w, (df.get(w) ?? 0) + 1);
    return counts;
  });
  const N = entries.length;
  return entries.map((e, i) => {
    const own = new Set(tokens(e.term).flatMap((w) => [w, w + "s", w + "es", w.replace(/s$/, "")]));
    return [...tf[i]]
      .filter(([w]) => !own.has(w) && (idx.byWord.get(w)?.length ?? 0) <= rareLimit)
      .map(([w, c]) => [w, c * Math.log(N / df.get(w))])
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, KEYWORDS)
      .map(([w]) => w);
  });
}

function xkcdVisual(c, why) {
  return {
    kind: "xkcd",
    num: c.num,
    title: c.title,
    img: c.img,
    alt: c.alt,
    url: `https://xkcd.com/${c.num}/`,
    date: c.date,
    licence: XKCD_LICENCE,
    why,
  };
}

/** The best comic for one entry, or null. */
export function matchEntry(entry, keywords, idx = index()) {
  const phrase = tokens(entry.term);
  if (!phrase.length || phrase.join("").length < 3) return null;
  const single = phrase.length === 1;
  // Candidates: comics with every word of the phrase (plurals of the last word included).
  const pools = phrase.map((w, k) => (k === phrase.length - 1 ? [w, w + "s", w + "es"] : [w]).flatMap((x) => idx.byWord.get(x) ?? []));
  let candidates = new Set(pools[0]);
  for (const p of pools.slice(1)) candidates = new Set(p.filter((c) => candidates.has(c)));
  const hits = [...candidates].filter((c) => contains(c.t.title, phrase) || contains(c.t.alt, phrase) || contains(c.t.transcript, phrase));
  if (!hits.length) return null;
  const df = hits.length;
  const idf = Math.log(idx.list.length / df);
  const bare = (t) => t.filter((w) => !ARTICLES.has(w));
  let best = null;
  for (const c of hits) {
    const inTitle = contains(c.t.title, phrase);
    const titleIsPhrase = inTitle && bare(c.t.title).length <= bare(phrase).length && contains(bare(c.t.title), bare(phrase));
    const shared = keywords.filter((w) => c.all.has(w));
    const where = (inTitle ? 5 : 0) + (contains(c.t.alt, phrase) ? 2 : 0) + (contains(c.t.transcript, phrase) ? 1 : 0);
    const score = where * idf + 1.5 * shared.length;
    const eligible = inTitle
      ? single
        ? shared.length >= 2
        : titleIsPhrase || shared.length >= 1
      : shared.length >= 3 && score >= MIN_SCORE_TEXT;
    if (!eligible) continue;
    if (!best || score > best.score || (score === best.score && c.num < best.c.num)) best = { c, score, inTitle, titleIsPhrase, shared };
  }
  if (!best) return null;
  return xkcdVisual(best.c, {
    rule: "match",
    phrase: phrase.join(" "),
    inTitle: best.inTitle,
    titleIsPhrase: best.titleIsPhrase,
    shared: best.shared,
    comicsWithPhrase: df,
    score: Math.round(best.score * 100) / 100,
  });
}

export function chooseVisuals(entries) {
  const idx = index();
  const overrides = data("overrides.json");
  const kw = keywordsFor(entries, idx);
  const out = {};
  entries.forEach((e, i) => {
    const o = overrides[e.id];
    if (o) {
      if (o.num === null) out[e.id] = { kind: "card", why: { rule: "override", note: o.why } };
      else {
        const c = idx.byNum.get(o.num);
        if (!c) throw new Error(`overrides.json: ${e.id} names xkcd ${o.num}, which is not in data/xkcd/comics.json`);
        out[e.id] = xkcdVisual(c, { rule: "override", note: o.why });
      }
      return;
    }
    out[e.id] = matchEntry(e, kw[i], idx) ?? { kind: "card" };
  });
  for (const id of Object.keys(overrides)) if (!entries.some((e) => e.id === id)) throw new Error(`overrides.json: no entry ${id}`);
  return out;
}
