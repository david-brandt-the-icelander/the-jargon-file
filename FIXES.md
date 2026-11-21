# Fixes

The few places where `upstream/jargon.xml` could not be read exactly as written, and what the build does instead. Written by `npm run build`.

- **Misspelt entity**: `&rsqyuo;` (once, in the chapter Revision History) is read as `&rsquo;`, a closing single quote.
- **Unmatched condition**: A `<?fi?>` with no `<?if?>` (line 26549, in the entry `fascist`) is ignored. catb.org's own edition shows the entry in full, cartoon included.

Links are in `LINKS.md`.
