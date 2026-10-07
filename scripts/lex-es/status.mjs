import fs from "node:fs";
const dir = new URL("../../public/data/strongs/greek/", import.meta.url);
const PH = "Definición en español llegará pronto.";
let todo = 0, done = 0, first = null;
const all = {};
for (const f of fs.readdirSync(dir)) Object.assign(all, JSON.parse(fs.readFileSync(new URL(f, dir))));
for (const k of Object.keys(all).sort((a, b) => a.slice(1) - b.slice(1))) {
  const e = all[k]; if (!e["def-en"]) continue;
  if (e["def-es"] && e["def-es"] !== PH) done++; else { todo++; first ??= k; }
}
console.log({ done, todo, next: first });
