// node scripts/lex-es/outline-dump.mjs [from] [to] > file.tsv
//   prints "H<n>#<i>\t<English outline line>" for every Hebrew outline line that has no
//   Spanish yet in "outline-es" (index i = position in the entry's "outline" list)
import fs from "node:fs";
const dir = new URL("../../public/data/strongs/hebrew/", import.meta.url);
const [from = 1, to = 99999] = process.argv.slice(2).map(Number);
const all = {};
for (const f of fs.readdirSync(dir)) Object.assign(all, JSON.parse(fs.readFileSync(new URL(f, dir))));
for (let n = from; n <= to; n++) {
  const e = all[`H${n}`];
  if (!e?.outline) continue;
  e.outline.forEach((line, i) => {
    if (!e["outline-es"]?.[i]) console.log(`H${n}#${i}\t${line}`);
  });
}
