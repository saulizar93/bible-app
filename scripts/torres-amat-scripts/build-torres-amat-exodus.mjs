import fs from "fs";
import path from "path";

// ============================================================
// CONFIGURATION
// ============================================================

const EPUB_DIR = "C:\\Users\\saulo\\Downloads\\petisco-epub";

const OUTPUT_DIR = "./public/data/bibles/torres-amat";

const OUTPUT_FILE = path.join(OUTPUT_DIR, "2.json");

const BOOK_NAME = "ÉXODO";

const BOOK_NUMBER = 2;

const CHAPTER_COUNT = 40;

// ============================================================
// KJV VERSE COUNTS
//
// Used ONLY to preserve the correct verse positions.
//
// We do NOT copy any KJV text.
// ============================================================

const KJV_VERSE_COUNTS = [
  22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 31, 51, 22, 31, 27, 36, 16, 27, 25,
  26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 35, 31, 19, 38, 27, 28,
  23, 38,
];

// ============================================================
// FIND ALL HTML FILES
//
// This is important because a book can cross EPUB file
// boundaries.
// ============================================================

function getHtmlFiles() {
  return fs
    .readdirSync(EPUB_DIR)
    .filter((name) => /^index_split_\d+\.html$/i.test(name))
    .sort((a, b) => {
      const numA = Number(a.match(/(\d+)/)[1]);

      const numB = Number(b.match(/(\d+)/)[1]);

      return numA - numB;
    });
}

// ============================================================
// HTML ENTITY DECODER
// ============================================================

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );
}

// ============================================================
// HTML → PLAIN TEXT
// ============================================================

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<a\b[^>]*>/gi, "")
      .replace(/<\/a>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

// ============================================================
// EXTRACT <p> ELEMENTS
// ============================================================

function extractParagraphs(html, fileName) {
  const paragraphs = [];

  const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

  let match;

  while ((match = pRegex.exec(html)) !== null) {
    paragraphs.push({
      html: match[1],
      text: htmlToText(match[1]),
      file: fileName,
    });
  }

  return paragraphs;
}

// ============================================================
// DETECT EXODUS CHAPTER HEADING
//
// Example:
//
// <span class="bold">ÉXODO 1</span>
//
// The heading is deliberately detected in the raw HTML.
// ============================================================

function getChapterHeading(html) {
  const match = html.match(
    /<span\b[^>]*class=["'][^"']*\bbold\b[^"']*["'][^>]*>\s*ÉXODO\s+(\d+)\s*<\/span>/i,
  );

  return match ? Number(match[1]) : null;
}

// ============================================================
// REMOVE CHAPTER HEADING
// ============================================================

function removeChapterHeading(html) {
  return html.replace(
    /<span\b[^>]*class=["'][^"']*\bbold\b[^"']*["'][^>]*>\s*ÉXODO\s+\d+\s*<\/span>/i,
    "",
  );
}

// ============================================================
// FIND NEXT EXPECTED VERSE
// ============================================================

function findNextVerse(text, expectedVerse, searchFrom) {
  const escaped = String(expectedVerse).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Start one character earlier so that the whitespace
  // immediately preceding a verse number can be examined.
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

// ============================================================
// PARSE ONE CHAPTER
// ============================================================

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

    // Remove punctuation/spaces immediately
    // following the verse number.
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

  // ----------------------------------------------------------
  // Identify source gaps.
  // ----------------------------------------------------------

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

// ============================================================
// MAIN
// ============================================================

console.log("");

console.log("==============================================");

console.log(" TORRES AMAT — EXODUS BUILDER");

console.log("==============================================");

console.log("");

const htmlFiles = getHtmlFiles();

console.log(`HTML files found: ${htmlFiles.length}`);

console.log("");

const chapters = {};

const diagnostics = [];

// ============================================================
// PROCESS EVERY EPUB HTML FILE IN ORDER
// ============================================================

for (const fileName of htmlFiles) {
  const filePath = path.join(EPUB_DIR, fileName);

  const html = fs.readFileSync(filePath, "utf8");

  const paragraphs = extractParagraphs(html, fileName);

  let foundSomething = false;

  for (const paragraph of paragraphs) {
    const chapterNumber = getChapterHeading(paragraph.html);

    if (!chapterNumber || chapterNumber < 1 || chapterNumber > CHAPTER_COUNT) {
      continue;
    }

    foundSomething = true;

    const chapterHtml = removeChapterHeading(paragraph.html);

    const chapterText = htmlToText(chapterHtml);

    const result = parseChapter(chapterText, chapterNumber);

    // --------------------------------------------------------
    // Important:
    //
    // If the same chapter were somehow encountered twice,
    // don't silently overwrite it.
    // --------------------------------------------------------

    if (chapters[chapterNumber]) {
      console.log("");
      console.log(
        `WARNING: Exodus ${chapterNumber} was encountered more than once.`,
      );

      console.log(
        `  Existing source: ${
          diagnostics.find((d) => d.chapter === chapterNumber)?.file ??
          "unknown"
        }`,
      );

      console.log(`  New source: ${fileName}`);

      continue;
    }

    chapters[chapterNumber] = result.verses;

    diagnostics.push({
      chapter: chapterNumber,
      verseCount: result.verses.length,
      missing: result.missing,
      file: fileName,
    });

    if (result.missing.length === 0) {
      console.log(`Exodus ${chapterNumber}: ${result.verses.length} verses OK`);
    } else {
      console.log(
        `Exodus ${chapterNumber}: ${result.verses.length} slots — missing source verses: ${result.missing.join(", ")}`,
      );
    }
  }

  if (foundSomething) {
    console.log(`  ↳ found in ${fileName}`);
  }
}

// ============================================================
// VALIDATION
// ============================================================

console.log("");

console.log("==============================================");

console.log(" VALIDATION");

console.log("==============================================");

console.log("");

const chapterNumbers = Object.keys(chapters)
  .map(Number)
  .sort((a, b) => a - b);

console.log(`Chapters found: ${chapterNumbers.length} / ${CHAPTER_COUNT}`);

// ------------------------------------------------------------
// Missing chapters
// ------------------------------------------------------------

const missingChapters = [];

for (let i = 1; i <= CHAPTER_COUNT; i++) {
  if (!chapters[i]) {
    missingChapters.push(i);
  }
}

if (missingChapters.length) {
  console.log(`Missing chapters: ${missingChapters.join(", ")}`);
} else {
  console.log("All Exodus chapters found.");
}

// ------------------------------------------------------------
// Source verse gaps
// ------------------------------------------------------------

const sourceGaps = diagnostics.filter((d) => d.missing.length > 0);

if (sourceGaps.length) {
  console.log("");

  console.log("SOURCE VERSE GAPS:");

  console.log("");

  for (const item of sourceGaps) {
    console.log(`  Exodus ${item.chapter}: ${item.missing.join(", ")}`);
  }
} else {
  console.log("");

  console.log("No missing source verses detected.");
}

// ============================================================
// DON'T WRITE JSON IF A WHOLE CHAPTER IS MISSING
// ============================================================

if (missingChapters.length > 0) {
  console.log("");

  console.log("ERROR: Not all Exodus chapters were found.");

  console.log("JSON was NOT written.");

  process.exit(1);
}

// ============================================================
// BUILD OUTPUT
// ============================================================

const output = {
  b: BOOK_NUMBER,
  c: CHAPTER_COUNT,
  v: {},
};

for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
  output.v[String(chapter)] = chapters[chapter];
}

// ============================================================
// WRITE JSON
// ============================================================

fs.mkdirSync(OUTPUT_DIR, {
  recursive: true,
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");

// ============================================================
// FINAL REPORT
// ============================================================

const totalVerseSlots = Object.values(output.v).reduce(
  (sum, verses) => sum + verses.length,
  0,
);

console.log("");

console.log("==============================================");

console.log(" BUILD COMPLETE");

console.log("==============================================");

console.log("");

console.log(`Output: ${OUTPUT_FILE}`);

console.log("");

console.log(`Exodus chapters: ${chapterNumbers.length} / 40`);

console.log(`Total verse slots: ${totalVerseSlots}`);

console.log("");

console.log("Missing source verses are represented by empty strings.");

console.log("No verse text was copied from KJV or another translation.");

console.log("");
