// scripts/build-bibles-osis.mjs
//
// Converts a SWORD/Diatheke KJV text dump containing Strong's numbers
// into the JSON format used by the Bible app.
//
// Expected input format:
//
// Genesis 1:1: <w savlm="strong:H07225">In the beginning</w> <w savlm="strong:H0430">God</w> <w savlm="strong:H0853 strong:H01254">created</w> ...
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
// 66 BOOKS
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

// Map book name -> book number.
//
// Genesis = 1
// Exodus = 2
// ...
// Revelation = 66

const BOOK_TO_NUM = new Map(BOOKS.map(([name], index) => [name, index + 1]));

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
// IMPORTANT:
//
// Each <w> element is preserved as ONE token.
//
// Example:
//
// <w savlm="strong:H01004">And all the house</w>
//
// becomes:
//
// { t: "And all the house", s: "H01004" }
//
// NOT:
//
// { t: "And", s: "H01004" }
// { t: "all", s: "H01004" }
// { t: "the", s: "H01004" }
// { t: "house", s: "H01004" }
//
// This is important because the SWORD module attaches the
// Strong's information to the entire <w> element.
//

function tokenizeVerse(raw) {
  const tokens = [];

  // ----------------------------------------------------------
  // Find every <w ...>...</w>
  // ----------------------------------------------------------

  const wordRegex = /<w\b([^>]*)>([\s\S]*?)<\/w>/gi;

  let match;

  while ((match = wordRegex.exec(raw)) !== null) {
    const attributes = match[1] || "";
    const content = match[2] || "";

    // --------------------------------------------------------
    // Extract savlm attribute
    //
    // Example:
    //
    // savlm="strong:H01004"
    //
    // or:
    //
    // savlm="strong:H0853 strong:H01254"
    // --------------------------------------------------------

    const savlmMatch = attributes.match(/\bsavlm\s*=\s*"([^"]*)"/i);

    const savlm = savlmMatch ? savlmMatch[1] : "";

    // --------------------------------------------------------
    // Extract Strong's number.
    //
    // For now the JSON schema uses:
    //
    // s: "H01004"
    //
    // If multiple Strong's numbers occur, we use the FIRST one.
    //
    // Example:
    //
    // strong:H0853 strong:H01254
    //
    // becomes:
    //
    // H0853
    //
    // This preserves the existing app schema without changing
    // "s" from a string into an array.
    // --------------------------------------------------------

    const strongMatch = savlm.match(/(?:^|\s)strong:([HG]\d+)/i);

    const strong = strongMatch ? strongMatch[1].toUpperCase() : null;

    // --------------------------------------------------------
    // Remove any nested XML/HTML tags from the word content.
    //
    // This handles things such as:
    //
    // <transChange type="added">was</transChange>
    //
    // while keeping the actual displayed text.
    // --------------------------------------------------------

    const text = normalizeText(content.replace(/<[^>]+>/g, ""));

    if (!text) continue;

    const token = {
      t: text,
    };

    if (strong) {
      token.s = strong;
    }

    tokens.push(token);
  }

  // ==========================================================
  // Handle text that was NOT inside <w> tags
  // ==========================================================
  //
  // Normally most KJV text is inside <w> elements.
  //
  // If there is plain text between <w> elements, preserve it
  // as an untagged token instead of silently throwing it away.
  //
  // Example:
  //
  // <w ...>In the beginning</w> God ...
  //
  // "God" would be preserved as an untagged token if it were
  // outside a <w> element.
  //
  // In practice, the KJV module should normally have the text
  // inside <w> elements.

  if (tokens.length === 0) {
    const plain = normalizeText(raw.replace(/<[^>]+>/g, ""));

    if (plain) {
      return [{ t: plain }];
    }
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
// Expected:
//
// Genesis 1:1: <w savlm="strong:H07225">In the beginning</w> ...
//
// Returns:
//
// {
//   bookNum: 1,
//   chapter: 1,
//   verse: 1,
//   raw: "..."
// }
//
// or null if the line isn't a Bible verse.
//

const escapedBookNames = BOOKS.map(([name]) =>
  name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).sort((a, b) => b.length - a.length);

const BOOK_REGEX = escapedBookNames.join("|");

const verseLineRegex = new RegExp(
  `^(${BOOK_REGEX})\\s+(\\d+):(\\d+):\\s*(.*)$`,
);

function parseLine(line) {
  const match = line.match(verseLineRegex);

  if (!match) {
    return null;
  }

  const [, bookName, chapterStr, verseStr, raw] = match;

  const bookNum = BOOK_TO_NUM.get(bookName);

  if (!bookNum) {
    return null;
  }

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
// OUTPUT STRUCTURE
// ============================================================
//
// books[bookNum] = {
//   chapters: {
//     "1": {
//       "1": {
//         text: "...",
//         tokens: [...]
//       }
//     }
//   }
// }
//
// We construct this first, then write each book separately.
//

const books = new Map();

let parsedVerses = 0;
let skippedLines = 0;
let taggedVerses = 0;
let multipleStrongVerses = 0;

// ============================================================
// PARSE ALL LINES
// ============================================================

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
    console.warn(
      `Warning: no text tokens found for ${bookNum}:${chapter}:${verse}`,
    );
    continue;
  }

  const text = tokensToText(tokens);

  // ----------------------------------------------------------
  // Track whether this verse has Strong's information.
  // ----------------------------------------------------------

  const strongTokens = tokens.filter((token) => token.s);

  if (strongTokens.length > 0) {
    taggedVerses++;
  }

  // ----------------------------------------------------------
  // Detect multiple Strong's numbers inside the source.
  // ----------------------------------------------------------

  const multipleStrongMatch = raw.match(
    /savlm="[^"]*strong:[HG]\d+(?:\s+strong:[HG]\d+)+"/i,
  );

  if (multipleStrongMatch) {
    multipleStrongVerses++;
  }

  // ----------------------------------------------------------
  // Create book
  // ----------------------------------------------------------

  if (!books.has(bookNum)) {
    books.set(bookNum, {
      chapters: new Map(),
    });
  }

  const book = books.get(bookNum);

  // ----------------------------------------------------------
  // Create chapter
  // ----------------------------------------------------------

  if (!book.chapters.has(chapter)) {
    book.chapters.set(chapter, new Map());
  }

  const chapterMap = book.chapters.get(chapter);

  // ----------------------------------------------------------
  // Store verse
  // ----------------------------------------------------------

  chapterMap.set(verse, {
    text,
    tokens,
  });

  parsedVerses++;
}

// ============================================================
// VALIDATION
// ============================================================

if (parsedVerses === 0) {
  console.error("");
  console.error("ERROR: No Bible verses were parsed.");
  console.error("");
  console.error(
    "The input does not appear to contain lines in the expected format:",
  );
  console.error("");
  console.error(
    'Genesis 1:1: <w savlm="strong:H07225">In the beginning</w> ...',
  );
  console.error("");
  process.exit(1);
}

// ============================================================
// OUTPUT DIRECTORY
// ============================================================

const outputDir = path.resolve("public", "data", "bibles", code);

fs.mkdirSync(outputDir, {
  recursive: true,
});

// ============================================================
// WRITE BOOK JSON FILES
// ============================================================
//
// Existing output structure:
//
// {
//   b: 1,
//   c: 50,
//   v: {
//     "1": ["In the beginning God created ...", ...],
//     ...
//   },
//   w: {
//     "1": [
//       [
//         { t: "In the beginning", s: "H07225" },
//         ...
//       ]
//     ]
//   }
// }
//
// "v" contains verse text.
//
// "w" contains Strong's/token information.
//
// The verse arrays are zero-indexed:
// v["1"][0] = Genesis 1:1
// v["1"][1] = Genesis 1:2
//
// The token arrays follow the same structure.
//

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

    // Only include token data when at least one verse in the
    // chapter contains Strong's information.

    const hasStrong = verseTokens.some((verse) =>
      verse.some((token) => token.s),
    );

    if (hasStrong) {
      wOut[chapterKey] = verseTokens;
      totalTaggedChapters++;
    }
  }

  const output = {
    b: bookNum,
    c: sortedChapters.length,
    v: vOut,
  };

  if (Object.keys(wOut).length > 0) {
    output.w = wOut;
  }

  const json = JSON.stringify(output);

  const outputFile = path.join(outputDir, `${bookNum}.json`);

  fs.writeFileSync(outputFile, json + "\n", "utf8");

  const gzip = zlib.gzipSync(Buffer.from(json, "utf8"), {
    level: 9,
  });

  totalJsonBytes += Buffer.byteLength(json, "utf8");

  totalGzipBytes += gzip.length;

  writtenBooks++;

  console.log(
    `Book ${String(bookNum).padStart(2, "0")}: ` +
      `${BOOKS[bookNum - 1][0]} ` +
      `(${sortedChapters.length} chapters)`,
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
    `NOTE: ${multipleStrongVerses.toLocaleString()} verse(s) ` +
      `contain <w> elements with multiple Strong's numbers.`,
  );

  console.log(
    "      The current JSON schema keeps only the FIRST Strong's number.",
  );

  console.log("      Example: strong:H0853 strong:H01254 -> H0853");

  console.log("");
}

if (writtenBooks !== 66) {
  console.warn(`WARNING: Expected 66 books but wrote ${writtenBooks}.`);

  console.warn("Check the source format and book names.");

  console.log("");
}
