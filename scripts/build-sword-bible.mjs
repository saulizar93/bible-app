#!/usr/bin/env node
/**
 * Build a Strong's-tagged Bible straight from a CrossWire SWORD module (zText,
 * OSIS markup), e.g.
 *   - "KJV (1769) with Strongs Numbers and Morphology and CatchWords" (v3.1)
 *   - "Reina-Valera 1909 con números de Strong" (SpaRV1909, enciphered)
 *
 * No SWORD library or diatheke needed — this reads the module's .conf and its
 * compressed files directly (.bzs block index, .bzv verse index, .bzz zlib
 * blocks, deciphered first when the .conf has a CipherKey), so nothing is
 * filtered out the way a diatheke text export filters morphology.
 *
 *   node scripts/build-sword-bible.mjs <module root> --out <dir>
 *
 *   <module root> = the unzipped module: the folder containing mods.d/ and modules/
 *   --out         = output folder (default public/data/bibles/kjv-strong)
 *   --keep-titles = keep Psalm titles (inline at the start of verse 1, as most
 *                   Spanish editions print them). Default: dropped, as in the KJV data.
 *                   Section headings, book introductions and footnotes are always dropped.
 *   --vulg-psalms = the module uses Vulgate Psalm numbering (Versification=Vulg):
 *                   renumber to the Hebrew/English chapters the rest of the app uses
 *                   (Vulg 9 -> 9+10, 10-112 -> 11-113, 113 -> 114+115, 114+115 -> 116,
 *                   116-145 -> 117-146, 146+147 -> 147), then merge a title counted
 *                   as its own verse into verse 1 so verse numbers match the KJV.
 *
 * Books are matched by OSIS name (Gen, Exod, ... Rev). Books the app doesn't
 * have (deuterocanonical: Tob, Jdt, Wis, Sir, Bar, 1Macc, 2Macc) are skipped.
 * Modules without Strong's tags are written as plain text ({ b, c, v } only).
 *
 * Examples:
 *   node scripts/build-sword-bible.mjs "C:/Users/saulo/Downloads/KJV (1)" --out public/data/bibles/kjv-strong
 *   node scripts/build-sword-bible.mjs "C:/Users/saulo/Downloads/SpaRV1909" --out public/data/bibles/rv1909-strong
 *
 * Output (same shape the app already reads, with two new optional token keys):
 *   { b, c, v: { "1": ["verse text", ...] },
 *          w: { "1": [[ {t, s?, m?, g?, it?, r?, dn?}, ... ], ...] } }
 *     t  = English text of the token (punctuation attached)
 *     s  = Strong's number, normalized ("H1254", "G976")
 *     m  = morphology: Robinson code for Greek ("N-NSF", "V-2AAI-3S"),
 *          Strong's verb code for Hebrew ("TH8804" = Qal Perfect) — decoded
 *          for display by src/js/morph.js
 *     g  = the Greek word as it stands in the Textus Receptus ("γενεσεως")
 *     it = 1 for words the translators supplied (printed in italics in the KJV)
 *     r  = 1 for words of Jesus (red letter)
 *     dn = 1 for the divine name (printed LORD / GOD in small caps)
 *     j  = 1 when the source has no space before this token (a tag boundary
 *          inside a word: "Gessur" + "i", "Beth-baal" + "-meón")
 *
 * Verse text is kept identical to the previous build: Psalm titles, Psalm 119
 * acrostic headings and the translators' marginal notes are not included.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { normalizeStrong } from "../src/js/strongsCode.js";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = path.resolve(outIdx >= 0 ? args[outIdx + 1] : "public/data/bibles/kjv-strong");
const root = args.find((a, i) => !a.startsWith("--") && (outIdx < 0 || i !== outIdx + 1));
if (!root) {
  console.error('usage: node scripts/build-sword-bible.mjs "<SWORD module root>" [--out <dir>]');
  process.exit(1);
}

// ------------------------------------------------------------
// Module .conf: where the data lives, and the cipher key if any
// ------------------------------------------------------------
const confDir = path.join(root, "mods.d");
const confFile = fs.existsSync(confDir) && fs.readdirSync(confDir).find((f) => f.endsWith(".conf"));
if (!confFile) {
  console.error(`No .conf file in ${confDir} — point this at the unzipped module folder that contains mods.d/ and modules/.`);
  process.exit(1);
}
const conf = Object.fromEntries(
  fs.readFileSync(path.join(confDir, confFile), "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Za-z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
if (conf.ModDrv && conf.ModDrv.toLowerCase() !== "ztext") {
  console.error(`Unsupported module driver ${conf.ModDrv} (only zText).`);
  process.exit(1);
}
const dataDir = path.join(root, conf.DataPath || "");
if (!fs.existsSync(path.join(dataDir, "ot.bzz"))) {
  console.error(`Can't find ${path.join(dataDir, "ot.bzz")} — check DataPath in ${confFile}.`);
  process.exit(1);
}
const cipherKey = conf.CipherKey || "";
const keepTitles = args.includes("--keep-titles");
const vulgPsalms = args.includes("--vulg-psalms");
const kjvVersification = !conf.Versification || conf.Versification === "KJV";

// OSIS book names in the app's canonical order (index + 1 = book number).
const OSIS_BOOKS = ("Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job " +
  "Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal " +
  "Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb " +
  "Jas 1Pet 2Pet 1John 2John 3John Jude Rev").split(" ");
const BOOK_NUM = new Map(OSIS_BOOKS.map((id, i) => [id, i + 1]));
console.log(`${conf.Description || confFile}${cipherKey ? " (enciphered)" : ""}`);

// ------------------------------------------------------------
// Sapphire II stream cipher (SWORD's sapphire.cpp). Enciphered modules
// ship their key in the .conf; each compressed block is deciphered with a
// freshly keyed cipher before it is inflated.
// ------------------------------------------------------------
function decipher(buf, key) {
  const k = Buffer.from(key, "latin1");
  const c = new Uint8Array(256);
  for (let i = 0; i < 256; i++) c[i] = i;
  let rsum = 0, keypos = 0;
  const keyrand = (limit) => {
    if (!limit) return 0;
    let retry = 0, mask = 1, u;
    while (mask < limit) mask = (mask << 1) + 1;
    do {
      rsum = (c[rsum] + k[keypos++]) & 255;
      if (keypos >= k.length) { keypos = 0; rsum = (rsum + k.length) & 255; }
      u = mask & rsum;
      if (++retry > 11) u %= limit;
    } while (u > limit);
    return u;
  };
  for (let i = 255; i >= 1; i--) {
    const t = keyrand(i);
    const s = c[i]; c[i] = c[t]; c[t] = s;
  }
  let rotor = c[1], ratchet = c[3], avalanche = c[5], lastPlain = c[7], lastCipher = c[rsum];
  const out = Buffer.alloc(buf.length);
  for (let j = 0; j < buf.length; j++) {
    ratchet = (ratchet + c[rotor]) & 255;
    rotor = (rotor + 1) & 255;
    const s = c[lastCipher];
    c[lastCipher] = c[ratchet]; c[ratchet] = c[lastPlain]; c[lastPlain] = c[rotor]; c[rotor] = s;
    avalanche = (avalanche + c[s]) & 255;
    lastPlain = buf[j] ^ c[(c[ratchet] + c[rotor]) & 255] ^ c[c[(c[lastPlain] + c[lastCipher] + c[avalanche]) & 255]];
    lastCipher = buf[j];
    out[j] = lastPlain;
  }
  return out;
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
      const raw = bzz.subarray(off, off + size);
      blocks.set(i, zlib.inflateSync(cipherKey ? decipher(raw, cipherKey) : raw));
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
const BOOK_START = /<div\b(?=[^>]*\btype="book")(?=[^>]*\bsID=)[^>]*\bosisID="([^"]+)"[^>]*>/;
const CHAPTER_START = /<chapter\b(?=[^>]*\bsID=)[^>]*\bosisID="[^".]+\.(\d+)"[^>]*>/;

const books = new Map(); // bookNum -> Map(chapter -> [raw verse strings])
const skipped = [];
for (const name of ["ot", "nt"]) {
  const t = openTestament(name);
  let bookNum = null; // null = a book the app doesn't have (skip its entries)
  let chapter = 0;
  for (let i = 2; i < t.count; i++) {
    const raw = t.entry(i);
    const bk = raw.match(BOOK_START);
    if (bk) {
      bookNum = BOOK_NUM.get(bk[1]) ?? null;
      if (bookNum) books.set(bookNum, new Map());
      else skipped.push(bk[1]);
      chapter = 0;
      continue;
    }
    const ch = raw.match(CHAPTER_START);
    if (ch) {
      chapter = Number(ch[1]);
      if (bookNum) books.get(bookNum).set(chapter, []);
      continue;
    }
    if (bookNum && chapter) books.get(bookNum).get(chapter).push(raw);
  }
}

// Non-KJV versifications (e.g. Vulg) have slots past the end of the translated
// text: drop trailing empty verses there. KJV-versified modules keep their empty
// slots so verse numbers stay fixed (RV1909 leaves a few KJV verses blank).
if (!kjvVersification) for (const chapters of books.values()) {
  for (const verses of chapters.values()) {
    while (verses.length && !verses[verses.length - 1].replace(/<[^>]+>/g, "").trim()) verses.pop();
  }
}

if (vulgPsalms && books.has(19)) books.set(19, renumberVulgatePsalms(books.get(19)));

/** Vulgate -> Hebrew/English Psalm chapters (module verses are Hebrew-numbered). */
function renumberVulgatePsalms(vulg) {
  const v = (c) => vulg.get(c) || [];
  const out = new Map();
  for (let c = 1; c <= 8; c++) out.set(c, v(c));
  out.set(9, v(9).slice(0, 21));
  out.set(10, v(9).slice(21));
  for (let c = 10; c <= 112; c++) out.set(c + 1, v(c));
  out.set(114, v(113).slice(0, 8));
  out.set(115, v(113).slice(8));
  out.set(116, [...v(114), ...v(115)]);
  for (let c = 116; c <= 145; c++) out.set(c + 1, v(c));
  out.set(147, [...v(146), ...v(147)]);
  for (let c = 148; c <= 150; c++) out.set(c, v(c));
  return new Map([...out].sort((a, b) => a[0] - b[0]));
}

/** Hebrew numbering counts a Psalm's title as verse 1 (sometimes 1–2); the
 *  English numbering the app uses doesn't. Merge those leading title verses
 *  into verse 1 — `extra` = how many verses this psalm has beyond the English count. */
const ENGLISH_PSALM_VERSES = [6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6];

const nChapters = [...books.values()].reduce((n, b) => n + b.size, 0);
const nVerses = [...books.values()].reduce(
  (n, b) => n + [...b.values()].reduce((m, vs) => m + vs.length, 0), 0);
if (kjvVersification && (books.size !== 66 || nChapters !== 1189 || nVerses !== 31102)) {
  console.error(`Unexpected structure: ${books.size} books, ${nChapters} chapters, ${nVerses} verses (expected 66 / 1189 / 31102).`);
  process.exit(1);
}
if (books.size !== 66) {
  console.error(`Only ${books.size} of the 66 books were found.`);
  process.exit(1);
}
if (skipped.length) console.log(`Skipped (not in the app): ${[...new Set(skipped)].join(", ")}`);

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
const BLOCK_TAGS = new Set(["l", "lg", "p", "div", "milestone", "chapter", "lb", "closer", "title", "list", "item"]);

function parseWord(tag) {
  const lemmaParts = attr(tag, "lemma").split(/\s+/).filter(Boolean);
  // "strong:H0430" (KJV) / "Strong:H0430" (RV1909) — prefix case varies by module
  const strongs = lemmaParts.filter((p) => /^strong:/i.test(p)).map((p) => normalizeStrong(p.slice(7)));
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
  let clean = raw.replace(/<note\b[\s\S]*?<\/note>/g, ""); // marginal notes + catchwords
  // Psalm titles (no type, or type="psalm") are kept only with --keep-titles;
  // section headings (x-s), major headings (x-ms), acrostic heads etc. never are.
  clean = clean.replace(/<title\b([^>]*)>([\s\S]*?)<\/title>/g, (all, attrs, inner) => {
    const type = attrs.match(/\btype="([^"]*)"/)?.[1];
    return keepTitles && (!type || type === "psalm") ? `${inner} ` : " ";
  });

  const tokens = [];
  let italic = 0, divine = 0, word = null; // word = { info, text, it, r, dn, j }
  let spaced = true; // whitespace seen since the last token (or start of verse)

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
        for (const part of text.match(/\s+|\S+/g) || []) {
          if (/^\s/.test(part)) { spaced = true; continue; }
          const tok = flags({ t: part }, italic, redLetter, divine);
          if (!spaced && tokens.length) tok.j = 1;
          tokens.push(tok);
          spaced = false;
        }
      }
      continue;
    }
    const name = piece.match(/^<\/?([A-Za-z]+)/)?.[1];
    const closing = piece.startsWith("</");
    const selfClosing = piece.endsWith("/>");
    // Block-level markup (poetry lines, paragraphs, milestones) separates words
    // even when the source has no whitespace there.
    if (BLOCK_TAGS.has(name) && !word) spaced = true;

    if (name === "w") {
      if (closing) {
        if (word) {
          const t = word.text.replace(/\s+/g, " ").trim();
          if (t) {
            const tok = flags({ t, ...word.info }, word.it, word.r, word.dn);
            if (word.j) tok.j = 1;
            tokens.push(tok);
            spaced = /\s$/.test(word.text);
          }
        }
        word = null;
      } else if (!selfClosing) {
        // self-closing <w/> = a Greek word with no English rendering: skip
        word = { info: parseWord(piece), text: "", it: italic > 0, r: redLetter, dn: false,
                 j: !spaced && tokens.length > 0 };
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
  // and an opening bracket/quote/¿/¡ into the token after it, so "(For" and
  // "¿Quién" stay one word instead of "( For" / "¿ Quién".
  const merged = [];
  let pending = "";
  for (const tok of tokens) {
    if (/^[(\[“‘¿¡«]+$/.test(tok.t)) {
      pending += tok.t;
    } else if (/^[,.;:!?"'”’)\]»]+$/.test(tok.t) && merged.length) {
      const prev = merged[merged.length - 1];
      merged[merged.length - 1] = { ...prev, t: prev.t + tok.t };
    } else {
      const next = pending ? { ...tok, t: pending + tok.t } : { ...tok };
      if (pending) delete next.j; // "¿" + "Quién": the space (if any) belongs before "¿"
      merged.push(next);
      pending = "";
    }
  }
  if (pending) merged.push({ t: pending });
  return merged;
}

function tokensToText(tokens) {
  return tokens.map((t, i) => (i && !t.j ? " " : "") + t.t).join("")
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
const psalmMerges = [];
for (const [bookNum, chapters] of books) {
  const book = { b: bookNum, c: chapters.size, v: {}, w: {} };
  let bookTagged = false;
  for (const [ch, verses] of chapters) {
    let tokenized = verses.map(tokenizeVerse);
    if (vulgPsalms && bookNum === 19) {
      const extra = tokenized.length - (ENGLISH_PSALM_VERSES[ch - 1] ?? tokenized.length);
      if (extra > 0) {
        tokenized = [tokenized.slice(0, extra + 1).flat(), ...tokenized.slice(extra + 1)];
        psalmMerges.push(`${ch}(+${extra})`);
      }
    }
    book.v[ch] = [];
    book.w[ch] = [];
    for (const tokens of tokenized) {
      for (const t of tokens) { if (t.s) { tagged++; bookTagged = true; } if (t.m) withMorph++; }
      book.v[ch].push(tokensToText(tokens));
      book.w[ch].push(tokens);
    }
  }
  if (!bookTagged) delete book.w; // plain-text translation: verse strings only
  const json = JSON.stringify(book);
  fs.writeFileSync(path.join(outDir, `${bookNum}.json`), json);
  bytes += Buffer.byteLength(json);
  gz += zlib.gzipSync(json).length;
}

console.log(`66 books, ${nChapters} chapters, ${nVerses} verses -> ${outDir}`);
console.log(`${tagged.toLocaleString()} Strong's-tagged words, ${withMorph.toLocaleString()} with morphology`);
console.log(`${(bytes / 1048576).toFixed(1)} MB raw, ${(gz / 1048576).toFixed(1)} MB gzipped`);
if (psalmMerges.length) console.log(`Psalm titles merged into verse 1: ${psalmMerges.join(" ")}`);
