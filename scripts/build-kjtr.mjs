#!/usr/bin/env node
/**
 * Greek New Testament for the interlinear and the lexicon search, from the
 * King James Textus Receptus (KJTR) of the Center for New Testament Restoration
 * (Alan Bunning, 2014; CC BY 4.0): the Greek text matching the KJV's English.
 *
 *   node scripts/build-kjtr.mjs [path/to/KJTR.tsv]
 *     (default: ~/Downloads/KJTR-main/KJTR.tsv)
 *
 * Writes (part of the "lexicon" pack, so it is downloaded with the Strong's Bibles):
 *   public/data/strongs/kjtr/<40..66>.json
 *       { "b": 40, "w": { "1": [ [ ["Βίβλος","G976","N-NSF","βίβλος"], … ], … ] } }
 *       per chapter, one array per verse (verse 1 at index 0); each word is
 *       [word as printed, Strong's number or "", Robinson parsing, dictionary form]
 *   public/data/strongs/kjtr/forms.json
 *       { "G1520": [["εἷς",…count],["μία",…],["ἕν",…], …], … } every form of each number
 *
 * KJTR columns: Verse (BBCCCVVV), Modern (word as printed), Koine, Lemma, ESN
 * (extended Strong's: number × 10, + 1–9 for words Strong's lacks), Role, Morphology
 * (CNTR: mood tense voice person case gender number, "." = none). Parsing is turned
 * into the Robinson codes the KJV's tokens use, so src/js/morph.js decodes both.
 * For an ESN that is not a plain Strong's number, the number comes from the KJV's
 * own tag on the same Greek word in that verse, else from the lexicon entry with the
 * same dictionary form; otherwise the word is left without a number.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { foldGreek } from "../src/js/greekTranslit.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC_FILE = process.argv[2] || path.join(os.homedir(), "Downloads", "KJTR-main", "KJTR.tsv");
const OUT = path.join(ROOT, "public", "data", "strongs", "kjtr");
const KJV = path.join(ROOT, "public", "data", "bibles", "kjv-strong");

if (!fs.existsSync(SRC_FILE)) {
  console.error(`Not found: ${SRC_FILE}\nUsage: node scripts/build-kjtr.mjs path/to/KJTR.tsv`);
  process.exit(1);
}

/* ---------- lexicon: number -> dictionary form, and the reverse ---------- */
const index = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "data", "strongs", "index.json"), "utf8"));
const lexLemma = new Map(); // "G1520" -> "εἷς"
const byLemma = new Map(); // folded "εισ" -> "G1520"
for (const [code, gr] of index) {
  if (code[0] !== "G") continue;
  lexLemma.set(code, gr);
  const f = foldGreek(gr);
  if (!byLemma.has(f)) byLemma.set(f, code);
}

/* ---------- parsing: CNTR -> Robinson ---------- */
const TENSE = { P: "P", I: "I", F: "F", A: "A", E: "R", L: "L", U: "R" };
const PRONOUN = {
  "ἐγώ": "P1", "σύ": "P2", "κἀγώ": "P1", "ἡμεῖς": "P1", "ὑμεῖς": "P2",
  "αὐτός": "P", "ταὐτά": "P",
  "ὅς": "R", "ὅστις": "R", "ὅσπερ": "R",
  "οὗτος": "D", "ἐκεῖνος": "D", "κἀκεῖνος": "D", "ὅδε": "D", "τοιόσδε": "D", "τηλικοῦτος": "D",
  "ὅσος": "K", "οἷος": "K", "τοσοῦτος": "K", "τοιοῦτος": "K", "ὁποῖος": "K",
  "πόσος": "Q", "ποῖος": "Q", "ποταπός": "Q",
  "τίς": "I", "τὶς": "X", "τις": "X",
  "ἑαυτοῦ": "F3", "σεαυτοῦ": "F2", "ἐμαυτοῦ": "F1",
  "ἀλλήλων": "C",
  "ἐμός": "S1S", "σός": "S2S", "ἡμέτερος": "S1P", "ὑμέτερος": "S2P",
  "ὁ": "T",
  "οὐδείς": "A", "μηδείς": "A", "ἄλλος": "A", "ἕτερος": "A", "ἴδιος": "A",
  "ὅπου": "ADV", "οὗ": "ADV",
};

function robinson(role, m, lemma) {
  const [mood, tense, voice, person, cas, gen, num] = m.split("");
  const has = (c) => c && c !== ".";
  const cng = has(cas) ? `${cas}${has(num) ? num : ""}${has(gen) ? gen : ""}` : "";
  switch (role) {
    case "V": {
      if (!has(mood)) return "V";
      const tvm = `${TENSE[tense] || tense}${voice}${mood}`;
      if (mood === "P") return `V-${tvm}-${cas}${num}${gen}`;
      if (mood === "N") return `V-${tvm}`;
      return `V-${tvm}-${person}${num}`;
    }
    case "N":
      return cng ? `N-${cng}` : "N-PRI";
    case "A":
    case "S":
      return cng ? `A-${cng}` : "A-NUI";
    case "E":
      return cng ? `T-${cng}` : "T";
    case "R": {
      const k = PRONOUN[lemma] || "P";
      if (k === "ADV") return "ADV";
      if (k === "P1" || k === "P2") return `P-${k[1]}${cas}${num}`;
      if (k[0] === "F") return `F-${k[1]}${cng}`;
      if (k[0] === "S") return `S-${k.slice(1)}${cng}`;
      if (k === "P" && has(person) && person !== "3") return `P-${person}${cas}${num}`;
      return cng ? `${k}-${cng}` : k;
    }
    case "C":
      return "CONJ";
    case "P":
      return "PREP";
    case "D":
      return "ADV";
    case "I":
      return "INJ";
    case "T":
      return "PRT";
    default:
      return "";
  }
}

/* ---------- read ---------- */
const lines = fs.readFileSync(SRC_FILE, "utf8").replace(/^﻿/, "").split(/\r?\n/);
const head = lines.shift().split("\t");
const col = (name) => head.indexOf(name);
const [cV, cMod, cKoine, cLem, cEsn, cRole, cMorph] = ["Verse", "Modern", "Koine", "Lemma", "ESN", "Role", "Morphology"].map(col);
if ([cV, cMod, cLem, cEsn, cRole, cMorph].some((i) => i < 0)) throw new Error(`Unexpected columns: ${head}`);

const books = new Map(); // n -> { ch -> [verse arrays] }
const kjvCache = new Map();
const kjvVerse = (b, c, v) => {
  if (!kjvCache.has(b)) {
    const f = path.join(KJV, `${b}.json`);
    kjvCache.set(b, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).w || {} : {});
  }
  return kjvCache.get(b)[c]?.[v - 1] || [];
};

let words = 0;
let viaKjv = 0;
let viaLemma = 0;
let none = 0;
let mismatch = 0;
for (const line of lines) {
  if (!line.trim()) continue;
  const f = line.split("\t");
  const ref = f[cV];
  const b = +ref.slice(0, 2);
  const c = +ref.slice(2, 5);
  const v = +ref.slice(5, 8);
  // ¶ = paragraph; ⋄ = where another edition starts a verse (handled below)
  const raw = f[cMod].replace(/¶/g, "").trim();
  const split = raw.startsWith("⋄");
  const word = raw.replace(/⋄/g, "");
  if (!word) continue;
  const lemma = f[cLem];
  const esn = parseInt(f[cEsn], 10);
  let code = "";
  if (esn % 10 === 0) {
    code = `G${esn / 10}`;
    if (!lexLemma.has(code)) code = "";
  }
  if (!code) {
    // Not a plain Strong's number: the KJV's tag on this word, else the lexicon form.
    const bare = foldGreek(word.replace(/[^\p{L}\p{M}]/gu, ""));
    const tok = kjvVerse(b, c, v).find((t) => t.s && t.g && foldGreek(t.g) === bare);
    if (tok) {
      code = tok.s.replace(/^G0*/, "G");
      viaKjv++;
    } else if (byLemma.has(foldGreek(lemma))) {
      code = byLemma.get(foldGreek(lemma));
      viaLemma++;
    } else none++;
  } else if (foldGreek(lexLemma.get(code)) !== foldGreek(lemma)) mismatch++;
  const morph = robinson(f[cRole], f[cMorph] || ".......", lemma);
  if (!books.has(b)) books.set(b, {});
  const chs = books.get(b);
  (chs[c] ||= []);
  while (chs[c].length < v) chs[c].push([]);
  const w = [word, code, morph, lemma];
  if (split) w.split = true;
  chs[c][v - 1].push(w);
  words++;
}

/* ---------- KJV verse divisions ----------
 * KJTR numbers verses as the KJV does except in four places, where it follows
 * another division; there the ⋄ mark shows where the KJV's verse begins. */
const at = (b, c) => books.get(b)[c];
const cut = (verse) => {
  const i = verse.findIndex((w) => w.split);
  return i > 0 ? [verse.slice(0, i), verse.slice(i)] : [verse, []];
};
{
  // Acts 19:40 "…λόγον τῆς συστροφῆς ταύτης. ⋄Καί ταῦτα εἰπὼν…" -> 19:40 | 19:41
  const ch = at(44, 19);
  const [a, b] = cut(ch[39]);
  ch.splice(39, 1, a, b);
}
{
  // 2 Cor 13:12 "…φιλήματι. ⋄Ἀσπάζονται…" -> 13:12 | 13:13; KJTR 13:13 -> KJV 13:14
  const ch = at(47, 13);
  const [a, b] = cut(ch[11]);
  ch.splice(11, 1, a, b);
}
{
  // 3 John 15 "Εἰρήνῃ σοί…" is the end of KJV 3 John 14
  const ch = at(64, 1);
  ch[13].push(...ch.pop());
}
{
  // Rev 12:18 "Καὶ ἐστάθην ἐπὶ τὴν ἄμμον…" is the start of KJV 13:1 ("And I stood upon the sand")
  const v18 = at(66, 12).pop();
  at(66, 13)[0].unshift(...v18);
}
for (const chs of books.values())
  for (const verses of Object.values(chs)) for (const verse of verses) for (const w of verse) delete w.split;

/* ---------- write ---------- */
fs.mkdirSync(OUT, { recursive: true });
const forms = new Map(); // code -> Map(form -> count)
for (const [b, chs] of books) {
  for (const verses of Object.values(chs))
    for (const verse of verses)
      for (const [word, code, , lemma] of verse) {
        if (!code) continue;
        // grave -> acute (ἓν and ἕν are one form)
        let form = word.replace(/[^\p{L}\p{M}]/gu, "").normalize("NFD").replace(/\u0300/g, "\u0301").normalize("NFC");
        // lower case unless it is a name (dictionary form capitalised)
        if (lemma[0] === lemma[0].toLowerCase()) form = form.toLowerCase();
        if (!forms.has(code)) forms.set(code, new Map());
        const m = forms.get(code);
        m.set(form, (m.get(form) || 0) + 1);
      }
  // One verse per line keeps the files readable and diffs small.
  const body = Object.entries(chs)
    .map(
      ([c, verses]) =>
        `${JSON.stringify(c)}:[\n${verses.map((vv) => JSON.stringify(vv)).join(",\n")}\n]`,
    )
    .join(",\n");
  fs.writeFileSync(path.join(OUT, `${b}.json`), `{"b":${b},"w":{\n${body}\n}}\n`);
}
const formsOut = {};
for (const [code, m] of [...forms].sort((a, b) => +a[0].slice(1) - +b[0].slice(1)))
  formsOut[code] = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
fs.writeFileSync(
  path.join(OUT, "forms.json"),
  "{\n" + Object.entries(formsOut).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(",\n") + "\n}\n",
);
console.log(
  `KJTR: ${words} words in ${books.size} books -> public/data/strongs/kjtr/; ` +
    `${forms.size} Strong's numbers, ${[...forms.values()].reduce((s, m) => s + m.size, 0)} forms. ` +
    `Numbers from the KJV tag: ${viaKjv}, from the dictionary form: ${viaLemma}, none: ${none}; ` +
    `plain numbers whose lexicon form differs: ${mismatch}.`,
);
