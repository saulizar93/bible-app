#!/usr/bin/env node
/**
 * Data for the "Hebrew & Greek Lexicon" search (src/components/LexiconPanel):
 *
 *  1. public/data/strongs/index.json
 *       [["G1577","ἐκκλησία","ekklēsía"], ...] — every lexicon entry's number,
 *       original word and transliteration, small enough to search on the phone.
 *  2. <concordance folder>/{greek,hebrew}/renderings.json for every tagged Bible
 *       { "G1577": [["church",77],["churches",36],["assembly",3]], ... } —
 *       how that Bible translates each number, and how often.
 *
 *   node scripts/build-lexicon-search.mjs          rebuild everything
 *   node scripts/build-lexicon-search.mjs rvg-strong   only one Bible's renderings
 *
 * build-concordance.mjs also rewrites a Bible's renderings, so retagging a Bible
 * and rebuilding its concordance keeps them in step. Run this script after editing
 * the lexicon's words or transliterations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeStrong } from "../src/js/strongsCode.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA = path.join(ROOT, "public", "data");

/** Tagged Bibles and their concordance folder (must match PANE_OPTIONS[].concord in data.js;
 *  lsv-strong shares the KJV's). */
export const TAGGED = {
  "kjv-strong": "",
  "bsb-strong": "bsb-strong",
  "msb-strong": "msb-strong",
  "rv1909-strong": "rv1909-strong",
  "rvg-strong": "rvg-strong",
  "rvo-strong": "rvo-strong",
  "straubinger-strong": "straubinger-strong",
};

/** "Iglesia," -> "iglesia"; "(the church)" -> "the church". */
const clean = (t) =>
  String(t)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[¶¿¡()«»“”"\[\].,;:!?·]/g, " ")
    .replace(/(^|\s)'+|'+(?=\s|$)/g, " ") // quote marks, but keep "lord's"
    .replace(/\s+/g, " ")
    .trim();

// Articles, prepositions and possessives the tag often includes ("of the church",
// "de la iglesia") are dropped from the front, so the renderings group by the word
// itself ("church", "iglesia"). A token made only of such words is kept as it is.
const LEAD = new Set(
  ("the a an of to unto in into on upon by for from with and or but that which who whom " +
    "his her its their my thy your our me him them us thee you " +
    "el la lo los las un una unos unas de del a al en y e o u que con por para sin sobre " +
    "su sus mi mis tu tus nuestro nuestra nuestros nuestras vuestro vuestra vuestros vuestras se le les")
    .split(" "),
);
const core = (w) => {
  const parts = w.split(" ");
  let i = 0;
  while (i < parts.length - 1 && LEAD.has(parts[i])) i++;
  return parts.slice(i).join(" ");
};

/** Count how a tagged Bible renders each Strong's number; write renderings.json. */
export function buildRenderings(bibleDir, outRoot) {
  const counts = new Map(); // code -> Map(word -> n)
  for (const file of fs.readdirSync(bibleDir)) {
    if (!/^\d+\.json$/.test(file)) continue;
    const data = JSON.parse(fs.readFileSync(path.join(bibleDir, file), "utf8"));
    if (!data.w) continue;
    for (const verses of Object.values(data.w))
      for (const tokens of verses)
        for (const tok of tokens || []) {
          const code = normalizeStrong(tok.s);
          if (!code || !/^[GH]\d+$/.test(code)) continue;
          const w = core(clean(tok.t));
          if (!w) continue;
          if (!counts.has(code)) counts.set(code, new Map());
          const m = counts.get(code);
          m.set(w, (m.get(w) || 0) + 1);
        }
  }
  for (const [lang, prefix] of [["greek", "G"], ["hebrew", "H"]]) {
    const out = {};
    for (const [code, m] of counts)
      if (code[0] === prefix) {
        let list = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        // a lone "the" / "de" tagged with a noun's number is not a rendering of it
        const real = list.filter(([w]) => !LEAD.has(w));
        if (real.length) list = real;
        out[code] = list;
      }
    const dir = path.join(outRoot, lang);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "renderings.json"), JSON.stringify(out));
  }
  return counts.size;
}

function buildIndex() {
  const rows = [];
  for (const lang of ["greek", "hebrew"]) {
    const dir = path.join(DATA, "strongs", lang);
    for (const f of fs.readdirSync(dir)) {
      if (!/^\d+\.json$/.test(f)) continue;
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      for (const [code, e] of Object.entries(d)) rows.push([code, e.gr || "", e.tr || ""]);
    }
  }
  rows.sort((a, b) => a[0][0].localeCompare(b[0][0]) || parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)));
  fs.writeFileSync(path.join(DATA, "strongs", "index.json"), JSON.stringify(rows));
  return rows.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const only = process.argv.slice(2);
  if (!only.length) console.log(`index.json: ${buildIndex()} entries`);
  for (const [bible, dir] of Object.entries(TAGGED)) {
    if (only.length && !only.includes(bible)) continue;
    const src = path.join(DATA, "bibles", bible);
    if (!fs.existsSync(src)) continue;
    const n = buildRenderings(src, path.join(DATA, "concord", dir));
    console.log(`${bible}: renderings for ${n} numbers -> concord/${dir ? dir + "/" : ""}{greek,hebrew}/renderings.json`);
  }
}
