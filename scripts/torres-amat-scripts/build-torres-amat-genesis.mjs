import fs from "fs";
import path from "path";

// ============================================================
// CONFIGURATION
// ============================================================

const EPUB_DIR = "C:\\Users\\saulo\\Downloads\\petisco-epub";

// IMPORTANT: run this script from the project root:
// C:\\Users\\saulo\\Downloads\\KJV
const OUTPUT_DIR = "./public/data/bibles/torres-amat";

const OUTPUT_FILE = path.join(OUTPUT_DIR, "1.json");

// Genesis is currently split between these HTML files.
// The script processes them in order.
const HTML_FILES = ["index_split_000.html", "index_split_001.html"];

// Genesis has 50 chapters.
const GENESIS_CHAPTERS = 50;

// ============================================================
// KJV VERSE COUNTS
// Used ONLY to know where verse numbering should end.
// We never copy KJV text.
// ============================================================

const KJV_VERSE_COUNTS = [
  31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38,
  18, 34, 24, 20, 20, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30,
  23, 23, 23, 38, 31, 34, 31, 22, 24, 22, 26, 26,
];

// ============================================================
// HELPERS
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
// DETECT GENESIS CHAPTER HEADING
//
// Example:
// <span class="bold">GÉNESIS 1</span>
// ============================================================

function getChapterHeading(html) {
  const match = html.match(
    /<span\b[^>]*class=["'][^"']*\bbold\b[^"']*["'][^>]*>\s*GÉNESIS\s+(\d+)\s*<\/span>/i,
  );

  return match ? Number(match[1]) : null;
}

// ============================================================
// REMOVE THE CHAPTER HEADING
// ============================================================

function removeChapterHeading(html) {
  return html.replace(
    /<span\b[^>]*class=["'][^"']*\bbold\b[^"']*["'][^>]*>\s*GÉNESIS\s+\d+\s*<\/span>/i,
    "",
  );
}

// ============================================================
// FIND VERSE MARKERS
//
// We deliberately parse sequentially:
//
// 1 -> 2 -> 3 -> 4...
//
// This prevents numbers inside the actual Bible text from
// accidentally being interpreted as verse numbers.
//
// Accepted examples:
//
// 1 Text
// 8. Text
// 24) Text
// 13y dijo...
// ============================================================

function findNextVerse(text, expectedVerse, searchFrom) {
  const escaped = String(expectedVerse).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Look for the expected verse number.
  //
  // The number must either:
  //   - be at the beginning of the text, OR
  //   - be preceded by whitespace.
  //
  // We search from slightly before searchFrom so that the
  // preceding whitespace can be examined.
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

    // Remove punctuation/spaces immediately following
    // the verse number.
    while (contentStart < text.length && /[\s.)]/.test(text[contentStart])) {
      contentStart++;
    }

    const nextVerse = expectedVerse + 1;

    let next = null;

    if (nextVerse <= expectedCount) {
      next = findNextVerse(text, nextVerse, contentStart);
    }

    const contentEnd = next ? next.numberStart : text.length;

    let verseText = text.slice(contentStart, contentEnd).trim();

    verses[expectedVerse - 1] = verseText;

    expectedVerse++;

    if (next) {
      // Start at the whitespace immediately before the next
      // verse number, so the next search can recognize it.
      searchFrom = Math.max(0, next.numberStart - 1);
    } else {
      break;
    }
  }

  // Anything we didn't find is a source gap.
  for (let i = 0; i < expectedCount; i++) {
    if (!verses[i]) {
      missing.push(i + 1);
    }
  }

  // ----------------------------------------------------------
  // Genesis 5:32
  //
  // Petisco has the text of verse 32 but omits the "32"
  // marker. Recover it from the end of verse 31.
  // ----------------------------------------------------------

  if (chapterNumber === 5 && missing.length === 1 && missing[0] === 32) {
    const marker = "Pero NOÉ, siendo de quinientos años";

    const lastVerse = verses[30];

    const markerIndex = lastVerse.indexOf(marker);

    if (markerIndex !== -1) {
      const verse31Text = lastVerse.slice(0, markerIndex).trim();

      const verse32Text = lastVerse.slice(markerIndex).trim();

      verses[30] = verse31Text;
      verses[31] = verse32Text;

      missing.length = 0;

      console.log(`    ✓ Recovered Genesis 5:32 from unmarked final text`);
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

const chapters = {};

const diagnostics = [];

console.log("");
console.log("==============================================");
console.log(" TORRES AMAT — GENESIS BUILDER");
console.log("==============================================");
console.log("");

for (const fileName of HTML_FILES) {
  const filePath = path.join(EPUB_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`WARNING: File not found: ${filePath}`);
    continue;
  }

  console.log(`Reading ${fileName}...`);

  const html = fs.readFileSync(filePath, "utf8");

  const paragraphs = extractParagraphs(html, fileName);

  console.log(`  Paragraphs found: ${paragraphs.length}`);

  for (const paragraph of paragraphs) {
    const chapterNumber = getChapterHeading(paragraph.html);

    if (!chapterNumber) {
      continue;
    }

    if (chapterNumber < 1 || chapterNumber > GENESIS_CHAPTERS) {
      continue;
    }

    const chapterHtml = removeChapterHeading(paragraph.html);

    const chapterText = htmlToText(chapterHtml);

    const result = parseChapter(chapterText, chapterNumber);

    chapters[chapterNumber] = result.verses;

    diagnostics.push({
      chapter: chapterNumber,
      verseCount: result.verses.length,
      missing: result.missing,
      file: fileName,
    });

    if (result.missing.length === 0) {
      console.log(
        `  Genesis ${chapterNumber}: ${result.verses.length} verses OK`,
      );
    } else {
      console.log(
        `  Genesis ${chapterNumber}: ${result.verses.length} slots — missing source verses: ${result.missing.join(", ")}`,
      );
    }
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

console.log(`Chapters found: ${chapterNumbers.length} / ${GENESIS_CHAPTERS}`);

const missingChapters = [];

for (let i = 1; i <= GENESIS_CHAPTERS; i++) {
  if (!chapters[i]) {
    missingChapters.push(i);
  }
}

if (missingChapters.length) {
  console.log(`Missing chapters: ${missingChapters.join(", ")}`);
} else {
  console.log("All Genesis chapters found.");
}

// ------------------------------------------------------------
// Report source verse gaps.
// ------------------------------------------------------------

const sourceGaps = diagnostics.filter((d) => d.missing.length > 0);

if (sourceGaps.length) {
  console.log("");
  console.log("SOURCE VERSE GAPS:");
  console.log("");

  for (const item of sourceGaps) {
    console.log(`  Genesis ${item.chapter}: ${item.missing.join(", ")}`);
  }
} else {
  console.log("");
  console.log("No missing source verses detected.");
}

// ============================================================
// BUILD JSON
// ============================================================

if (missingChapters.length > 0) {
  console.log("");
  console.log("ERROR: Not all Genesis chapters were found.");
  console.log("JSON was NOT written.");
  process.exit(1);
}

const output = {
  b: 1,
  c: 50,
  v: {},
};

for (let chapter = 1; chapter <= GENESIS_CHAPTERS; chapter++) {
  output.v[String(chapter)] = chapters[chapter];
}

// ============================================================
// WRITE FILE
// ============================================================

fs.mkdirSync(OUTPUT_DIR, {
  recursive: true,
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log("");
console.log("==============================================");
console.log(" BUILD COMPLETE");
console.log("==============================================");
console.log("");
console.log(`Output: ${OUTPUT_FILE}`);
console.log("");
console.log("Genesis:");
console.log(`  Chapters: ${chapterNumbers.length} / 50`);
console.log(
  `  Total verse slots: ${Object.values(output.v).reduce(
    (sum, verses) => sum + verses.length,
    0,
  )}`,
);
console.log("");
console.log("Missing source verses are represented by empty strings.");
console.log("No verse text was copied from KJV or another translation.");
console.log("");
