import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { build, readData } from "../lib/build.js";
import { applyConditions, prepare } from "../lib/source.js";
import { linksMarkdown, fixesMarkdown } from "../lib/reports.js";

const { meta, entries, pages, visuals, report } = build();
const byId = new Map(entries.map((e) => [e.id, e]));

test("the conditions choose the online edition", () => {
  assert.equal(applyConditions("a<?if condition='web'?>W<?else?>B<?fi?>z"), "aWz");
  assert.equal(applyConditions(`a<?if condition="book"?>B<?if history='full'?>H<?fi?><?fi?>z`), "az");
  assert.equal(applyConditions("a<?fi?>b"), "ab");
});

test("entities are expanded and the DOCTYPE removed", () => {
  const { text } = prepare(`<!DOCTYPE book [<!ENTITY version '4.4.7'>]><p>&version; &lsquo;x&rsquo; &amp;</p>`);
  assert.equal(text, "<p>4.4.7 ‘x’ &amp;</p>");
});

test("the edition", () => {
  assert.equal(meta.version, "4.4.7");
  assert.equal(meta.date, "29 Dec 2003");
  assert.equal(entries.length, 2307);
  assert.match(meta.licence.statement, /^This document \(the Jargon File\) is in the public domain/);
});

test("the build has no unresolved problems", () => {
  const fatal = report.problems.filter((p) => p.fatal);
  assert.deepEqual(fatal, []);
});

test("entry ids are unique and every entry has a term, a letter and text", () => {
  assert.equal(byId.size, entries.length);
  for (const e of entries) {
    assert.ok(e.term && e.letter && e.text, e.id);
  }
});

test("the book-only matter is left out and the online preface is in", () => {
  const all = JSON.stringify(pages) + JSON.stringify(entries);
  assert.doesNotMatch(all, /All rights reserved/);
  assert.ok(pages.find((p) => p.id === "online-preface"));
  assert.doesNotMatch(all, /framed<\/a> version/);
});

test("every cross-reference goes to an entry or page that exists", () => {
  const pageIds = new Set(pages.map((p) => p.id));
  for (const x of [...entries, ...pages]) {
    for (const m of x.html.matchAll(/href="(entry|section):([^"#]+)/g)) {
      assert.ok(m[1] === "entry" ? byId.has(m[2]) : pageIds.has(m[2]), `${x.id} → ${m[1]}:${m[2]}`);
    }
  }
});

test("cross-references match catb.org's own edition", () => {
  const oracle = readData("catb-crossrefs.json");
  // catb.org's build differs in these, and the XML is right (LINKS.md explains).
  const known = new Set(["CNK", "splork-", "spod"]);
  const terms = (html) =>
    [...html.matchAll(/<a class="jf-term" href="entry:([^"#]+)[^"]*">([\s\S]*?)<\/a>|<i class="jf-term">([\s\S]*?)<\/i>/g)].map((m) => [
      (m[2] ?? m[3]).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/\s+/g, " ").trim(),
      m[1] ?? null,
    ]);
  let compared = 0;
  for (const e of entries) {
    if (known.has(e.id) || !oracle[e.id]) continue;
    assert.deepEqual(terms(e.html), oracle[e.id], e.id);
    compared++;
  }
  assert.ok(compared > 2300);
});

test("every outside link is checked, and changed links say so", () => {
  const links = readData("links.json").links;
  for (const u of report.links) assert.ok(links[u.original], u.original);
  const foo = byId.get("bamf").html;
  assert.match(foo, /href="http:\/\/www\.catb\.org\/~esr\/jargon\/"/);
  const archived = entries.find((e) => e.html.includes('class="jf-archived"'));
  assert.ok(archived);
  assert.match(archived.html, /href="https:\/\/web\.archive\.org\/web\/\d+\//);
  assert.match(archived.html, /<small class="jf-note">\(archived\)<\/small>/);
});

test("images referred to exist upstream", () => {
  for (const x of [...entries, ...pages]) for (const f of x.images) assert.ok(existsSync(new URL(`../upstream/graphics/${f}`, import.meta.url)), f);
  assert.equal(new Set([...entries, ...pages].flatMap((x) => x.images)).size, 33);
});

test("every entry has a visual", () => {
  for (const e of entries) assert.ok(["xkcd", "card"].includes(visuals[e.id]?.kind), e.id);
});

test("LINKS.md and FIXES.md are current", () => {
  assert.equal(readFileSync(new URL("../LINKS.md", import.meta.url), "utf8"), linksMarkdown(readData("links.json"), report.links));
  assert.equal(readFileSync(new URL("../FIXES.md", import.meta.url), "utf8"), fixesMarkdown(report));
});

test("the HTML uses only the vocabulary README.md documents", () => {
  const allowed = new Set("p a i em code cite span small div blockquote pre ul ol li dl dt dd figure figcaption img table caption thead tbody tr th td section h2 h3 sup sub".split(" "));
  for (const x of [...entries, ...pages]) {
    for (const m of x.html.matchAll(/<([a-z0-9]+)[\s>]/g)) assert.ok(allowed.has(m[1]), `${x.id}: <${m[1]}>`);
  }
});
