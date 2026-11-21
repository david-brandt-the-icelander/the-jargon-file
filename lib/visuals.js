// Which picture each entry gets. Filled in by the xkcd matcher (see below).
export function chooseVisuals(entries) {
  return Object.fromEntries(entries.map((e) => [e.id, { kind: "card" }]));
}
