// DocBook → HTML, for the parts of DocBook the Jargon File uses.
//
// The HTML is semantic and carries no styling: what a page looks like is the consumer's job
// (icelander.net's templates and stylesheet). Classes start with `jf-` and name what a
// thing is, never how it looks.
//
// References inside the HTML are not URLs, because the consumer decides the URLs:
//   href="entry:<id>"            another entry           (optionally "entry:<id>#<anchor>")
//   href="section:<id>"          a front-matter section  (optionally "section:<id>#<anchor>")
//   src="image:<file>"           one of the File's images (upstream/graphics/<file>)
// Every other href is an ordinary absolute URL.

const VOID_TEXT = new Set(["revhistory", "abbrev", "indexterm", "remark"]);

export function escapeText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(s) {
  return escapeText(s).replace(/"/g, "&quot;");
}

/** normalize-space(), as XPath has it. */
export function normalizeSpace(s) {
  return s.replace(/\s+/g, " ").trim();
}

export function elements(node, name) {
  const out = [];
  for (let c = node.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (!name || c.nodeName === name)) out.push(c);
  return out;
}

export function firstElement(node, name) {
  return elements(node, name)[0];
}

/**
 * A renderer bound to one document. `targets` resolves link targets:
 *   targets.term(text)  → entry id for a glossterm's text, or undefined
 *   targets.id(id)      → { kind: "entry"|"section", page, anchor } for a linkend, or undefined
 * `report(kind, detail)` collects problems for the build's reports.
 */
export function createRenderer({ targets, report = () => {} }) {
  let quoteDepth = 0;
  let preDepth = 0;
  let context = "";

  function children(node) {
    let out = "";
    for (let c = node.firstChild; c; c = c.nextSibling) out += render(c);
    return out;
  }

  function href(target) {
    return target.anchor ? `${target.kind}:${target.page}#${target.anchor}` : `${target.kind}:${target.page}`;
  }

  function glossterm(node) {
    const text = normalizeSpace(node.textContent);
    const linkend = node.getAttribute("linkend");
    let id;
    if (linkend) {
      const t = targets.id(linkend);
      if (t?.kind === "entry") id = t.page;
      else report("unresolved-linkend", { context, linkend, text });
    } else {
      id = targets.term(text);
      if (!id) report("unresolved-term", { context, text });
    }
    const inner = children(node);
    return id ? `<a class="jf-term" href="entry:${escapeAttr(id)}">${inner}</a>` : `<i class="jf-term">${inner}</i>`;
  }

  function link(node) {
    const linkend = node.getAttribute("linkend");
    const t = targets.id(linkend);
    if (!t) {
      report("unresolved-linkend", { context, linkend, text: normalizeSpace(node.textContent) });
      return children(node);
    }
    return `<a href="${escapeAttr(href(t))}">${children(node)}</a>`;
  }

  function xref(node) {
    const linkend = node.getAttribute("linkend");
    const t = targets.id(linkend);
    if (!t) {
      report("unresolved-linkend", { context, linkend, text: "" });
      return "";
    }
    return `<a href="${escapeAttr(href(t))}">${escapeText(t.title ?? linkend)}</a>`;
  }

  function ulink(node) {
    const url = node.getAttribute("url");
    const inner = children(node) || escapeText(url);
    return `<a href="${escapeAttr(url)}">${inner}</a>`;
  }

  function quote(node) {
    const [open, close] = quoteDepth % 2 === 0 ? ["“", "”"] : ["‘", "’"];
    quoteDepth++;
    const inner = children(node);
    quoteDepth--;
    return `${open}${inner}${close}`;
  }

  function emphasis(node) {
    const role = node.getAttribute("role");
    const remap = node.getAttribute("remap");
    const inner = children(node);
    switch (role || remap) {
      case "grammar":
        return `<span class="jf-grammar">${inner}</span>`;
      case "pronunciation":
        return `<span class="jf-pronunciation">${inner}</span>`;
      case "firstterm":
        return `<em class="jf-firstterm">${inner}</em>`;
      case "i":
        return `<i>${inner}</i>`;
      case "fraktur":
        return `<span class="jf-fraktur">${inner}</span>`;
      default:
        return `<em>${inner}</em>`;
    }
  }

  function media(node) {
    const data = node.getElementsByTagName("imagedata")[0];
    const file = data.getAttribute("fileref").replace(/^graphics\//, "");
    const caption = firstElement(node, "caption");
    const alt = caption ? normalizeSpace(caption.textContent) : "";
    const id = node.getAttribute("id");
    const fig = `<figure class="jf-figure"${id ? ` id="${escapeAttr(id)}"` : ""}><img src="image:${escapeAttr(file)}" alt="${escapeAttr(alt)}">${
      caption ? `<figcaption>${children(caption)}</figcaption>` : ""
    }</figure>`;
    return fig;
  }

  function table(node) {
    const title = firstElement(node, "title");
    let out = `<table class="jf-table">`;
    if (title) out += `<caption>${children(title)}</caption>`;
    for (const tgroup of elements(node, "tgroup")) {
      for (const part of elements(tgroup)) {
        if (part.nodeName === "colspec") continue;
        const tag = part.nodeName === "thead" ? "thead" : "tbody";
        const cell = tag === "thead" ? "th" : "td";
        out += `<${tag}>`;
        for (const row of elements(part, "row")) {
          out += "<tr>" + elements(row, "entry").map((e) => `<${cell}>${children(e)}</${cell}>`).join("") + "</tr>";
        }
        out += `</${tag}>`;
      }
    }
    return out + "</table>";
  }

  function section(node, level) {
    const id = node.getAttribute("id");
    const title = firstElement(node, "title");
    const h = `h${Math.min(level, 6)}`;
    let out = `<section${id ? ` id="${escapeAttr(id)}"` : ""}>`;
    if (title) out += `<${h}>${children(title)}</${h}>`;
    for (const c of elements(node)) {
      if (c === title) continue;
      out += c.nodeName === "sect2" ? section(c, level + 1) : render(c);
    }
    return out + "</section>";
  }

  function biblioentry(node) {
    const id = node.getAttribute("id");
    const get = (name) => node.getElementsByTagName(name)[0];
    const title = firstElement(node, "title");
    const authors = [...node.getElementsByTagName("author")].map((a) => normalizeSpace(a.textContent));
    const parts = [];
    if (authors.length) parts.push(`<span class="jf-author">${escapeText(authors.join(", "))}</span>`);
    if (title) parts.push(`<cite>${children(title)}</cite>`);
    const pub = get("publishername");
    if (pub) parts.push(`<span class="jf-publisher">${escapeText(normalizeSpace(pub.textContent))}</span>`);
    const year = get("pubdate") ?? get("year");
    if (year) parts.push(`<span class="jf-year">${escapeText(normalizeSpace(year.textContent))}</span>`);
    const isbn = get("isbn");
    if (isbn) parts.push(`<span class="jf-isbn">${escapeText(normalizeSpace(isbn.textContent))}</span>`);
    const abstract = get("abstract");
    return `<div class="jf-biblioentry"${id ? ` id="${escapeAttr(id)}"` : ""}><p>${parts.join(". ")}.</p>${abstract ? children(abstract) : ""}</div>`;
  }

  function pre(node, open, close) {
    preDepth++;
    const inner = children(node).replace(/^\n/, "").replace(/\s+$/, "");
    preDepth--;
    return open + inner + close;
  }

  function render(node) {
    if (node.nodeType === 3) return escapeText(preDepth ? node.data : node.data.replace(/\s+/g, " "));
    if (node.nodeType !== 1) return "";
    const name = node.nodeName;
    if (VOID_TEXT.has(name)) return "";
    switch (name) {
      case "para":
        return `<p>${children(node)}</p>`;
      case "emphasis":
        return emphasis(node);
      case "glossterm":
        return glossterm(node);
      case "quote":
        return quote(node);
      case "citetitle":
        return `<cite>${children(node)}</cite>`;
      case "command":
      case "literal":
      case "filename":
      case "symbol":
      case "constant":
      case "type":
        return `<code>${children(node)}</code>`;
      case "systemitem": {
        const role = node.getAttribute("role");
        return `<code class="jf-${role ? escapeAttr(role) : "system"}">${children(node)}</code>`;
      }
      case "application":
        return `<span class="jf-application">${children(node)}</span>`;
      case "email":
        return `<span class="jf-email">${children(node)}</span>`;
      case "foreignphrase":
        return `<i class="jf-foreign">${children(node)}</i>`;
      case "wordasword":
        return `<i class="jf-word">${children(node)}</i>`;
      case "superscript":
        return `<sup>${children(node)}</sup>`;
      case "subscript":
        return `<sub>${children(node)}</sub>`;
      case "citerefentry": {
        const t = node.getElementsByTagName("refentrytitle")[0];
        const v = node.getElementsByTagName("manvolnum")[0];
        return `<code class="jf-manpage">${escapeText(normalizeSpace(t.textContent))}${v ? `(${escapeText(normalizeSpace(v.textContent))})` : ""}</code>`;
      }
      case "ulink":
        return ulink(node);
      case "link":
        return link(node);
      case "xref":
        return xref(node);
      case "blockquote":
        return `<blockquote>${children(node)}</blockquote>`;
      case "literallayout":
        return pre(node, `<pre class="jf-layout">`, `</pre>`);
      case "screen":
      case "programlisting":
        return pre(node, `<pre class="jf-code"><code>`, `</code></pre>`);
      case "itemizedlist":
        return `<ul>${children(node)}</ul>`;
      case "orderedlist":
        return `<ol>${children(node)}</ol>`;
      case "listitem":
        return `<li>${children(node)}</li>`;
      case "variablelist":
        return `<dl>${children(node)}</dl>`;
      case "varlistentry":
        return elements(node)
          .map((c) => (c.nodeName === "listitem" ? `<dd>${children(c)}</dd>` : render(c)))
          .join("");
      case "term":
        return `<dt>${children(node)}</dt>`;
      case "mediaobject":
        return media(node);
      case "figure": {
        const title = firstElement(node, "title");
        const mo = firstElement(node, "mediaobject");
        return mo ? media(mo).replace("</figure>", title ? `<figcaption>${children(title)}</figcaption></figure>` : "</figure>") : "";
      }
      case "informaltable":
      case "table":
        return table(node);
      case "sect1":
        return section(node, 2);
      case "sect2":
        return section(node, 3);
      case "biblioentry":
        return biblioentry(node);
      case "title":
        return children(node);
      default:
        report("unknown-element", { context, element: name });
        return children(node);
    }
  }

  return {
    render,
    children,
    setContext(c) {
      context = c;
    },
  };
}

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Plain text of rendered HTML: tags dropped, the five escapes undone, spaces normalized. */
export function htmlToText(html) {
  return normalizeSpace(
    html
      .replace(/<\/(p|div|li|dd|dt|pre|tr|blockquote|figcaption|h\d)>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&(amp|lt|gt|quot|apos);/g, (m, n) => NAMED[n]),
  );
}
