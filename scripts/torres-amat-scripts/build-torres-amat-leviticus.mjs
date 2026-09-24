// scripts/torres-amat-scripts/build-torres-amat-leviticus.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EPUB_DIR = "C:\\Users\\saulo\\Downloads\\petisco-epub";

const OUTPUT = path.resolve(
  __dirname,
  "../../public/data/bibles/torres-amat/3.json",
);

const BOOK_NUMBER = 3;
const BOOK_NAME = "Leviticus";
const CHAPTER_COUNT = 27;

// Correct KJV chapter verse counts.
// These are used ONLY for the number of slots.
// No KJV text is copied.
const KJV_VERSE_COUNTS = [
  17, // 1
  16, // 2
  17, // 3
  35, // 4
  19, // 5
  30, // 6
  38, // 7
  36, // 8
  24, // 9
  20, // 10
  47, // 11
  8, // 12
  59, // 13
  57, // 14
  33, // 15
  34, // 16
  16, // 17
  30, // 18
  37, // 19
  27, // 20
  24, // 21
  33, // 22
  44, // 23
  23, // 24
  55, // 25
  46, // 26
  34, // 27
];

// ------------------------------------------------------------
// HTML helpers
// ------------------------------------------------------------

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2019;/gi, "’")
    .replace(/&#x201c;/gi, "“")
    .replace(/&#x201d;/gi, "”")
    .replace(/&#x2013;/gi, "–")
    .replace(/&#x2014;/gi, "—");
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );
}

function cleanText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------------------------------------------------
// Find chapter heading in a paragraph.
//
// Handles:
//   LEVÍTICO 1
//   LEVÍTICO 24
//
// ------------------------------------------------------------

function findExplicitChapterHeading(rawParagraph) {
  const boldRegex =
    /<span\b[^>]*class=["'][^"']*\bbold\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;

  let match;

  while ((match = boldRegex.exec(rawParagraph)) !== null) {
    const headingText = cleanText(htmlToText(match[1]));

    const normalized = normalizeText(headingText);

    const chapterMatch = normalized.match(/^LEVITICO\s+(\d{1,2})\b/i);

    if (chapterMatch) {
      const chapter = Number(chapterMatch[1]);

      if (chapter >= 1 && chapter <= CHAPTER_COUNT) {
        return {
          chapter,
          headingHtml: match[0],
        };
      }
    }
  }

  // Fallback if the heading is not inside a bold span.
  const plain = cleanText(htmlToText(rawParagraph));

  const normalized = normalizeText(plain);

  const matchPlain = normalized.match(/^LEVITICO\s+(\d{1,2})\b/i);

  if (matchPlain) {
    const chapter = Number(matchPlain[1]);

    if (chapter >= 1 && chapter <= CHAPTER_COUNT) {
      return {
        chapter,
        headingHtml: null,
      };
    }
  }

  return null;
}

// ------------------------------------------------------------
// Detect standalone chapter transitions.
//
// Example from the actual Petisco file:
//
//   ... 36) E hicieron Aarón...
//   9 1 Llegado el día octavo...
//
// and:
//
//   ... 24) ... alabaron al Señor.
//   10 1 Pero Nadab y Abiú...
//
// We only accept:
//
//   CHAPTER 1
//
// at the beginning of a paragraph/text block.
// ------------------------------------------------------------

function findStandaloneChapter(text) {
  const normalized = cleanText(text);

  const match = normalized.match(/^(\d{1,2})\s+1\b/);

  if (!match) {
    return null;
  }

  const chapter = Number(match[1]);

  if (chapter < 1 || chapter > CHAPTER_COUNT) {
    return null;
  }

  return {
    chapter,
    numberStart: match.index,
    numberEnd: match.index + match[0].length,
  };
}

// ------------------------------------------------------------
// Remove an explicit LEVÍTICO heading from a paragraph.
// ------------------------------------------------------------

function removeExplicitHeading(rawParagraph, heading) {
  if (!heading) {
    return cleanText(htmlToText(rawParagraph));
  }

  if (heading.headingHtml) {
    return cleanText(htmlToText(rawParagraph.replace(heading.headingHtml, "")));
  }

  // Fallback for plain-text heading.
  const text = cleanText(htmlToText(rawParagraph));

  return text.replace(/^LEV[ÍI]TICO\s+\d{1,2}\b/i, "").trim();
}

// ------------------------------------------------------------
// Parse verses
// ------------------------------------------------------------

function findNextVerse(text, expectedVerse, searchFrom) {
  const escaped = String(expectedVerse).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const start = Math.max(0, searchFrom - 1);

  const regex = new RegExp(
    `(?:^|\\s)(${escaped})(?=$|\\s|[.)]|[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])`,
    "g",
  );

  regex.lastIndex = start;

  const match = regex.exec(text);

  if (!match) {
    return null;
  }

  const numberStart = match.index + match[0].indexOf(match[1]);

  return {
    numberStart,
    numberEnd: numberStart + match[1].length,
  };
}

function parseChapter(text, chapterNumber) {
  const expectedCount = KJV_VERSE_COUNTS[chapterNumber - 1];

  const verses = Array(expectedCount).fill("");

  const missing = [];

  let expectedVerse = 1;
  let searchFrom = 0;

  while (expectedVerse <= expectedCount) {
    const current = findNextVerse(text, expectedVerse, searchFrom);

    if (!current) {
      break;
    }

    let contentStart = current.numberEnd;

    while (contentStart < text.length && /[\s.)]/.test(text[contentStart])) {
      contentStart++;
    }

    const nextVerse = expectedVerse + 1;

    let next = null;

    if (nextVerse <= expectedCount) {
      next = findNextVerse(text, nextVerse, contentStart);
    }

    const contentEnd = next ? next.numberStart : text.length;

    const verseText = text.slice(contentStart, contentEnd).trim();

    verses[expectedVerse - 1] = verseText;

    expectedVerse++;

    if (next) {
      searchFrom = Math.max(0, next.numberStart - 1);
    } else {
      break;
    }
  }

  for (let i = 0; i < expectedCount; i++) {
    if (!verses[i]) {
      missing.push(i + 1);
    }
  }

  return {
    verses,
    missing,
  };
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

console.log("==============================================");
console.log(" TORRES AMAT — LEVITICUS BUILDER");
console.log("==============================================");
console.log();

if (!fs.existsSync(EPUB_DIR)) {
  console.error("ERROR: EPUB directory not found:");
  console.error(EPUB_DIR);
  process.exit(1);
}

const files = fs
  .readdirSync(EPUB_DIR)
  .filter((name) => /^index_split_\d+\.html$/i.test(name))
  .sort((a, b) => {
    const na = Number(a.match(/\d+/)[0]);

    const nb = Number(b.match(/\d+/)[0]);

    return na - nb;
  });

console.log(`HTML files found: ${files.length}`);
console.log();

// ------------------------------------------------------------
// Accumulate each chapter across paragraphs/files.
// ------------------------------------------------------------

const chapterTexts = new Map();

let currentChapter = null;
let currentTextParts = [];

function finishCurrentChapter() {
  if (currentChapter === null) {
    return;
  }

  const text = cleanText(currentTextParts.join(" "));

  if (chapterTexts.has(currentChapter)) {
    chapterTexts.set(
      currentChapter,
      chapterTexts.get(currentChapter) + " " + text,
    );
  } else {
    chapterTexts.set(currentChapter, text);
  }

  currentChapter = null;
  currentTextParts = [];
}

// ------------------------------------------------------------
// Process every HTML file.
// ------------------------------------------------------------

for (const file of files) {
  const fullPath = path.join(EPUB_DIR, file);

  const html = fs.readFileSync(fullPath, "utf8");

  const paragraphRegex = /<p\b[^>]*>[\s\S]*?<\/p>/gi;

  let match;

  while ((match = paragraphRegex.exec(html)) !== null) {
    const rawParagraph = match[0];

    // ------------------------------------------
    // First: explicit LEVÍTICO N heading
    // ------------------------------------------

    const explicit = findExplicitChapterHeading(rawParagraph);

    if (explicit) {
      finishCurrentChapter();

      currentChapter = explicit.chapter;

      const remainder = removeExplicitHeading(rawParagraph, explicit);

      if (remainder) {
        currentTextParts.push(remainder);
      }

      console.log(`Found Leviticus ${currentChapter} in ${file}`);

      continue;
    }

    // ------------------------------------------
    // Second: standalone chapter number.
    //
    // Example:
    //   9 1 Llegado el día octavo...
    // ------------------------------------------

    const plainText = cleanText(htmlToText(rawParagraph));

    const standalone = findStandaloneChapter(plainText);

    if (standalone && standalone.chapter !== currentChapter) {
      finishCurrentChapter();

      currentChapter = standalone.chapter;

      const remainder = plainText.slice(standalone.numberEnd).trim();

      if (remainder) {
        currentTextParts.push(remainder);
      }

      console.log(
        `Found Leviticus ${currentChapter} in ${file} (standalone chapter marker)`,
      );

      continue;
    }

    // ------------------------------------------
    // Ordinary paragraph belonging to chapter.
    // ------------------------------------------

    if (currentChapter !== null) {
      if (plainText) {
        currentTextParts.push(plainText);
      }
    }
  }
}

// Finish final chapter.
finishCurrentChapter();

// ------------------------------------------------------------
// Validation
// ------------------------------------------------------------

console.log();
console.log("==============================================");
console.log(" VALIDATION");
console.log("==============================================");
console.log();

const foundChapters = [...chapterTexts.keys()].sort((a, b) => a - b);

console.log(`Chapters found: ${foundChapters.length} / ${CHAPTER_COUNT}`);

const missingChapters = [];

for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
  if (!chapterTexts.has(chapter)) {
    missingChapters.push(chapter);
  }
}

if (missingChapters.length) {
  console.log(`Missing chapters: ${missingChapters.join(", ")}`);
} else {
  console.log("All Leviticus chapters found.");
}

console.log();

// ------------------------------------------------------------
// Build JSON regardless of missing chapters.
// ------------------------------------------------------------

const output = {
  b: BOOK_NUMBER,
  c: CHAPTER_COUNT,
  v: {},
};

let totalSlots = 0;
let totalMissing = 0;

const missingReport = [];

for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
  const expectedCount = KJV_VERSE_COUNTS[chapter - 1];

  // Entire chapter missing from source.
  if (!chapterTexts.has(chapter)) {
    output.v[String(chapter)] = Array(expectedCount).fill("");

    totalSlots += expectedCount;
    totalMissing += expectedCount;

    missingReport.push({
      chapter,
      verses: Array.from(
        {
          length: expectedCount,
        },
        (_, i) => i + 1,
      ),
    });

    console.log(
      `Leviticus ${chapter}: ${expectedCount} slots — ENTIRE CHAPTER MISSING FROM SOURCE`,
    );

    continue;
  }

  const result = parseChapter(chapterTexts.get(chapter), chapter);

  output.v[String(chapter)] = result.verses;

  totalSlots += result.verses.length;

  totalMissing += result.missing.length;

  if (result.missing.length === 0) {
    console.log(`Leviticus ${chapter}: ${result.verses.length} verses OK`);
  } else {
    console.log(
      `Leviticus ${chapter}: ${result.verses.length} slots — missing source verses: ${result.missing.join(", ")}`,
    );

    missingReport.push({
      chapter,
      verses: result.missing,
    });
  }
}

// ------------------------------------------------------------
// Write JSON even if there are missing verses.
// ------------------------------------------------------------

fs.mkdirSync(path.dirname(OUTPUT), {
  recursive: true,
});

fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), "utf8");

// ------------------------------------------------------------
// Final report
// ------------------------------------------------------------

console.log();
console.log("==============================================");
console.log(" BUILD COMPLETE");
console.log("==============================================");
console.log();

console.log(`Output: ${OUTPUT}`);

console.log(`Leviticus chapters: ${foundChapters.length} / ${CHAPTER_COUNT}`);

console.log(`Total verse slots: ${totalSlots}`);

console.log(`Empty verse slots: ${totalMissing}`);

console.log();

if (missingReport.length > 0) {
  console.log("SOURCE GAPS TO FIX MANUALLY:");
  console.log();

  for (const item of missingReport) {
    console.log(`  Leviticus ${item.chapter}: ${item.verses.join(", ")}`);
  }
} else {
  console.log("No source gaps detected.");
}

console.log();
