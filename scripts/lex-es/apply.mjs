// node apply.mjs batch.tsv  -> writes def-es into the shard files (saved immediately)
import fs from "node:fs";
const LEX = process.env.LEX || "greek";
const dir = new URL(`../../public/data/strongs/${LEX}/`, import.meta.url);
const P = LEX === "hebrew" ? "H" : "G";
const lines = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).filter((l) => l.trim());
const tr = {};
for (const l of lines) {
  const i = l.indexOf("\t");
  if (i < 0) { console.error("bad line:", l); process.exit(1); }
  tr[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}
let n = 0;
for (const f of fs.readdirSync(dir)) {
  const p = new URL(f, dir);
  const d = JSON.parse(fs.readFileSync(p));
  let changed = false;
  for (const k of Object.keys(tr)) if (d[k]) { d[k]["def-es"] = tr[k]; changed = true; n++; }
  if (changed) fs.writeFileSync(p, JSON.stringify(d));
}
console.log(`applied ${n} of ${Object.keys(tr).length}`);
