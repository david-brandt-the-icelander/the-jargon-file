# Rules for agents working on the-jargon-file

- **Never edit `upstream/`.** It is Raymond's release, byte for byte (`SOURCE.md`). Every change to the text is made by the build and shows in `LINKS.md` or `FIXES.md`.
- **This repository has no styling.** No CSS, no page templates, no classes that describe looks. The site that shows the File (icelander.net) owns all of that. The HTML vocabulary and the `jf-` classes are listed in `README.md`; a test enforces the element list. A new class goes in that table in the same commit.
- **The build is offline and deterministic.** Nothing in `npm run build` or `npm test` reaches the network. Fetching (`links:check`, `xkcd:fetch`) is done by hand and the result committed.
- **Run `npm run build` and `npm test` before committing,** and commit `LINKS.md` and `FIXES.md` as the build writes them.
- **A person's decision is marked.** In `data/links.json` it has `"manual": true`; in `data/xkcd/overrides.json` it has a `why`. Don't overwrite either with an automatic result.
- **xkcd only, and always credited.** No other comic source without the owner's say-so. Every xkcd visual links to the comic and to <https://xkcd.com/license.html>.
- **Dates** in the repository (notes, data, commit messages) are `YYYY-MM-DD`. Raymond's own dates (`29 Dec 2003`) are quoted as he wrote them.
