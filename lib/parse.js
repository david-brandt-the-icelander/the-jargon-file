// The online edition as data: entries, front-matter pages, and facts about the edition.

import { load } from "./source.js";
import { createRenderer, elements, firstElement, htmlToText, normalizeSpace } from "./render.js";

/** The <title> of a node as plain text. */
function titleOf(node) {
  const t = firstElement(node, "title");
  return t ? normalizeSpace(t.textContent) : "";
}

function ancestor(node, names) {
  for (let n = node.parentNode; n; n = n.parentNode) if (n.nodeType === 1 && names.includes(n.nodeName)) return n;
  return undefined;
}

/** The pages outside the lexicon: the preface, the introduction's chapters, the appendices, the bibliography. */
function pageNodes(book) {
  const pages = [];
  for (const child of elements(book)) {
    if (child.nodeName === "preface") pages.push({ node: child, part: "" });
    if (child.nodeName !== "part") continue;
    const part = titleOf(child);
    for (const c of elements(child)) {
      if (["chapter", "appendix", "bibliography"].includes(c.nodeName)) pages.push({ node: c, part });
      if (c.nodeName === "partintro") pages.push({ node: c, part, id: "lexicon", title: part });
    }
  }
  return pages;
}

/**
 * Parses upstream/jargon.xml.
 * Returns { meta, entries, pages, problems } where problems lists everything the
 * renderer could not resolve (see createRenderer's `report`).
 */
export function parse({ fixes = {} } = {}) {
  const { doc, entities, strays } = load();
  const book = doc.documentElement;
  const glossentries = [...doc.getElementsByTagName("glossentry")];
  const problems = [];

  // Headword → entry id, for glossterms in running text (DocBook's glossterm.auto.link:
  // exact match on normalize-space of the entry's first glossterm).
  const byTerm = new Map();
  for (const ge of glossentries) {
    const term = normalizeSpace(firstElement(ge, "glossterm").textContent);
    if (byTerm.has(term)) problems.push({ kind: "duplicate-term", detail: { term, ids: [byTerm.get(term), ge.getAttribute("id")] } });
    else byTerm.set(term, ge.getAttribute("id"));
  }

  // Any id in the book → where it lives.
  const pages = pageNodes(book);
  const byId = new Map();
  for (const ge of glossentries) {
    const id = ge.getAttribute("id");
    byId.set(id, { kind: "entry", page: id, title: normalizeSpace(firstElement(ge, "glossterm").textContent) });
  }
  for (const p of pages) {
    const id = p.id ?? p.node.getAttribute("id");
    p.id = id;
    p.title = p.title ?? (titleOf(p.node) || (p.node.nodeName === "bibliography" ? "Bibliography" : id));
    byId.set(id, { kind: "section", page: id, title: p.title });
    for (const el of p.node.getElementsByTagName("*")) {
      const sub = el.getAttribute("id");
      if (sub && !byId.has(sub)) byId.set(sub, { kind: "section", page: id, anchor: sub, title: titleOf(el) || sub });
    }
  }
  for (const ge of glossentries) {
    for (const el of ge.getElementsByTagName("*")) {
      const sub = el.getAttribute("id");
      if (sub && !byId.has(sub)) byId.set(sub, { kind: "entry", page: ge.getAttribute("id"), anchor: sub, title: sub });
    }
  }

  // Fixes to cross-references, from data/links.json (the build passes them in).
  const termFixes = fixes.terms ?? {};
  const targets = {
    term(text) {
      if (byTerm.has(text)) return byTerm.get(text);
      const fix = termFixes[text];
      return fix && byId.get(fix)?.kind === "entry" ? fix : undefined;
    },
    id: (id) => byId.get(id),
  };
  const r = createRenderer({ targets, report: (kind, detail) => problems.push({ kind, detail }) });

  const entries = glossentries.map((ge, index) => {
    const id = ge.getAttribute("id");
    r.setContext(`entry:${id}`);
    const gt = firstElement(ge, "glossterm");
    const div = ancestor(ge, ["glossdiv"]);
    const abbrev = firstElement(ge, "abbrev");
    const labels = abbrev
      ? elements(abbrev).map((e) => {
          const html = r.children(e).trim();
          return { kind: e.getAttribute("role") || e.nodeName, html, text: htmlToText(html) };
        })
      : [];
    const revisions = [...ge.getElementsByTagName("revision")].map((rev) => ({
      version: normalizeSpace(rev.getElementsByTagName("revnumber")[0]?.textContent ?? ""),
      remark: normalizeSpace(rev.getElementsByTagName("revremark")[0]?.textContent ?? ""),
    }));
    let html = "";
    for (const def of elements(ge, "glossdef")) {
      const role = def.getAttribute("role") || "sense";
      html += `<div class="jf-${role}">${r.children(def).trim()}</div>`;
    }
    const refs = [...new Set([...html.matchAll(/href="entry:([^"#]+)/g)].map((m) => m[1]))].filter((x) => x !== id);
    const images = [...new Set([...html.matchAll(/src="image:([^"]+)"/g)].map((m) => m[1]))];
    return {
      id,
      index,
      term: normalizeSpace(gt.textContent),
      termHtml: r.children(gt).trim(),
      letter: titleOf(div),
      labels,
      added: revisions[0]?.version || null,
      revisions,
      html,
      text: htmlToText(html),
      refs,
      images,
    };
  });

  const pageData = pages.map(({ node, part, id, title }) => {
    r.setContext(`section:${id}`);
    let html = "";
    for (const c of elements(node)) if (c.nodeName !== "title") html += r.render(c);
    const sections = [...node.getElementsByTagName("sect1")].map((s) => ({ id: s.getAttribute("id"), title: titleOf(s) }));
    const images = [...new Set([...html.matchAll(/src="image:([^"]+)"/g)].map((m) => m[1]))];
    return { id, title, part, html, sections, images };
  });

  const meta = {
    title: normalizeSpace(firstElement(book, "title").textContent),
    version: entities.version,
    date: entities.date,
    editor: "Eric S. Raymond",
    citation: `The Jargon File, version ${entities.version}, ${entities.date}. Eric S. Raymond, ed.`,
    source: {
      home: "http://www.catb.org/jargon/",
      master: "upstream/jargon.xml",
    },
    licence: {
      name: "Public domain",
      statement: htmlToText(r.render([...doc.getElementsByTagName("preface")][0].getElementsByTagName("para")[1])),
    },
    entries: entries.length,
  };

  return { meta, entries, pages: pageData, problems, strays };
}
