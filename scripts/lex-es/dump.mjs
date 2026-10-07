// node dump.mjs <from> <to>   -> prints "G<n>\t<def-en>" for entries still missing a real def-es
import fs from "node:fs";
const dir = new URL("../../public/data/strongs/greek/", import.meta.url);
const [from, to] = process.argv.slice(2).map(Number);
const PH = "Definición en español llegará pronto.";
const all = {};
for (const f of fs.readdirSync(dir)) Object.assign(all, JSON.parse(fs.readFileSync(new URL(f, dir))));
for (let n = from; n <= to; n++) {
  const e = all[`G${n}`];
  if (!e || !e["def-en"]) continue;
  if (e["def-es"] && e["def-es"] !== PH) continue;
  console.log(`G${n}\t${e["def-en"]}`);
}
