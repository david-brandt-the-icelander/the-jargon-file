# The Jargon File

The Jargon File, version 4.4.7 (29 Dec 2003), Eric S. Raymond, ed., as data. icelander.net builds its pages at <https://icelander.net/the-jargon-file/> from this repository.

This repository owns the **content**: Raymond's text, the fixes to its links, and which picture each entry gets. It has no styling and no page templates. What the File looks like is the site's job, so the look can change without touching the content, and the reverse.

- `upstream/`: Raymond's XML and images, exactly as released, never edited. `SOURCE.md` says where they came from, how they were checked, and the licence: the File is in the public domain.
- `lib/`: the build. `source.js` reads the XML as the online edition, `render.js` turns DocBook into HTML, `parse.js` collects entries and pages, `build.js` applies the link fixes, `visuals.js` chooses pictures, `reports.js` writes `LINKS.md` and `FIXES.md`.
- `data/`: what the build needs besides `upstream/`: `links.json` (every outside link and what to do with it), `catb-crossrefs.json` (how catb.org's own edition linked each cross-reference, for the tests), `xkcd/` (the comic index and the hand-made overrides).
- `LINKS.md`, `FIXES.md`: every change the build makes to where a link points, and the two places the XML can't be read as written. Written by the build; CI fails if they are stale.

## CI

The checks run in a Docker container, not on GitHub Actions: [continuous_integration_and_delivery/the-jargon-file](https://github.com/david-brandt-the-icelander/continuous_integration_and_delivery/tree/main/the-jargon-file). Its `build` mode runs `npm ci`, `npm test`, `npm run build` and checks that `LINKS.md` and `FIXES.md` are as committed; its `links` mode runs the outside-link check below. Its README says how to run and schedule them and how they can report a commit status here.

## Commands

Node 22 or later.

```bash
npm ci
```

```bash
npm run build
```

Writes `dist/` (below), `LINKS.md` and `FIXES.md`. Offline and deterministic. It fails if an outside link isn't in `data/links.json` or a cross-reference doesn't resolve.

```bash
npm test
```

```bash
npm run links:check
```

Checks every outside link again and rewrites `data/links.json` (about ten minutes). Entries marked `"manual": true` are a person's decision and are kept. The CI's `links` mode runs it with `--ci` (weekly, once a machine schedules it), which changes nothing and fails if a link readers are sent to has broken.

```bash
npm run xkcd:fetch
```

Adds new xkcd comics to `data/xkcd/`. The build never fetches; run this by hand, then build.

## The data

`npm run build` writes:

| File | What |
|---|---|
| `dist/meta.json` | The edition: `title`, `version` (`4.4.7`), `date` (`29 Dec 2003`, as Raymond wrote it), `editor`, `citation`, `source.home`, `licence` (`name`, `statement`: the preface's own words), `entries`, `links.checked`. |
| `dist/entries.json` | The 2,307 entries in the File's own order (an array). |
| `dist/pages.json` | The 18 pages outside the lexicon: the preface, the introduction's chapters, the appendices, the bibliography, and `lexicon` (the lexicon's own introduction). |
| `dist/visuals.json` | The picture for each entry, keyed by entry id. |
| `dist/images/` | The 33 images the text uses. |
| `dist/report.json` | What the build changed and what it noticed. |

An entry:

| Field | What |
|---|---|
| `id` | Raymond's id, unique, safe in a URL path segment (`hack`, `Hacking-X-for-Y`, `con_`). |
| `index` | Position in the File. |
| `term`, `termHtml` | The headword, as text and as HTML. |
| `letter` | The lexicon section it's in: `0` (digits and symbols) or `A`–`Z`. |
| `labels` | Pronunciation and part of speech: `[{ kind: "pronunciation" \| "grammar" \| …, html, text }]`. |
| `added`, `revisions` | The File version that added it, and its revision history (`[{ version, remark }]`). |
| `html` | The definition, as HTML (below). |
| `text` | The same as plain text. |
| `refs` | Ids of the entries it links to. |
| `images` | Images it uses (file names in `dist/images/`). |

A page: `{ id, title, part, html, sections: [{ id, title }], images }`.

A visual is one of:

- `{ kind: "xkcd", num, title, img, alt, url, date, licence: { name, url, author }, why }`: show the comic from `img` (xkcd allows hotlinking), with its `alt` as the image's title text, and always link to `url` and to `licence.url`. xkcd is CC BY-NC 2.5: the site must stay non-commercial.
- `{ kind: "card" }`: no picture; the site draws a card for the entry itself.

A later kind, `meme`, will come from the AI-backed meme generator: `{ kind: "meme", src, alt, credit }`. A consumer should treat an unknown `kind` as `card`.

`why` says how the visual was chosen (`rule: "match"` with the evidence, or `rule: "override"` with a person's note). It's for review, not for display.

### The HTML

Semantic, unstyled, and small: `p a i em code cite span small div blockquote pre ul ol li dl dt dd figure figcaption img table caption thead tbody tr th td section h2 h3 sup sub`. A test keeps it to that list. Classes start with `jf-` and say what a thing is:

| Class | On | What |
|---|---|---|
| `jf-sense`, `jf-etymology`, `jf-history`, `jf-references` | `div` | One part of an entry: a sense of the word, a note before the senses, a note after them, a list of see-alsos. |
| `jf-term` | `a`, `i` | A cross-reference to another entry (`a`), or a term the File marks but has no entry for (`i`). |
| `jf-grammar`, `jf-pronunciation` | `span` | Part of speech (`n.`, `vt.`) and pronunciation (`/foo/`). |
| `jf-firstterm` | `em` | A term introduced in passing. |
| `jf-newsgroup`, `jf-hostname` | `code` | Usenet groups and host names. |
| `jf-manpage` | `code` | A Unix manual page, `name(n)`. |
| `jf-layout`, `jf-code` | `pre` | Text whose line breaks matter: verse and layout (`jf-layout`), screens and programs (`jf-code`). |
| `jf-figure` | `figure` | One of the File's images, with its caption. |
| `jf-archived` | `a` | A link to the Internet Archive's copy of a page that is gone. `data-original` holds the address the File gave. It is followed by `<small class="jf-note">(archived)</small>`. |
| `jf-dead-link` | `span` | The text of a link that is gone without a copy; `data-original` holds the address. |
| `jf-fraktur`, `jf-foreign`, `jf-word`, `jf-application`, `jf-email`, `jf-author`, `jf-publisher`, `jf-year`, `jf-isbn`, `jf-biblioentry`, `jf-table` | | What the name says. |

Addresses inside the HTML that point into the File are not URLs, so the site chooses its own:

- `href="entry:<id>"`, or `entry:<id>#<anchor>`: another entry.
- `href="section:<id>"`, or `section:<id>#<anchor>`: a page from `pages.json`.
- `src="image:<file>"`: a file in `dist/images/`.

Every other `href` is an ordinary absolute URL.

## Licences

- **The Jargon File:** public domain (`SOURCE.md`). Cite it with its version: "The Jargon File, version 4.4.7, 29 Dec 2003. Eric S. Raymond, ed." Some of its photographs may be other people's work; `SOURCE.md` lists them.
- **xkcd** (`data/xkcd/comics.json` and the comics shown): Randall Munroe, CC BY-NC 2.5, <https://xkcd.com/license.html>.
- **explainxkcd's transcripts** (`data/xkcd/transcripts.json`, used only for matching): explainxkcd's editors, CC BY-SA 3.0, <https://www.explainxkcd.com>.
- **This repository's code** (`lib/`, `scripts/`, `test/`): not yet licensed; see "Open decisions".

## Open decisions

For the owner, David:

- **The photographs.** `len_std.jpg` (Playboy's photograph of Lena Forsén) and the photographs whose photographers the File doesn't name (`SOURCE.md`) may not be covered by the File's public-domain statement. Show them, or replace them with a caption?
- **A licence for the code.** The text is public domain; the code needs a licence of its own if others are to reuse it.
