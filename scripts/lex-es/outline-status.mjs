// node scripts/lex-es/outline-status.mjs  -> how much of the Hebrew outline is in Spanish
import fs from "node:fs";
const dir = new URL("../../public/data/strongs/hebrew/", import.meta.url);
let tot = 0, done = 0, first = null;
for (const f of fs.readdirSync(dir)) {
  const d = JSON.parse(fs.readFileSync(new URL(f, dir)));
  for (const k in d) (d[k].outline || []).forEach((_, i) => {
    tot++;
    if (d[k]["outline-es"]?.[i]) done++;
    else if (!first || +k.slice(1) < +first.slice(1)) first = k;
  });
}
console.log(`outline-es: ${done} / ${tot} lines (${((100 * done) / tot).toFixed(1)}%)${first ? `, first missing: ${first}` : ""}`);
