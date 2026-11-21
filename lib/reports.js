// LINKS.md and FIXES.md: what the build changes in Raymond's text, written from the data so
// they can't drift from it. The build rewrites both; CI fails if the committed copies differ.

const esc = (s) => String(s).replace(/\|/g, "\\|");

const STATUS = {
  live: "Live: the same page, at https where the site serves it",
  moved: "Moved: the site now keeps the page at a new address",
  archived: "Archived: the original is gone; the link goes to the Internet Archive's copy closest to 29 Dec 2003",
  dead: "Dead: gone, and not in the Internet Archive; the link is removed and its text kept",
  unchecked: "Not checked",
  "drop-paragraph": "Left out",
};

export function linksMarkdown(linkData, used) {
  const where = new Map();
  for (const u of used) {
    if (!where.has(u.original)) where.set(u.original, new Set());
    where.get(u.original).add(u.where);
  }
  const groups = {};
  for (const [url, v] of Object.entries(linkData.links)) (groups[v.status] ??= []).push([url, v]);
  const counts = Object.entries(groups).map(([k, v]) => `${v.length} ${k}`).join(", ");
  let md = `# Links\n\nWhat this edition does with each of the ${Object.keys(linkData.links).length} outside links in the File (${counts}). Written by \`npm run build\` from \`data/links.json\`, which \`npm run links:check\` fills in; last checked ${linkData.checked}. Raymond's text is never changed: only where a link points. Links marked "(by hand)" are a person's decision, recorded in \`data/links.json\` with \`"manual": true\`.\n\n`;
  md += `Cross-references between entries are checked by every build and every one resolves. They match catb.org's own HTML edition (\`data/catb-crossrefs.json\`) except in three entries, where catb.org's build missed two links (\`CNK\` → \`splork-\`, \`splork-\` → \`CNK\`, headwords with \`>\` and \`!\` in them) and had one the XML doesn't (\`spod\` → \`geek\`).\n\n`;
  for (const status of ["live", "moved", "archived", "dead", "unchecked", "drop-paragraph"]) {
    const rows = groups[status];
    if (!rows) continue;
    md += `## ${STATUS[status]}\n\n| In | Original | Now | Why |\n|---|---|---|---|\n`;
    for (const [url, v] of rows) {
      const ins = [...(where.get(url) ?? [])].map((w) => `\`${w}\``).join(", ");
      const now = v.url && v.url !== url ? `<${v.url}>` : v.url ? "unchanged" : "—";
      md += `| ${ins} | \`${esc(url)}\` | ${now} | ${esc(v.note ?? "")}${v.archived ? ` Copy of ${v.archived}.` : ""}${v.manual ? " (by hand)" : ""} |\n`;
    }
    md += "\n";
  }
  return md;
}

export function fixesMarkdown(report) {
  let md = `# Fixes\n\nThe few places where \`upstream/jargon.xml\` could not be read exactly as written, and what the build does instead. Written by \`npm run build\`.\n\n`;
  for (const f of report.upstreamFixes) md += `- **${f.kind}**: ${f.detail}\n`;
  md += `\nLinks are in \`LINKS.md\`.\n`;
  return md;
}
