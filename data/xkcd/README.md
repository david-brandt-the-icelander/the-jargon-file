# xkcd index

Fetched by `npm run xkcd:fetch` (`scripts/fetch-xkcd.js`); read by `lib/visuals.js`.

- `comics.json`: from xkcd's own JSON, `https://xkcd.com/<n>/info.0.json`. xkcd is by Randall Munroe, CC BY-NC 2.5 (<https://xkcd.com/license.html>).
- `transcripts.json`: the transcripts on explainxkcd (<https://www.explainxkcd.com>), CC BY-SA 3.0, by its editors. Used only to find which comic an entry matches; never shown.
- `overrides.json`: a person's decisions, which beat the matcher. `{ "<entry id>": { "num": <comic>, "why": "…" } }` uses that comic; `"num": null` forbids any comic for the entry.
