// Checks every outside link in the File and records what to do with it in data/links.json.
//
//   npm run links:check            check every link and rewrite data/links.json
//   npm run links:check -- --ci    check only; exit 1 if a link we send readers to has broken
//
// For each link, in order:
//   - an entry marked "manual": true in data/links.json is a person's decision and is kept;
//   - a live page on the same site, not parked and not bounced to the site's front page,
//     is "live" (upgraded to https when the site serves the same page there) or "moved"
//     (when the site itself redirects to a new address);
//   - anything else gets the Internet Archive's snapshot closest to the File's date
//     (29 Dec 2003), "archived", or, without one, "dead" (the link is removed, the text kept).
// Nothing here needs a person or a model; LINKS.md is written from the result.

import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "../lib/parse.js";

const CI = process.argv.includes("--ci");
const FILE = new URL("../data/links.json", import.meta.url);
const FILE_DATE = "20031229";
const TIMEOUT = 20_000;
const UA = "Mozilla/5.0 (compatible; the-jargon-file link checker)";
const PARKED = /domain (name )?(is )?for sale|buy this domain|this domain (may be|is) for sale|parked (free|domain)|\bparked\b|hugedomains|sedoparking|domain has expired|godaddy\.com\/domains|dan\.com|afternic|location\.href="\/lander"|domain for your own great idea/i;

const today = new Date().toISOString().slice(0, 10);
const previous = (() => {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return { links: {}, terms: {} };
  }
})();

/** Every outside link in the text, as written upstream (trimmed). */
function originalLinks() {
  const { entries, pages } = parse({ fixes: { terms: previous.terms ?? {} } });
  const urls = new Map();
  for (const [where, html] of [...entries.map((e) => [`entry:${e.id}`, e.html]), ...pages.map((p) => [`section:${p.id}`, p.html])]) {
    for (const m of html.matchAll(/<a href="([^"]*)">/g)) {
      const url = m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
      if (/^(entry|section):/.test(url)) continue;
      if (!urls.has(url)) urls.set(url, new Set());
      urls.get(url).add(where);
    }
  }
  return urls;
}

/** The registrable part of a host name, roughly: enough to tell "same site" from "someone else". */
function site(host) {
  const parts = host.toLowerCase().replace(/^www\d?\./, "").split(".");
  const two = parts.slice(-2).join(".");
  return /^(co|com|ac|org|net|or|ne|gov|edu)\.[a-z]{2}$/.test(two) ? parts.slice(-3).join(".") : two;
}

async function fetchFollow(url) {
  const chain = [];
  let current = url;
  for (let hop = 0; hop < 8; hop++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT);
    try {
      const res = await fetch(current, { redirect: "manual", signal: ctl.signal, headers: { "user-agent": UA, accept: "text/html,*/*" } });
      chain.push({ url: current, status: res.status });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        current = new URL(loc, current).href;
        await res.body?.cancel();
        continue;
      }
      let body = "";
      if (res.ok && /text|html/.test(res.headers.get("content-type") ?? "")) {
        const reader = res.body.getReader();
        let bytes = 0;
        while (bytes < 65536) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          body += new TextDecoder().decode(value);
        }
        await reader.cancel();
      } else await res.body?.cancel();
      return { status: res.status, final: current, chain, body };
    } catch (err) {
      return { status: 0, final: current, chain, error: String(err.cause?.code ?? err.name ?? err) };
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: 0, final: current, chain, error: "too many redirects" };
}

// The archive's lookup service limits how fast it may be asked: one question at a time, spaced out.
let archiveQueue = Promise.resolve();
function snapshot(url) {
  const turn = archiveQueue.then(() => askArchive(url));
  archiveQueue = turn.then(() => new Promise((r) => setTimeout(r, 1200)));
  return turn;
}

// The archive's lookup matches addresses exactly, so a miss is retried with the spellings
// the same page was often archived under (with or without "www.", with or without the last "/").
function variants(url) {
  const out = [url];
  const m = url.match(/^([a-z]+:\/\/)(www\.)?(.*)$/i);
  if (m) out.push(m[2] ? m[1] + m[3] : m[1] + "www." + m[3]);
  for (const u of [...out]) out.push(u.endsWith("/") ? u.slice(0, -1) : u + "/");
  return [...new Set(out)];
}

async function askArchive(url) {
  let unanswered = false;
  for (const v of variants(url)) {
    const r = await askArchiveOnce(v);
    if (r) return r;
    if (r === undefined) unanswered = true;
  }
  return unanswered ? undefined : null;
}

async function askArchiveOnce(url) {
  const api = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}&timestamp=${FILE_DATE}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(api, { headers: { "user-agent": UA } });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const s = json.archived_snapshots?.closest;
      if (s?.available && String(s.status).startsWith("2")) {
        return { url: s.url.replace(/^http:\/\//, "https://"), timestamp: s.timestamp };
      }
      return null;
    } catch {
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  return undefined; // the archive could not be asked
}

const stamp = (t) => `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;

function sameResource(a, b) {
  const x = new URL(a);
  const y = new URL(b);
  const norm = (u) => (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "") + u.search).toLowerCase();
  return norm(x) === norm(y);
}

async function classify(url, prev) {
  if (prev?.force === "archive") {
    // A person decided the live page is not the one the File meant (see its note).
    const s = await snapshot(url);
    if (s) return { status: "archived", url: s.url, archived: stamp(s.timestamp), force: "archive", note: prev.note };
    return { status: "dead", url: null, force: "archive", note: prev.note };
  }
  if (!/^https?:\/\//i.test(url)) {
    if (/^news:/i.test(url)) return { status: "unchecked", url, note: "Usenet newsgroup link (news:); left as written." };
    if (/^ftp:\/\//i.test(url)) {
      const s = await snapshot(url);
      if (s) return { status: "archived", url: s.url, archived: stamp(s.timestamp), note: "An FTP address, which browsers no longer open." };
      return { status: "dead", url: null, note: "An FTP address, which browsers no longer open, and the Internet Archive has no copy." };
    }
    return { status: "dead", url: null, note: "Not an absolute web address." };
  }
  let live = await fetchFollow(url);
  const https = url.replace(/^http:/i, "https:");
  const ok = (r) =>
    r.status >= 200 &&
    r.status < 300 &&
    site(new URL(r.final).hostname) === site(new URL(url).hostname) &&
    !PARKED.test(r.body ?? "") &&
    // A deep link bounced to the site's front page has lost what it pointed at.
    !(new URL(url).pathname.length > 1 && new URL(r.final).pathname.length <= 1);
  if (ok(live)) {
    let best = live.final;
    if (sameResource(live.final, url)) {
      // Same page. Prefer https when the site serves it.
      if (/^http:/i.test(best)) {
        const viaHttps = await fetchFollow(https);
        best = ok(viaHttps) && sameResource(viaHttps.final, url) ? viaHttps.final : url;
      }
      return { status: "live", url: best, http: live.status };
    }
    return { status: "moved", url: best, http: live.status, note: `The site redirects to its new address.` };
  }
  const s = await snapshot(url);
  const why = live.error
    ? `is unreachable (${live.error})`
    : PARKED.test(live.body ?? "")
      ? "is now a parked domain"
      : live.status >= 400 || !live.status
        ? `answers HTTP ${live.status}`
        : `now goes to ${new URL(live.final).origin}${new URL(live.final).pathname === "/" ? " (a front page)" : new URL(live.final).pathname}`;
  if (s === undefined) return { status: "unchecked", url, note: `The original ${why}, and the Internet Archive could not be asked; try again.` };
  if (s) return { status: "archived", url: s.url, archived: stamp(s.timestamp), note: `The original ${why}.` };
  return { status: "dead", url: null, note: `The original ${why}, and the Internet Archive has no copy.` };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

const urls = originalLinks();
const list = [...urls.keys()].sort();
const results = await pool(list, 6, async (url) => {
  const prev = previous.links[url];
  if (prev?.manual) return [url, prev];
  const r = await classify(url, prev);
  process.stderr.write(`${r.status.padEnd(9)} ${url}\n`);
  return [url, { ...r, checked: today }];
});

const links = Object.fromEntries(results);
const order = { live: 0, moved: 1, archived: 2, dead: 3, unchecked: 4, "drop-paragraph": 5 };
const counts = {};
for (const v of Object.values(links)) counts[v.status] = (counts[v.status] ?? 0) + 1;
console.log(JSON.stringify(counts));

if (CI) {
  // What matters is a link readers are sent to that no longer works.
  const broken = list.filter((u) => ["live", "moved"].includes(previous.links[u]?.status) && !["live", "moved"].includes(links[u].status));
  const added = list.filter((u) => !previous.links[u]);
  for (const u of broken) console.log(`BROKEN  ${u}: ${links[u].note ?? links[u].status}`);
  for (const u of added) console.log(`UNCHECKED  ${u}`);
  process.exit(broken.length || added.length ? 1 : 0);
}

const sorted = Object.fromEntries(Object.entries(links).sort(([a, x], [b, y]) => order[x.status] - order[y.status] || a.localeCompare(b)));
writeFileSync(FILE, JSON.stringify({ checked: today, terms: previous.terms ?? {}, links: sorted }, null, 1) + "\n");
console.log(`Wrote data/links.json (${list.length} links). Run npm run build to update LINKS.md.`);
