#!/usr/bin/env node
/**
 * Build the Strong's + morphology KJV straight from the CrossWire SWORD module
 * "KJV (1769) with Strongs Numbers and Morphology and CatchWords" (v3.1, zText).
 *
 * No SWORD library or diatheke needed — this reads the module's compressed
 * files directly (.bzs block index, .bzv verse index, .bzz zlib blocks), so
 * nothing is filtered out the way a diatheke text export filters morphology.
 *
 *   node scripts/build-kjv-sword.mjs <module root> [--out <dir>]
 *
 *   <module root> = the folder containing mods.d/ and modules/
 *   --out         = output folder (default public/data/bibles/kjv-strong)
 *
 * Example:
 *   node scripts/build-kjv-sword.mjs "C:/Users/saulo/Downloads/KJV (1)"
 *
 * Output (same shape the app already reads, with two new optional token keys):
 *   { b, c, v: { "1": ["verse text", ...] },
 *          w: { "1": [[ {t, s?, m?, g?, it?, r?, dn?}, ... ], ...] } }
 *     t  = English text of the token (punctuation attached)
 *     s  = Strong's number, normalized ("H1254", "G976")
 *     m  = morphology: Robinson code for Greek ("N-NSF", "V-2AAI-3S"),
 *          Strong's verb code for Hebrew ("TH8804" = Qal Perfect) — decoded
 *          for display by src/morph.js
 *     g  = the Greek word as it stands in the Textus Receptus ("γενεσεως")
 *     it = 1 for words the translators supplied (printed in italics in the KJV)
 *     r  = 1 for words of Jesus (red letter)
 *     dn = 1 for the divine name (printed LORD / GOD in small caps)
 *
 * Verse text is kept identical to the previous build: Psalm titles, Psalm 119
 * acrostic headings and the translators' marginal notes are not included.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { normalizeStrong } from "../src/strongsCode.js";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = path.resolve(outIdx >= 0 ? args[outIdx + 1] : "public/data/bibles/kjv-strong");
const root = args.find((a, i) => !a.startsWith("--") && (outIdx < 0 || i !== outIdx + 1));
if (!root) {
  console.error('usage: node scripts/build-kjv-sword.mjs "<SWORD module root>" [--out <dir>]');
  process.exit(1);
}
const dataDir = path.join(root, "modules", "texts", "ztext", "kjv");
if (!fs.existsSync(path.join(dataDir, "ot.bzz"))) {
  console.error(`Can't find ${path.join(dataDir, "ot.bzz")} — point this at the folder that contains mods.d/ and modules/.`);
  process.exit(1);
}

// ------------------------------------------------------------
// zText reader
// ------------------------------------------------------------
// .bzs: per compressed block, 12 bytes = offset u32, compressed size u32, raw size u32
// .bzv: per index entry, 10 bytes  = block u32, offset-in-block u32, size u16
// .bzz: the zlib-compressed blocks (CompressType=ZIP, BlockType=BOOK)
function openTestament(name) {
  const bzs = fs.readFileSync(path.join(dataDir, `${name}.bzs`));
  const bzv = fs.readFileSync(path.join(dataDir, `${name}.bzv`));
  const bzz = fs.readFileSync(path.join(dataDir, `${name}.bzz`));
  const blocks = new Map();
  const block = (i) => {
    if (!blocks.has(i)) {
      const off = bzs.readUInt32LE(i * 12);
      const size = bzs.readUInt32LE(i * 12 + 4);
      blocks.set(i, zlib.inflateSync(bzz.subarray(off, off + size)));
    }
    return blocks.get(i);
  };
  return {
    count: bzv.length / 10,
    entry(i) {
      const size = bzv.readUInt16LE(i * 10 + 8);
      if (!size) return "";
      const b = bzv.readUInt32LE(i * 10);
      const off = bzv.readUInt32LE(i * 10 + 4);
      return block(b).subarray(off, off + size).toString("utf8");
    },
  };
}

// ------------------------------------------------------------
// Walk the index. KJV versification layout per testament:
//   0 = module header, 1 = testament header, then for each book:
//   book header, then for each chapter: chapter header + its verses.
// Book/chapter headers are recognized by their OSIS start tags, and the
// totals are checked against the known KJV counts below.
// ------------------------------------------------------------
const BOOK_START = /<div\b(?=[^>]*\btype="book")(?=[^>]*\bsID=)[^>]*>/;
const CHAPTER_START = /<chapter\b(?=[^>]*\bsID=)[^>]*\bosisID="[^".]+\.(\d+)"[^>]*>/;

const books = new Map(); // bookNum -> Map(chapter -> [raw verse strings])
for (const [name, firstBook] of [["ot", 1], ["nt", 40]]) {
  const t = openTestament(name);
  let bookNum = firstBook - 1;
  let chapter = 0;
  for (let i = 2; i < t.count; i++) {
    const raw = t.entry(i);
    if (BOOK_START.test(raw)) {
      bookNum++;
      chapter = 0;
      books.set(bookNum, new Map());
      continue;
    }
    const ch = raw.match(CHAPTER_START);
    if (ch) {
      chapter = Number(ch[1]);
      books.get(bookNum).set(chapter, []);
      continue;
    }
    books.get(bookNum).get(chapter).push(raw);
  }
}

const nChapters = [...books.values()].reduce((n, b) => n + b.size, 0);
const nVerses = [...books.values()].reduce(
  (n, b) => n + [...b.values()].reduce((m, vs) => m + vs.length, 0), 0);
if (books.size !== 66 || nChapters !== 1189 || nVerses !== 31102) {
  console.error(`Unexpected structure: ${books.size} books, ${nChapters} chapters, ${nVerses} verses (expected 66 / 1189 / 31102).`);
  process.exit(1);
}

// ------------------------------------------------------------
// Tokenize one verse's OSIS
// ------------------------------------------------------------
const HOLLOW = new Set(["G3588", "H853"]); // Greek article / Hebrew object marker

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, "&");
}
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? "";

let redLetter = false; // <q who="Jesus" sID/eID> milestones can span verses

function parseWord(tag) {
  const lemmaParts = attr(tag, "lemma").split(/\s+/).filter(Boolean);
  const strongs = lemmaParts.filter((p) => p.startsWith("strong:")).map((p) => normalizeStrong(p.slice(7)));
  const greek = lemmaParts.filter((p) => p.startsWith("lemma.TR:")).map((p) => p.slice(9));
  const morphs = attr(tag, "morph").split(/\s+/).filter(Boolean)
    .map((p) => (p.includes(":") ? p.slice(p.indexOf(":") + 1) : p));

  if (!strongs.length) return {};
  // Prefer the last content word over the article / object marker, so
  // "the world" (G3588 + G2889) points at G2889 — same rule as before.
  let i = strongs.length - 1;
  for (let k = strongs.length - 1; k >= 0; k--) if (!HOLLOW.has(strongs[k])) { i = k; break; }

  const out = { s: strongs[i] };
  const m = morphs.length === strongs.length ? morphs[i] : morphs.length === 1 ? morphs[0] : undefined;
  if (m) out.m = m;
  const g = greek.length === strongs.length ? greek[i] : greek.length === 1 ? greek[0] : undefined;
  if (g) out.g = g;
  return out;
}

function tokenizeVerse(raw) {
  const clean = raw
    .replace(/<note\b[\s\S]*?<\/note>/g, "")   // marginal notes + catchwords
    .replace(/<title\b[\s\S]*?<\/title>/g, ""); // Psalm titles, acrostic heads

  const tokens = [];
  let italic = 0, divine = 0, word = null; // word = { info, text, it, r, dn }

  const flags = (o, it, r, dn) => {
    if (it) o.it = 1;
    if (r) o.r = 1;
    if (dn) o.dn = 1;
    return o;
  };

  for (const piece of clean.match(/<[^>]+>|[^<]+/g) || []) {
    if (piece[0] !== "<") {
      const text = decodeEntities(piece);
      if (word) {
        word.text += text;
        if (italic) word.it = true;
        if (divine) word.dn = true;
      } else {
        for (const w of text.split(/\s+/)) if (w) tokens.push(flags({ t: w }, italic, redLetter, divine));
      }
      continue;
    }
    const name = piece.match(/^<\/?([A-Za-z]+)/)?.[1];
    const closing = piece.startsWith("</");
    const selfClosing = piece.endsWith("/>");

    if (name === "w") {
      if (closing) {
        if (word) {
          const t = word.text.replace(/\s+/g, " ").trim();
          if (t) tokens.push(flags({ t, ...word.info }, word.it, word.r, word.dn));
        }
        word = null;
      } else if (!selfClosing) {
        // self-closing <w/> = a Greek word with no English rendering: skip
        word = { info: parseWord(piece), text: "", it: italic > 0, r: redLetter, dn: false };
      }
    } else if (name === "transChange") {
      if (closing) italic = Math.max(0, italic - 1);
      else if (!selfClosing) italic++;
    } else if (name === "divineName") {
      if (closing) divine = Math.max(0, divine - 1);
      else if (!selfClosing) divine++;
    } else if (name === "q") {
      const who = attr(piece, "who");
      if (closing) redLetter = false;
      else if (who === "Jesus") redLetter = !attr(piece, "eID");
      else if (attr(piece, "eID") && redLetter && selfClosing) redLetter = false;
    }
  }

  // Fold punctuation-only tokens into the previous token (unchanged rule),
  // and an opening bracket/quote into the token after it, so "(For" stays
  // one word instead of "( For".
  const merged = [];
  let pending = "";
  for (const tok of tokens) {
    if (/^[(\[“‘]+$/.test(tok.t)) {
      pending += tok.t;
    } else if (/^[,.;:!?"'”’)\]]+$/.test(tok.t) && merged.length) {
      const prev = merged[merged.length - 1];
      merged[merged.length - 1] = { ...prev, t: prev.t + tok.t };
    } else {
      merged.push(pending ? { ...tok, t: pending + tok.t } : tok);
      pending = "";
    }
  }
  if (pending) merged.push({ t: pending });
  return merged;
}

function tokensToText(tokens) {
  return tokens.map((t) => t.t).join(" ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+([”’])/g, "$1")
    .replace(/([“‘])\s+/g, "$1")
    .trim();
}

// ------------------------------------------------------------
// Write one JSON file per book
// ------------------------------------------------------------
fs.mkdirSync(outDir, { recursive: true });
let bytes = 0, gz = 0, withMorph = 0, tagged = 0;
for (const [bookNum, chapters] of books) {
  const book = { b: bookNum, c: chapters.size, v: {}, w: {} };
  for (const [ch, verses] of chapters) {
    book.v[ch] = [];
    book.w[ch] = [];
    for (const raw of verses) {
      const tokens = tokenizeVerse(raw);
      for (const t of tokens) { if (t.s) tagged++; if (t.m) withMorph++; }
      book.v[ch].push(tokensToText(tokens));
      book.w[ch].push(tokens);
    }
  }
  const json = JSON.stringify(book);
  fs.writeFileSync(path.join(outDir, `${bookNum}.json`), json);
  bytes += Buffer.byteLength(json);
  gz += zlib.gzipSync(json).length;
}

console.log(`66 books, ${nChapters} chapters, ${nVerses} verses -> ${outDir}`);
console.log(`${tagged.toLocaleString()} Strong's-tagged words, ${withMorph.toLocaleString()} with morphology`);
console.log(`${(bytes / 1048576).toFixed(1)} MB raw, ${(gz / 1048576).toFixed(1)} MB gzipped`);
