// scripts/build-bibles-osis.mjs
//
// Converts a SWORD/Diatheke KJV text dump containing Strong's numbers
// into the JSON format used by the Bible app.
//
// Expected input format:
//
// Genesis 1:1: <w savlm="strong:H07225">In the beginning</w> <w savlm="strong:H0430">God</w> ...
//
// NOTE: this diatheke export uses SWORD's classic English long-form book
// names in places — Roman numerals ("I Samuel", "II Kings", "I Corinthians")
// and "Revelation of John" instead of "Revelation" — so every recognized
// name has both the common Arabic-numeral form and this long form.
//
// It can also contain stray junk before the book name on some lines (a
// <title>...</title> block that appears to leak from a Psalm superscription
// and repeat on later verses — a diatheke rendering quirk, not something in
// the actual KJV text). The book-name match below is deliberately NOT
// anchored to the start of the line, so this leading junk is ignored rather
// than causing every subsequent line to fail to parse.
//
// Usage:
//
//   node scripts/build-bibles-osis.mjs /path/to/kjv.txt kjv
//
// Example:
//
//   node scripts/build-bibles-osis.mjs /mnt/c/Users/saulo/Downloads/KJV/kjv.txt kjv

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// ============================================================
// 66 BOOKS — canonical display name per book number
// ============================================================

const BOOKS = [
  ["Genesis", "Gen"],
  ["Exodus", "Exod"],
  ["Leviticus", "Lev"],
  ["Numbers", "Num"],
  ["Deuteronomy", "Deut"],
  ["Joshua", "Josh"],
  ["Judges", "Judg"],
  ["Ruth", "Ruth"],
  ["1 Samuel", "1Sam"],
  ["2 Samuel", "2Sam"],
  ["1 Kings", "1Kgs"],
  ["2 Kings", "2Kgs"],
  ["1 Chronicles", "1Chr"],
  ["2 Chronicles", "2Chr"],
  ["Ezra", "Ezra"],
  ["Nehemiah", "Neh"],
  ["Esther", "Esth"],
  ["Job", "Job"],
  ["Psalms", "Ps"],
  ["Proverbs", "Prov"],
  ["Ecclesiastes", "Eccl"],
  ["Song of Solomon", "Song"],
  ["Isaiah", "Isa"],
  ["Jeremiah", "Jer"],
  ["Lamentations", "Lam"],
  ["Ezekiel", "Ezek"],
  ["Daniel", "Dan"],
  ["Hosea", "Hos"],
  ["Joel", "Joel"],
  ["Amos", "Amos"],
  ["Obadiah", "Obad"],
  ["Jonah", "Jonah"],
  ["Micah", "Mic"],
  ["Nahum", "Nah"],
  ["Habakkuk", "Hab"],
  ["Zephaniah", "Zeph"],
  ["Haggai", "Hag"],
  ["Zechariah", "Zech"],
  ["Malachi", "Mal"],
  ["Matthew", "Matt"],
  ["Mark", "Mark"],
  ["Luke", "Luke"],
  ["John", "John"],
  ["Acts", "Acts"],
  ["Romans", "Rom"],
  ["1 Corinthians", "1Cor"],
  ["2 Corinthians", "2Cor"],
  ["Galatians", "Gal"],
  ["Ephesians", "Eph"],
  ["Philippians", "Phil"],
  ["Colossians", "Col"],
  ["1 Thessalonians", "1Thess"],
  ["2 Thessalonians", "2Thess"],
  ["1 Timothy", "1Tim"],
  ["2 Timothy", "2Tim"],
  ["Titus", "Titus"],
  ["Philemon", "Phlm"],
  ["Hebrews", "Heb"],
  ["James", "Jas"],
  ["1 Peter", "1Pet"],
  ["2 Peter", "2Pet"],
  ["1 John", "1John"],
  ["2 John", "2John"],
  ["3 John", "3John"],
  ["Jude", "Jude"],
  ["Revelation", "Rev"],
];

// Every recognized way this (or similar) diatheke exports spell a book name,
// mapped to the same book number. Add to this list if you hit another
// variant — the regex and lookup are both built from it.
const NAME_ALIASES = [
  [1, "Genesis"], [2, "Exodus"], [3, "Leviticus"], [4, "Numbers"], [5, "Deuteronomy"],
  [6, "Joshua"], [7, "Judges"], [8, "Ruth"],
  [9, "1 Samuel"], [9, "I Samuel"],
  [10, "2 Samuel"], [10, "II Samuel"],
  [11, "1 Kings"], [11, "I Kings"],
  [12, "2 Kings"], [12, "II Kings"],
  [13, "1 Chronicles"], [13, "I Chronicles"],
  [14, "2 Chronicles"], [14, "II Chronicles"],
  [15, "Ezra"], [16, "Nehemiah"], [17, "Esther"], [18, "Job"], [19, "Psalms"], [20, "Proverbs"],
  [21, "Ecclesiastes"], [22, "Song of Solomon"], [23, "Isaiah"], [24, "Jeremiah"], [25, "Lamentations"],
  [26, "Ezekiel"], [27, "Daniel"], [28, "Hosea"], [29, "Joel"], [30, "Amos"], [31, "Obadiah"],
  [32, "Jonah"], [33, "Micah"], [34, "Nahum"], [35, "Habakkuk"], [36, "Zephaniah"], [37, "Haggai"],
  [38, "Zechariah"], [39, "Malachi"],
  [40, "Matthew"], [41, "Mark"], [42, "Luke"], [43, "John"], [44, "Acts"], [45, "Romans"],
  [46, "1 Corinthians"], [46, "I Corinthians"],
  [47, "2 Corinthians"], [47, "II Corinthians"],
  [48, "Galatians"], [49, "Ephesians"], [50, "Philippians"], [51, "Colossians"],
  [52, "1 Thessalonians"], [52, "I Thessalonians"],
  [53, "2 Thessalonians"], [53, "II Thessalonians"],
  [54, "1 Timothy"], [54, "I Timothy"],
  [55, "2 Timothy"], [55, "II Timothy"],
  [56, "Titus"], [57, "Philemon"], [58, "Hebrews"], [59, "James"],
  [60, "1 Peter"], [60, "I Peter"],
  [61, "2 Peter"], [61, "II Peter"],
  [62, "1 John"], [62, "I John"],
  [63, "2 John"], [63, "II John"],
  [64, "3 John"], [64, "III John"],
  [65, "Jude"],
  [66, "Revelation"], [66, "Revelation of John"],
];

const NAME_TO_NUM = new Map(NAME_ALIASES.map(([num, name]) => [name, num]));

// ============================================================
// COMMAND-LINE ARGUMENTS
// ============================================================

const [, , srcFile, code = "kjv"] = process.argv;

if (!srcFile) {
  console.error(
    "Usage: node scripts/build-bibles-osis.mjs <source.txt> <code>",
  );
  process.exit(1);
}

if (!fs.existsSync(srcFile)) {
  console.error(`Source file not found: ${srcFile}`);
  process.exit(1);
}

// ============================================================
// ENTITY DECODING
// ============================================================

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    );
}

// ============================================================
// NORMALIZE TEXT
// ============================================================

function normalizeText(text) {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

// ============================================================
// TOKENIZE ONE VERSE
// ============================================================
//
// Each <w> element is preserved as ONE token, matching the granularity
// this module's own tagging uses (e.g. "And Joseph" -> H03130 as a single
// unit, since Hebrew/Greek word order rarely maps one-to-one onto English).
//

function tokenizeVerse(raw) {
  const tokens = [];
  const wordRegex = /<w\b([^>]*)>([\s\S]*?)<\/w>/gi;
  let match;

  while ((match = wordRegex.exec(raw)) !== null) {
    const attributes = match[1] || "";
    const content = match[2] || "";

    const savlmMatch = attributes.match(/\bsavlm\s*=\s*"([^"]*)"/i);
    const savlm = savlmMatch ? savlmMatch[1] : "";

    // If multiple Strong's numbers occur in one <w> (common: Greek puts the
    // article before its noun, e.g. "strong:G3588 strong:G3056" for "the
    // word"), picking the FIRST one would mean almost every article+noun or
    // article+participle token collapses to G3588 ("the") — the actual
    // content word gets discarded. Instead, prefer the last number that
    // isn't one of these near-meaningless function-word codes, and only
    // fall back to the article itself when nothing else was tagged.
    const HOLLOW_CODES = new Set(['G3588', 'H0853']); // Greek article / Hebrew object marker
    const allStrongs = [...savlm.matchAll(/strong:([HG]\d+)/gi)].map((m) => m[1].toUpperCase());
    const contentStrongs = allStrongs.filter((s) => !HOLLOW_CODES.has(s));
    const strong = contentStrongs.length
      ? contentStrongs[contentStrongs.length - 1]
      : allStrongs[allStrongs.length - 1] || null;

    const text = normalizeText(content.replace(/<[^>]+>/g, ""));
    if (!text) continue;

    const token = { t: text };
    if (strong) token.s = strong;
    tokens.push(token);
  }

  // Text outside any <w> element (should be rare) is kept as an untagged token.
  if (tokens.length === 0) {
    const plain = normalizeText(raw.replace(/<[^>]+>/g, ""));
    if (plain) return [{ t: plain }];
  }

  return tokens;
}

// ============================================================
// CONVERT TOKENS BACK TO DISPLAY TEXT
// ============================================================

function tokensToText(tokens) {
  return tokens
    .map((token) => token.t)
    .join(" ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+([”’])/g, "$1")
    .replace(/([“‘])\s+/g, "$1")
    .trim();
}

// ============================================================
// PARSE ONE DIATHEKE LINE
// ============================================================
//
// Expected somewhere in the line (NOT necessarily at the very start —
// see the note above about stray leading <title> junk):
//
//   Genesis 1:1: <w savlm="strong:H07225">In the beginning</w> ...
//

const escapedNames = [...NAME_TO_NUM.keys()]
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .sort((a, b) => b.length - a.length); // longest first: "Revelation of John" before "John"

const BOOK_REGEX = escapedNames.join("|");

// Deliberately NOT anchored with ^ — see file header note. This means the
// match starts wherever the real book name actually appears in the line,
// so any leading junk (like the stray <title> blocks) is simply ignored
// instead of causing the whole line to fail to match.
const verseLineRegex = new RegExp(`(${BOOK_REGEX})\\s+(\\d+):(\\d+):\\s*(.*)$`);

function parseLine(line) {
  const match = line.match(verseLineRegex);
  if (!match) return null;

  const [, bookName, chapterStr, verseStr, raw] = match;
  const bookNum = NAME_TO_NUM.get(bookName);
  if (!bookNum) return null;

  return {
    bookNum,
    chapter: Number(chapterStr),
    verse: Number(verseStr),
    raw,
  };
}

// ============================================================
// READ SOURCE
// ============================================================

console.log(`Reading: ${srcFile}`);
const source = fs.readFileSync(srcFile, "utf8");
const lines = source.split(/\r?\n/);
console.log(`Lines: ${lines.length.toLocaleString()}`);

// ============================================================
// PARSE ALL LINES
// ============================================================

const books = new Map();
let parsedVerses = 0;
let skippedLines = 0;
let taggedVerses = 0;
let multipleStrongVerses = 0;

for (const line of lines) {
  if (!line.trim()) continue;

  const parsed = parseLine(line);
  if (!parsed) {
    skippedLines++;
    continue;
  }

  const { bookNum, chapter, verse, raw } = parsed;
  const tokens = tokenizeVerse(raw);

  if (!tokens.length) {
    console.warn(`Warning: no text tokens found for ${bookNum}:${chapter}:${verse}`);
    continue;
  }

  const text = tokensToText(tokens);
  const strongTokens = tokens.filter((token) => token.s);
  if (strongTokens.length > 0) taggedVerses++;

  const multipleStrongMatch = raw.match(
    /savlm="[^"]*strong:[HG]\d+(?:\s+strong:[HG]\d+)+"/i,
  );
  if (multipleStrongMatch) multipleStrongVerses++;

  if (!books.has(bookNum)) books.set(bookNum, { chapters: new Map() });
  const book = books.get(bookNum);
  if (!book.chapters.has(chapter)) book.chapters.set(chapter, new Map());
  book.chapters.get(chapter).set(verse, { text, tokens });

  parsedVerses++;
}

// ============================================================
// VALIDATION
// ============================================================

if (parsedVerses === 0) {
  console.error("");
  console.error("ERROR: No Bible verses were parsed.");
  console.error("");
  console.error("The input does not appear to contain lines in the expected format:");
  console.error("");
  console.error('Genesis 1:1: <w savlm="strong:H07225">In the beginning</w> ...');
  console.error("");
  process.exit(1);
}

// ============================================================
// OUTPUT
// ============================================================

const outputDir = path.resolve("public", "data", "bibles", code);
fs.mkdirSync(outputDir, { recursive: true });

let writtenBooks = 0;
let totalGzipBytes = 0;
let totalJsonBytes = 0;
let totalTaggedChapters = 0;

for (const [bookNum, book] of [...books.entries()].sort(([a], [b]) => a - b)) {
  const vOut = {};
  const wOut = {};
  const sortedChapters = [...book.chapters.entries()].sort(([a], [b]) => a - b);

  for (const [chapterNum, chapterMap] of sortedChapters) {
    const sortedVerses = [...chapterMap.entries()].sort(([a], [b]) => a - b);
    const verseTexts = [];
    const verseTokens = [];
    for (const [, verseData] of sortedVerses) {
      verseTexts.push(verseData.text);
      verseTokens.push(verseData.tokens);
    }

    const chapterKey = String(chapterNum);
    vOut[chapterKey] = verseTexts;

    const hasStrong = verseTokens.some((verse) => verse.some((token) => token.s));
    if (hasStrong) {
      wOut[chapterKey] = verseTokens;
      totalTaggedChapters++;
    }
  }

  const output = { b: bookNum, c: sortedChapters.length, v: vOut };
  if (Object.keys(wOut).length > 0) output.w = wOut;

  const json = JSON.stringify(output);
  fs.writeFileSync(path.join(outputDir, `${bookNum}.json`), json + "\n", "utf8");

  const gzip = zlib.gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  totalJsonBytes += Buffer.byteLength(json, "utf8");
  totalGzipBytes += gzip.length;
  writtenBooks++;

  console.log(
    `Book ${String(bookNum).padStart(2, "0")}: ${BOOKS[bookNum - 1][0]} (${sortedChapters.length} chapters)`,
  );
}

// ============================================================
// FINAL REPORT
// ============================================================

console.log("");
console.log("========================================");
console.log("BUILD COMPLETE");
console.log("========================================");
console.log("");
console.log(`Source:          ${srcFile}`);
console.log(`Translation:     ${code}`);
console.log(`Books written:   ${writtenBooks}/66`);
console.log(`Verses parsed:   ${parsedVerses.toLocaleString()}`);
console.log(`Tagged verses:   ${taggedVerses.toLocaleString()}`);
console.log(`Tagged chapters: ${totalTaggedChapters.toLocaleString()}`);
console.log(`Skipped lines:   ${skippedLines.toLocaleString()}`);
console.log(`JSON size:       ${(totalJsonBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Gzip size:       ${(totalGzipBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Output:          ${outputDir}`);
console.log("");

if (multipleStrongVerses > 0) {
  console.log(
    `NOTE: ${multipleStrongVerses.toLocaleString()} verse(s) contain <w> elements with multiple Strong's numbers.`,
  );
  console.log("      The current JSON schema keeps only the FIRST Strong's number.");
  console.log("      Example: strong:G3588 strong:G3056 -> G3588");
  console.log("");
}

if (writtenBooks !== 66) {
  console.warn(`WARNING: Expected 66 books but wrote ${writtenBooks}.`);
  console.warn("Check the source format and book names — see NAME_ALIASES near the top of this file.");
  console.log("");
}
