import fs from "node:fs/promises";
import path from "node:path";

const ROOT = "./public";
const EPUB_DIR = "C:\\Users\\saulo\\Downloads\\petisco-epub";

const OUTPUT_DIR = path.join(ROOT, "data/bibles/torres-amat");

const TEMP_DIR = path.join(ROOT, ".torres-amat-build");

// ============================================================
// Canonical books
// ============================================================

const BOOKS = [
  ["GEN", 50],
  ["EXO", 40],
  ["LEV", 27],
  ["NUM", 36],
  ["DEU", 34],
  ["JOS", 24],
  ["JDG", 21],
  ["RUT", 4],
  ["1SA", 31],
  ["2SA", 24],
  ["1KI", 22],
  ["2KI", 25],
  ["1CH", 29],
  ["2CH", 36],
  ["EZR", 10],
  ["NEH", 13],
  ["EST", 10],
  ["JOB", 42],
  ["PSA", 150],
  ["PRO", 31],
  ["ECC", 12],
  ["SNG", 8],
  ["ISA", 66],
  ["JER", 52],
  ["LAM", 5],
  ["EZK", 48],
  ["DAN", 12],
  ["HOS", 14],
  ["JOL", 3],
  ["AMO", 9],
  ["OBA", 1],
  ["JON", 4],
  ["MIC", 7],
  ["NAM", 3],
  ["HAB", 3],
  ["ZEP", 3],
  ["HAG", 2],
  ["ZEC", 14],
  ["MAL", 4],
  ["MAT", 28],
  ["MRK", 16],
  ["LUK", 24],
  ["JHN", 21],
  ["ACT", 28],
  ["ROM", 16],
  ["1CO", 16],
  ["2CO", 13],
  ["GAL", 6],
  ["EPH", 6],
  ["PHP", 4],
  ["COL", 4],
  ["1TH", 5],
  ["2TH", 3],
  ["1TI", 6],
  ["2TI", 4],
  ["TIT", 3],
  ["PHM", 1],
  ["HEB", 13],
  ["JAS", 5],
  ["1PE", 5],
  ["2PE", 3],
  ["1JN", 5],
  ["2JN", 1],
  ["3JN", 1],
  ["JUD", 1],
  ["REV", 22],
];

const BOOK_CHAPTERS = Object.fromEntries(
  BOOKS.map(([id, chapters], index) => [index + 1, chapters]),
);

// ============================================================
// Petisco source book headings
// ============================================================

const BOOK_HEADINGS = {
  1: ["GENESIS"],
  2: ["EXODO"],
  3: ["LEVITICO"],
  4: ["NUMEROS"],
  5: ["DEUTERONOMIO"],
  6: ["JOSUE"],
  7: ["JUECES"],
  8: ["RUT"],
  9: ["PRIMERO DE SAMUEL"],
  10: ["SEGUNDO LIBRO DE SAMUEL"],
  11: ["PRIMERO DE LOS REYES"],
  12: ["SEGUNDO LIBRO DE LOS REYES"],
  13: ["PRIMER LIBRO DE LAS CRONICAS"],
  14: ["SEGUNDO LIBRO DE LAS CRONICAS"],
  15: ["ESDRAS"],
  16: ["NEHEMIAS (SEGUNDO DE ESDRAS)"],
  17: ["ESTER"],
  18: ["JOB"],
  19: ["SALMOS"],
  20: ["PROVERBIOS"],
  21: ["ECLESIASTES"],
  22: ["EL CANTAR DE LOS CANTARES"],
  23: ["ISAIAS"],
  24: ["JEREMIAS"],
  25: ["TRENOS O LAMENTACIONES"],
  26: ["EZEQUIEL"],
  27: ["DANIEL"],
  28: ["OSEAS"],
  29: ["JOEL"],
  30: ["AMOS"],
  31: ["ABDIAS"],
  32: ["JONAS"],
  33: ["MIQUEAS"],
  34: ["NAHUM"],
  35: ["HABACUC"],
  36: ["SOFONIAS"],
  37: ["AGEO"],
  38: ["ZACARIAS"],
  39: ["MALAQUIAS"],
  40: ["MATEO"],
  41: ["MARCOS"],
  42: ["LUCAS"],
  43: ["JUAN"],
  44: ["HECHOS DE LOS APOSTOLES"],
  45: ["ROMANOS"],
  46: ["PRIMERA A LOS CORINTIOS"],
  47: ["SEGUNDA A LOS CORINTIOS"],
  48: ["GALATAS"],
  49: ["EFESIOS"],
  50: ["FILIPENSES"],
  51: ["COLOSENSES"],
  52: ["PRIMERA A LOS TESALONICENSES"],
  53: ["SEGUNDA A LOS TESALONICENSES"],
  54: ["PRIMERA A TIMOTEO"],
  55: ["SEGUNDA CARTA A TIMOTEO"],
  56: ["CARTA A TITO"],
  57: ["CARTA A FILEMON"],
  58: ["CARTA A LOS HEBREOS"],
  59: ["CARTA DE SANTIAGO"],
  60: ["PRIMERA DE PEDRO"],
  61: ["SEGUNDA DE PEDRO"],
  62: ["PRIMERA DE JUAN"],
  63: ["SEGUNDA DE JUAN"],
  64: ["TERCERA CARTA DE SAN JUAN"],
  65: ["CARTA DE SAN JUDAS"],
  66: ["APOCALIPSIS DE SAN JUAN"],
};

// ============================================================
// Text utilities
// ============================================================

function normalizeText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\u2007/g, " ")
    .replace(/\u202f/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function cleanText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\u2007/g, " ")
    .replace(/\u202f/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

// ============================================================
// Parse HTML paragraphs
// ============================================================

function parseHTML(html) {
  const paragraphs = [];

  const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

  for (const match of html.matchAll(pRegex)) {
    const pHtml = match[1];

    const bolds = [];

    const boldRegex =
      /<span\b[^>]*class=["'][^"']*\bbold\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;

    for (const match of pHtml.matchAll(boldRegex)) {
      const text = cleanText(stripTags(match[1]));

      if (text) {
        bolds.push(text);
      }
    }

    const text = cleanText(stripTags(pHtml));

    paragraphs.push({
      text,
      bolds,
    });
  }

  return paragraphs;
}

// ============================================================
// Heading lookup
// ============================================================

const HEADING_TO_BOOK = new Map();

for (const [bookNum, headings] of Object.entries(BOOK_HEADINGS)) {
  for (const heading of headings) {
    HEADING_TO_BOOK.set(normalizeText(heading), Number(bookNum));
  }
}

const EXTRA_HEADINGS = {
  "PRIMERA DE SAMUEL": 9,
  "SEGUNDO DE SAMUEL": 10,

  "PRIMERA DE LOS REYES": 11,
  "SEGUNDA DE LOS REYES": 12,

  "PRIMERA DE LAS CRONICAS": 13,
  "SEGUNDA DE LAS CRONICAS": 14,

  NEHEMIAS: 16,

  "TRENOS O LAMENTACIONES": 25,
  LAMENTACIONES: 25,

  "CANTAR DE LOS CANTARES": 22,

  "HECHOS DE LOS APOSTOLES": 44,

  "PRIMERA A LOS CORINTIOS": 46,
  "SEGUNDA A LOS CORINTIOS": 47,

  "PRIMERA A LOS TESALONICENSES": 52,
  "SEGUNDA A LOS TESALONICENSES": 53,

  "PRIMERA A TIMOTEO": 54,
  "SEGUNDA CARTA A TIMOTEO": 55,

  "CARTA A FILEMON": 57,

  "CARTA DE SANTIAGO": 59,

  "TERCERA CARTA DE SAN JUAN": 64,
  "CARTA DE SAN JUDAS": 65,

  "APOCALIPSIS DE SAN JUAN": 66,
};

for (const [heading, bookNum] of Object.entries(EXTRA_HEADINGS)) {
  HEADING_TO_BOOK.set(normalizeText(heading), bookNum);
}

function detectBookHeading(text) {
  return HEADING_TO_BOOK.get(normalizeText(text)) ?? null;
}

function detectChapterHeading(text, currentBook) {
  if (!currentBook) return null;

  const normalized = normalizeText(text);

  const match = normalized.match(/(\d+)\s*$/);

  if (!match) return null;

  const chapter = Number(match[1]);

  if (chapter < 1 || chapter > BOOK_CHAPTERS[currentBook]) {
    return null;
  }

  const base = normalized.slice(0, match.index).trim();

  const possible = BOOK_HEADINGS[currentBook].map(normalizeText);

  if (possible.includes(base)) {
    return chapter;
  }

  if (
    currentBook === 25 &&
    (base.startsWith("TRENOS O LAMENTACIONES") ||
      base.startsWith("LAMENTACIONES"))
  ) {
    return chapter;
  }

  return null;
}

// ============================================================
// Verse parser
// ============================================================

const VERSE_RE = /(?<!\w)(\d{1,3})(?:\)|\.|\s+)/g;

function parseVerses(text) {
  text = cleanText(text);

  if (!text) {
    return {};
  }

  const matches = [...text.matchAll(VERSE_RE)];

  if (!matches.length) {
    return {};
  }

  /*
   * Find verse 1 first, then accept only sequential
   * verse numbers.
   */

  let expected = 1;
  let firstIndex = -1;

  for (let i = 0; i < matches.length; i++) {
    if (Number(matches[i][1]) === 1) {
      firstIndex = i;
      break;
    }
  }

  if (firstIndex === -1) {
    return {};
  }

  const chosen = [matches[firstIndex]];

  expected = 2;

  for (let i = firstIndex + 1; i < matches.length; i++) {
    const number = Number(matches[i][1]);

    if (number === expected) {
      chosen.push(matches[i]);
      expected++;
    }
  }

  const verses = {};

  for (let i = 0; i < chosen.length; i++) {
    const match = chosen[i];

    const verseNumber = Number(match[1]);

    const start = match.index + match[0].length;

    const end = i + 1 < chosen.length ? chosen[i + 1].index : text.length;

    verses[verseNumber] = cleanText(text.slice(start, end));
  }

  return verses;
}

// ============================================================
// Main parser
// ============================================================

async function main() {
  console.log("Torres Amat / Petisco parser");
  console.log();

  console.log(`Source: ${EPUB_DIR}`);

  console.log(`Output: ${OUTPUT_DIR}`);

  console.log();

  // ----------------------------------------------------------
  // Verify files
  // ----------------------------------------------------------

  const htmlFiles = [];

  for (let i = 0; i <= 26; i++) {
    const file = path.join(
      EPUB_DIR,
      `index_split_${String(i).padStart(3, "0")}.html`,
    );

    try {
      await fs.access(file);
    } catch {
      throw new Error(`Missing source file: ${file}`);
    }

    htmlFiles.push(file);
  }

  // ----------------------------------------------------------
  // Temporary output
  // ----------------------------------------------------------

  await fs.rm(TEMP_DIR, {
    recursive: true,
    force: true,
  });

  await fs.mkdir(TEMP_DIR, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // Initialize data
  // ----------------------------------------------------------

  const data = {};

  for (let book = 1; book <= 66; book++) {
    data[book] = {};
  }

  let currentBook = null;
  let currentChapter = null;

  const detectedBooks = new Set();

  const warnings = [];

  // ----------------------------------------------------------
  // Process files
  // ----------------------------------------------------------

  for (const file of htmlFiles) {
    console.log(`Parsing ${path.basename(file)}...`);

    const html = await fs.readFile(file, "utf8");

    const paragraphs = parseHTML(html);

    for (const paragraph of paragraphs) {
      if (!paragraph.text) {
        continue;
      }

      // ======================================================
      // Look for book heading
      // ======================================================

      let foundBook = null;

      for (const bold of paragraph.bolds) {
        const bookNum = detectBookHeading(bold);

        if (bookNum !== null) {
          foundBook = bookNum;
          break;
        }
      }

      if (foundBook !== null) {
        currentBook = foundBook;
        currentChapter = null;

        detectedBooks.add(foundBook);

        console.log(
          `  Book ${String(foundBook).padStart(2, "0")}: ` +
            `${paragraph.bolds.join(" | ")}`,
        );

        /*
         * A book heading paragraph normally contains no
         * biblical verse text, so move to next paragraph.
         */

        continue;
      }

      // ======================================================
      // Look for chapter heading
      // ======================================================

      let foundChapter = null;

      if (currentBook !== null) {
        for (const bold of paragraph.bolds) {
          const chapter = detectChapterHeading(bold, currentBook);

          if (chapter !== null) {
            foundChapter = chapter;
            break;
          }
        }
      }

      if (foundChapter !== null) {
        currentChapter = foundChapter;

        if (!data[currentBook][currentChapter]) {
          data[currentBook][currentChapter] = {};
        }

        /*
         * The chapter heading may share the paragraph
         * with the beginning of the chapter text.
         *
         * Remove the heading before parsing verses.
         */

        let remaining = paragraph.text;

        for (const bold of paragraph.bolds) {
          if (detectChapterHeading(bold, currentBook) === foundChapter) {
            const index = remaining.toUpperCase().indexOf(bold.toUpperCase());

            if (index >= 0) {
              remaining =
                remaining.slice(0, index) +
                remaining.slice(index + bold.length);
            }

            break;
          }
        }

        remaining = cleanText(remaining);

        if (remaining) {
          const verses = parseVerses(remaining);

          mergeVerses(data[currentBook][currentChapter], verses);
        }

        continue;
      }

      // ======================================================
      // Normal chapter text
      // ======================================================

      if (currentBook === null || currentChapter === null) {
        continue;
      }

      const verses = parseVerses(paragraph.text);

      if (Object.keys(verses).length) {
        mergeVerses(data[currentBook][currentChapter], verses);
      }
    }
  }

  // ==========================================================
  // Validation
  // ==========================================================

  console.log();
  console.log("=".repeat(70));
  console.log("VALIDATION");
  console.log("=".repeat(70));

  const problems = [];

  console.log(`Books detected: ${detectedBooks.size}/66`);

  const totalChapters = Object.values(data).reduce(
    (sum, chapters) => sum + Object.keys(chapters).length,
    0,
  );

  const expectedTotalChapters = Object.values(BOOK_CHAPTERS).reduce(
    (sum, chapters) => sum + chapters,
    0,
  );

  console.log(`Chapters found: ${totalChapters}/` + `${expectedTotalChapters}`);

  // ----------------------------------------------------------
  // Validate each book/chapter
  // ----------------------------------------------------------

  for (let book = 1; book <= 66; book++) {
    if (!detectedBooks.has(book)) {
      problems.push(`Book ${book} was not detected`);
    }

    const expectedChapters = BOOK_CHAPTERS[book];

    const chapters = data[book];

    const foundChapters = Object.keys(chapters).length;

    if (foundChapters !== expectedChapters) {
      problems.push(
        `Book ${book}: expected ` +
          `${expectedChapters} chapters, ` +
          `found ${foundChapters}`,
      );
    }

    for (let chapter = 1; chapter <= expectedChapters; chapter++) {
      const verses = chapters[chapter];

      if (!verses) {
        problems.push(`Book ${book}, chapter ${chapter}: ` + `missing`);

        continue;
      }

      const numbers = Object.keys(verses)
        .map(Number)
        .sort((a, b) => a - b);

      if (!numbers.length) {
        problems.push(`Book ${book}, chapter ${chapter}: ` + `no verses`);

        continue;
      }

      if (numbers[0] !== 1) {
        problems.push(
          `Book ${book}, chapter ${chapter}: ` + `first verse is ${numbers[0]}`,
        );
      }

      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] !== numbers[i - 1] + 1) {
          problems.push(
            `Book ${book}, chapter ${chapter}: ` +
              `verse gap between ` +
              `${numbers[i - 1]} and ` +
              `${numbers[i]}`,
          );
        }
      }
    }
  }

  // ----------------------------------------------------------
  // Report problems
  // ----------------------------------------------------------

  if (warnings.length) {
    console.log();
    console.log(`Warnings: ${warnings.length}`);

    for (const warning of warnings.slice(0, 30)) {
      console.log(`  WARNING: ${warning}`);
    }
  }

  if (problems.length) {
    console.log();
    console.log(`VALIDATION PROBLEMS: ` + `${problems.length}`);

    for (const problem of problems.slice(0, 100)) {
      console.log(`  ERROR: ${problem}`);
    }

    if (problems.length > 100) {
      console.log(`  ... and ` + `${problems.length - 100} more`);
    }

    console.log();
    console.log("Build aborted. No output was installed.");

    await fs.rm(TEMP_DIR, {
      recursive: true,
      force: true,
    });

    process.exit(1);
  }

  // ==========================================================
  // Write JSON
  // ==========================================================

  console.log();
  console.log("Validation passed.");
  console.log();

  for (let book = 1; book <= 66; book++) {
    const chapters = {};

    for (let chapter = 1; chapter <= BOOK_CHAPTERS[book]; chapter++) {
      const verses = data[book][chapter];

      const numbers = Object.keys(verses)
        .map(Number)
        .sort((a, b) => a - b);

      const maxVerse = numbers[numbers.length - 1];

      chapters[String(chapter)] = Array.from(
        {
          length: maxVerse,
        },
        (_, index) => verses[String(index + 1)] || "",
      );
    }

    const output = {
      b: book,
      c: BOOK_CHAPTERS[book],
      v: chapters,
    };

    await fs.writeFile(
      path.join(TEMP_DIR, `${book}.json`),
      JSON.stringify(output, null, 2) + "\n",
      "utf8",
    );
  }

  // ==========================================================
  // Install
  // ==========================================================

  await fs.rm(OUTPUT_DIR, {
    recursive: true,
    force: true,
  });

  await fs.mkdir(path.dirname(OUTPUT_DIR), {
    recursive: true,
  });

  await fs.rename(TEMP_DIR, OUTPUT_DIR);

  console.log("=".repeat(70));

  console.log("BUILD COMPLETE");

  console.log("=".repeat(70));

  console.log();
  console.log(`Output: ${OUTPUT_DIR}`);

  console.log("Files: 66");

  console.log();
}

// ============================================================
// Merge verses
// ============================================================

function mergeVerses(target, verses) {
  for (const [verse, text] of Object.entries(verses)) {
    if (!text) {
      continue;
    }

    if (!target[verse]) {
      target[verse] = text;
      continue;
    }

    /*
     * Sometimes a chapter is split across multiple
     * paragraphs. Append new material instead of
     * overwriting it.
     */

    if (!target[verse].includes(text)) {
      target[verse] = cleanText(target[verse] + " " + text);
    }
  }
}

main().catch((error) => {
  console.error();
  console.error("ERROR:");
  console.error(error.message);
  process.exit(1);
});
