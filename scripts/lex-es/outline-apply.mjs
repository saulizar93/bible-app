// node scripts/lex-es/outline-apply.mjs batch.tsv [...more.tsv]
//   reads "H<n>#<i>\t<Spanish line>" and writes it into "outline-es"[i] of that entry
//   (a list parallel to "outline"; lines not translated yet are null). Saved immediately.
import fs from "node:fs";
const dir = new URL("../../public/data/strongs/hebrew/", import.meta.url);
const tr = new Map();
for (const file of process.argv.slice(2))
  for (const l of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!l.trim()) continue;
    const m = l.match(/^(H\d+)#(\d+)\t(.+)$/);
    if (!m) { console.error(`${file}: bad line: ${l}`); process.exit(1); }
    if (!tr.has(m[1])) tr.set(m[1], new Map());
    tr.get(m[1]).set(+m[2], m[3].trim());
  }
let lines = 0, entries = 0, skipped = 0;
for (const f of fs.readdirSync(dir)) {
  const p = new URL(f, dir);
  const d = JSON.parse(fs.readFileSync(p));
  let changed = false;
  for (const [k, byIdx] of tr) {
    const e = d[k];
    if (!e?.outline) continue;
    const es = e["outline-es"] || new Array(e.outline.length).fill(null);
    for (const [i, s] of byIdx) {
      if (i >= e.outline.length) { skipped++; continue; }
      es[i] = s; lines++;
    }
    e["outline-es"] = es;
    changed = true; entries++;
  }
  if (changed) fs.writeFileSync(p, JSON.stringify(d));
}
console.log(`applied ${lines} lines in ${entries} entries${skipped ? `, ${skipped} skipped (index out of range)` : ""}`);
