import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const EPUB_DIR = "C:\\Users\\saulo\\Downloads\\petisco-epub";

const OUTPUT_DIR = path.join(
  PROJECT_ROOT,
  "public",
  "data",
  "bibles",
  "torres-amat",
);

const OUTPUT_FILE = path.join(OUTPUT_DIR, "5.json");

const CHAPTER_COUNT = 34;

const KJV_VERSE_COUNTS = [
  46, // 1
  37, // 2
  29, // 3
  49, // 4
  33, // 5
  25, // 6
  26, // 7
  20, // 8
  29, // 9
  22, // 10
  32, // 11
  32, // 12
  18, // 13
  29, // 14
  23, // 15
  20, // 16
  20, // 17
  22, // 18
  21, // 19
  19, // 20
  30, // 21
  30, // 22
  29, // 23
  25, // 24
  19, // 25
  19, // 26
  30, // 27
  68, // 28
  29, // 29
  20, // 30
  30, // 31
  52, // 32
  29, // 33
  12, // 34
];

/* =========================================================
   HTML → TEXT
========================================================= */

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );
}

function htmlToText(html) {
  let text = html;

  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");

  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");

  text = text.replace(/<br\s*\/?>/gi, " ");

  text = text.replace(/<\/(?:p|div|li|h[1-6])>/gi, " ");

  text = text.replace(/<[^>]+>/g, " ");

  text = decodeHtmlEntities(text);

  text = text.replace(/\u00a0/g, " ");
  text = text.replace(/\s+/g, " ");

  return text.trim();
}

function normalizeText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

/* =========================================================
   FIND REAL DEUTERONOMY CHAPTER HEADINGS
========================================================= */

/*
   IMPORTANT:

   We deliberately DO NOT search for generic patterns such as:

       1 1
       2 1
       3 1

   because those occur constantly as ordinary verse
   numbers throughout the Bible.

   We only recognize:

       DEUTERONOMIO 1
       DEUTERONOMIO 2
       ...
       DEUTERONOMIO 34

   as chapter boundaries.
*/

function findDeuteronomyHeading(text, searchFrom = 0) {
  const regex = /\bDEUTERONOMIO\s+([0-9]{1,2})(?=\s|$)/gi;

  regex.lastIndex = searchFrom;

  const match = regex.exec(text);

  if (!match) return null;

  const chapter = Number(match[1]);

  if (chapter < 1 || chapter > CHAPTER_COUNT) {
    return null;
  }

  return {
    chapter,
    start: match.index,
    end: match.index + match[0].length,
  };
}

/* =========================================================
   VERSE PARSER
========================================================= */

function findNextVerse(text, expectedVerse, searchFrom) {
  const escaped = String(expectedVerse).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const start = Math.max(0, searchFrom - 1);

  /*
     Supports:

       1 Text
       2) Text
       3. Text

     and also markers that touch the following word:

       13y dijo...
  */

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

    verses[expectedVerse - 1] = normalizeText(
      text.slice(contentStart, contentEnd),
    );

    expectedVerse++;

    if (next) {
      searchFrom = Math.max(0, next.numberStart - 1);
    } else {
      break;
    }
  }

  return verses;
}

/* =========================================================
   READ EPUB
========================================================= */

console.log("==============================================");

console.log(" TORRES AMAT — DEUTERONOMY BUILDER");

console.log("==============================================");

console.log();

if (!fs.existsSync(EPUB_DIR)) {
  console.error(`ERROR: EPUB directory not found:\n${EPUB_DIR}`);

  process.exit(1);
}

const htmlFiles = fs
  .readdirSync(EPUB_DIR)
  .filter((file) => /^index_split_\d+\.html$/i.test(file))
  .sort((a, b) => {
    const na = Number(a.match(/\d+/)[0]);

    const nb = Number(b.match(/\d+/)[0]);

    return na - nb;
  });

console.log(`HTML files found: ${htmlFiles.length}`);

console.log();

/* =========================================================
   COLLECT DEUTERONOMY CHAPTERS
========================================================= */

const chapters = new Map();

let currentChapter = null;
let currentText = "";

function saveCurrentChapter() {
  if (currentChapter === null) {
    return;
  }

  const cleaned = currentText.trim();

  if (!chapters.has(currentChapter)) {
    chapters.set(currentChapter, cleaned);
  } else {
    const old = chapters.get(currentChapter);

    chapters.set(currentChapter, `${old} ${cleaned}`.trim());
  }

  currentText = "";
}

for (const file of htmlFiles) {
  const filePath = path.join(EPUB_DIR, file);

  const html = fs.readFileSync(filePath, "utf8");

  /*
     Convert the whole HTML file to text.

     We then search specifically for
     DEUTERONOMIO chapter headings.
  */

  const text = htmlToText(html);

  let searchFrom = 0;

  while (true) {
    const heading = findDeuteronomyHeading(text, searchFrom);

    if (!heading) {
      /*
         No more Deuteronomy headings
         in this file.

         If we are already inside a
         Deuteronomy chapter, the remaining
         text belongs to that chapter.
      */

      if (currentChapter !== null && searchFrom < text.length) {
        const remaining = text.slice(searchFrom).trim();

        if (remaining) {
          currentText += (currentText ? " " : "") + remaining;
        }
      }

      break;
    }

    /*
       Text before this heading belongs
       to the previous chapter.
    */

    if (currentChapter !== null) {
      const before = text.slice(searchFrom, heading.start).trim();

      if (before) {
        currentText += (currentText ? " " : "") + before;
      }
    }

    /*
       Finish previous chapter.
    */

    saveCurrentChapter();

    /*
       Start new chapter.
    */

    currentChapter = heading.chapter;

    console.log(`Found Deuteronomy ${currentChapter} in ${file}`);

    /*
       Everything after the heading
       belongs to this chapter.

       The verse 1 marker remains intact.
    */

    searchFrom = heading.end;
  }
}

/*
   Save final chapter.
*/

saveCurrentChapter();

/* =========================================================
   VALIDATION
========================================================= */

console.log();

console.log("==============================================");

console.log(" VALIDATION");

console.log("==============================================");

console.log();

console.log(`Chapters found: ${chapters.size} / ${CHAPTER_COUNT}`);

const missingChapters = [];

for (let ch = 1; ch <= CHAPTER_COUNT; ch++) {
  if (!chapters.has(ch)) {
    missingChapters.push(ch);
  }
}

if (missingChapters.length === 0) {
  console.log("All Deuteronomy chapters found.");
} else {
  console.log(`Missing chapters: ${missingChapters.join(", ")}`);
}

console.log();

/* =========================================================
   BUILD JSON
========================================================= */

const output = {
  b: 5,
  c: CHAPTER_COUNT,
  v: {},
};

let totalSlots = 0;
let emptySlots = 0;

const sourceGaps = [];

for (let ch = 1; ch <= CHAPTER_COUNT; ch++) {
  const expectedCount = KJV_VERSE_COUNTS[ch - 1];

  const sourceText = chapters.get(ch) || "";

  const verses = sourceText
    ? parseChapter(sourceText, ch)
    : Array(expectedCount).fill("");

  output.v[String(ch)] = verses;

  totalSlots += verses.length;

  const missing = [];

  for (let i = 0; i < verses.length; i++) {
    if (!verses[i]) {
      missing.push(i + 1);
      emptySlots++;
    }
  }

  if (missing.length === 0) {
    console.log(`Deuteronomy ${ch}: ${expectedCount} verses OK`);
  } else {
    console.log(
      `Deuteronomy ${ch}: ${expectedCount} slots — missing source verses: ${missing.join(
        ", ",
      )}`,
    );

    sourceGaps.push({
      chapter: ch,
      verses: missing,
    });
  }
}

/* =========================================================
   WRITE JSON
========================================================= */

fs.mkdirSync(OUTPUT_DIR, {
  recursive: true,
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");

console.log();

console.log("==============================================");

console.log(" BUILD COMPLETE");

console.log("==============================================");

console.log();

console.log(`Output: ${OUTPUT_FILE}`);

console.log(`Deuteronomy chapters: ${chapters.size} / ${CHAPTER_COUNT}`);

console.log(`Total verse slots: ${totalSlots}`);

console.log(`Empty verse slots: ${emptySlots}`);

if (sourceGaps.length > 0) {
  console.log();
  console.log("SOURCE GAPS TO FIX MANUALLY:");
  console.log();

  for (const gap of sourceGaps) {
    console.log(`  Deuteronomy ${gap.chapter}: ${gap.verses.join(", ")}`);
  }
} else {
  console.log();
  console.log("No source verse gaps detected.");
}

if (missingChapters.length > 0) {
  console.log();
  console.log("MISSING CHAPTERS TO FIX MANUALLY:");
  console.log();

  for (const ch of missingChapters) {
    console.log(`  Deuteronomy ${ch}: ALL ${KJV_VERSE_COUNTS[ch - 1]} VERSES`);
  }
}

console.log();

console.log("Missing source material is represented by empty strings.");

console.log("No verse text was copied from KJV or another translation.");
