#!/usr/bin/env node
/**
 * Hebrew (and Aramaic) Old Testament for the interlinear and the lexicon search,
 * from the Open Scriptures Hebrew Bible (OSHB): the Westminster Leningrad Codex
 * with Strong's numbers and morphology (CC BY 4.0, https://github.com/openscriptures/morphhb),
 * already in sources/oshb/wlc (also used by scripts/oshb/apply-oshb.mjs).
 *
 *   node scripts/build-oshb-interlinear.mjs
 *
 * Writes (part of the "lexicon" pack):
 *   public/data/strongs/oshb/<1..39>.json
 *       { "b": 1, "w": { "1": [ [ ["בְּרֵאשִׁית","H7225","HR/Ncfsa","רֵאשִׁית"], … ], … ] } }
 *       KJV chapter/verse numbers (WLC numbers converted with wlc/VerseMap.xml); each word:
 *       [word with its vowels (no accents), Strong's number of its main part or "",
 *        OSHB morphology, the main part alone when the word has prefixes]
 *   public/data/strongs/oshb/forms.json
 *       { "H430": [["אֱלֹהִים",2600], …], … } every form of each number (the main part,
 *       and the whole word when it has prefixes: "הַשָּׁמַיִם" and "שָׁמַיִם")
 *
 * Where the KJV reads the margin (qere), the qere is shown instead of the written
 * text (ketiv), as the KJV translates it. A WLC verse the KJV has no number for
 * (most Psalm titles) goes at the start of the next verse, where the KJV prints it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WLC = path.join(ROOT, "sources", "oshb", "wlc");
const OUT = path.join(ROOT, "public", "data", "strongs", "oshb");
const KJV = path.join(ROOT, "public", "data", "bibles", "kjv-strong");
const OSIS = ["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
  "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek",
  "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal"];

// KJV ref -> WLC refs (only those that differ are listed); as in apply-oshb.mjs
const vm = fs.readFileSync(path.join(WLC, "VerseMap.xml"), "utf8");
const kjv2wlc = new Map();
for (const m of vm.matchAll(/<verse wlc="([^"]+)" kjv="([^"]+)" type="(\w+)"/g)) {
  const w = m[1].replace(/!.*/, "");
  const k = m[2].replace(/!.*/, "");
  if (!kjv2wlc.has(k)) kjv2wlc.set(k, []);
  if (!kjv2wlc.get(k).includes(w)) kjv2wlc.get(k).push(w);
  if (m[3] === "partial" && !kjv2wlc.get(k).includes(k)) kjv2wlc.get(k).push(k);
}

// vowels and letters only: no accents, meteg, paseq, sof pasuq; "/" = morpheme break
const clean = (s) => s.replace(/[\u0591-\u05AF\u05BD\u05C0\u05C3-\u05C6]|\u034F/g, "").normalize("NFC");
const numOf = (part) => {
  const n = parseInt(part, 10);
  return Number.isFinite(n) && n > 0 ? `H${n}` : "";
};

function wlcBook(n) {
  const xml = fs.readFileSync(path.join(WLC, `${OSIS[n - 1]}.xml`), "utf8");
  const verses = new Map();
  for (const v of xml.matchAll(/<verse osisID="([^"]+)">([\s\S]*?)<\/verse>/g)) {
    const words = [];
    for (const w of v[2].matchAll(/<w ([^>]*)>([^<]*)<\/w>/g)) {
      const a = Object.fromEntries([...w[1].matchAll(/(\w+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
      if (a.type === "x-ketiv") continue; // the KJV follows the qere (in the note that follows)
      const parts = clean(w[2]).split("/");
      const lemmas = (a.lemma || "").split("/");
      const at = lemmas.findIndex((l) => numOf(l));
      const code = at >= 0 ? numOf(lemmas[at]) : "";
      const word = parts.join("");
      const main = at >= 0 && parts.length === lemmas.length ? parts[at] : word;
      const row = [word, code, a.morph || ""];
      if (main !== word) row.push(main);
      words.push(row);
    }
    verses.set(v[1], words);
  }
  return verses;
}

fs.mkdirSync(OUT, { recursive: true });
const forms = new Map();
const count = (code, f) => {
  if (!code || !f) return;
  if (!forms.has(code)) forms.set(code, new Map());
  const m = forms.get(code);
  m.set(f, (m.get(f) || 0) + 1);
};
let total = 0;
let empty = 0;
for (let n = 1; n <= 39; n++) {
  const wlc = wlcBook(n);
  const kjv = JSON.parse(fs.readFileSync(path.join(KJV, `${n}.json`), "utf8")).v;
  const out = {};
  const refsOf = (ref) => kjv2wlc.get(ref) || [ref];
  // WLC verses no KJV verse takes (Psalm titles): read with the WLC verse after them
  const used = new Set();
  for (const [c, verses] of Object.entries(kjv))
    verses.forEach((_, i) => refsOf(`${OSIS[n - 1]}.${c}.${i + 1}`).forEach((r) => used.add(r)));
  const before = new Map(); // WLC ref -> unused WLC refs to put in front of it
  for (const r of wlc.keys()) {
    if (used.has(r)) continue;
    const [b, c, v] = r.split(".");
    const next = `${b}.${c}.${+v + 1}`;
    if (!before.has(next)) before.set(next, []);
    before.get(next).push(r);
  }
  const withTitles = (r) => [...(before.get(r) || []), r];
  for (const [c, verses] of Object.entries(kjv)) {
    out[c] = verses.map((_, i) => {
      const ref = `${OSIS[n - 1]}.${c}.${i + 1}`;
      const words = refsOf(ref).flatMap(withTitles).flatMap((r) => wlc.get(r) || []);
      if (!words.length) empty++;
      for (const w of words) {
        count(w[1], w[3] || w[0]);
        if (w[3]) count(w[1], w[0]);
      }
      total += words.length;
      return words;
    });
  }
  const body = Object.entries(out)
    .map(([c, verses]) => `${JSON.stringify(c)}:[\n${verses.map((vv) => JSON.stringify(vv)).join(",\n")}\n]`)
    .join(",\n");
  fs.writeFileSync(path.join(OUT, `${n}.json`), `{"b":${n},"w":{\n${body}\n}}\n`);
}
const sorted = [...forms].sort((a, b) => +a[0].slice(1) - +b[0].slice(1));
fs.writeFileSync(
  path.join(OUT, "forms.json"),
  "{\n" +
    sorted
      .map(([k, m]) => `${JSON.stringify(k)}:${JSON.stringify([...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))}`)
      .join(",\n") +
    "\n}\n",
);
console.log(
  `OSHB: ${total} words in 39 books -> public/data/strongs/oshb/; ${forms.size} Strong's numbers, ` +
    `${sorted.reduce((s, [, m]) => s + m.size, 0)} forms; KJV verses with no Hebrew: ${empty}.`,
);
