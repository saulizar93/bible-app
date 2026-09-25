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

const KJV_DIR = path.join(
  PROJECT_ROOT,
  "public",
  "data",
  "bibles",
  "kjv-strong",
);

const MISSING_REPORT = path.join(PROJECT_ROOT, "torres-amat-missing.txt");

/*
 * =========================================================
 * CANONICAL BOOKS 6–66
 * =========================================================
 *
 * The aliases are deliberately explicit.
 *
 * This prevents Apocrypha books from accidentally shifting
 * our numbering.
 */

const BOOKS = [
  {
    n: 6,
    name: "Joshua",
    aliases: ["JOSUÉ", "JOSUE"],
  },
  {
    n: 7,
    name: "Judges",
    aliases: ["JUECES"],
  },
  {
    n: 8,
    name: "Ruth",
    aliases: ["RUT"],
  },
  {
    n: 9,
    name: "1 Samuel",
    aliases: [
      "PRIMERO SAMUEL",
      "PRIMERO DE SAMUEL",
      "PRIMER LIBRO DE SAMUEL",
      "PRIMER LIBRO SAMUEL",
    ],
  },
  {
    n: 10,
    name: "2 Samuel",
    aliases: [
      "SEGUNDO SAMUEL",
      "SEGUNDO DE SAMUEL",
      "SEGUNDO LIBRO DE SAMUEL",
      "SEGUNDO LIBRO SAMUEL",
    ],
  },
  {
    n: 11,
    name: "1 Kings",
    aliases: [
      "PRIMERO REYES",
      "PRIMERO DE REYES",
      "PRIMER LIBRO DE LOS REYES",
      "PRIMER LIBRO DE REYES",
      "PRIMERO DE LOS REYES",
    ],
  },
  {
    n: 12,
    name: "2 Kings",
    aliases: [
      "SEGUNDO REYES",
      "SEGUNDO DE REYES",
      "SEGUNDO LIBRO DE LOS REYES",
      "SEGUNDO LIBRO DE REYES",
      "SEGUNDO DE LOS REYES",
    ],
  },
  {
    n: 13,
    name: "1 Chronicles",
    aliases: [
      "PRIMERO CRÓNICAS",
      "PRIMERO CRONICAS",
      "PRIMERO DE CRÓNICAS",
      "PRIMERO DE CRONICAS",
      "PRIMER LIBRO DE LAS CRÓNICAS",
      "PRIMER LIBRO DE LAS CRONICAS",
      "PRIMER LIBRO DE CRÓNICAS",
      "PRIMER LIBRO DE CRONICAS",
    ],
  },
  {
    n: 14,
    name: "2 Chronicles",
    aliases: [
      "SEGUNDO CRÓNICAS",
      "SEGUNDO CRONICAS",
      "SEGUNDO DE CRÓNICAS",
      "SEGUNDO DE CRONICAS",
      "SEGUNDO LIBRO DE LAS CRÓNICAS",
      "SEGUNDO LIBRO DE LAS CRONICAS",
      "SEGUNDO LIBRO DE CRÓNICAS",
      "SEGUNDO LIBRO DE CRONICAS",
    ],
  },
  {
    n: 15,
    name: "Ezra",
    aliases: [
      "ESDRAS",
      "PRIMERO ESDRAS",
      "PRIMERO DE ESDRAS",
      "PRIMER LIBRO DE ESDRAS",
    ],
  },
  {
    n: 16,
    name: "Nehemiah",
    aliases: ["NEHEMÍAS", "NEHEMIAS"],
  },
  {
    n: 17,
    name: "Esther",
    aliases: ["ESTER", "ESTHER"],
  },
  {
    n: 18,
    name: "Job",
    aliases: ["JOB"],
  },
  {
    n: 19,
    name: "Psalms",
    aliases: ["SALMOS", "LOS SALMOS"],
  },
  {
    n: 20,
    name: "Proverbs",
    aliases: ["PROVERBIOS", "LOS PROVERBIOS"],
  },
  {
    n: 21,
    name: "Ecclesiastes",
    aliases: [
      "ECLESIASTÉS",
      "ECLESIASTES",
      "ECLESIASTÉS O EL ECLESIASTÉS",
      "ECLESIASTES O EL ECLESIASTES",
    ],
  },
  {
    n: 22,
    name: "Song of Solomon",
    aliases: ["CANTAR DE LOS CANTARES", "CANTARES", "CANTAR DE CANTARES"],
  },
  {
    n: 23,
    name: "Isaiah",
    aliases: ["ISAÍAS", "ISAIAS"],
  },
  {
    n: 24,
    name: "Jeremiah",
    aliases: ["JEREMÍAS", "JEREMIAS"],
  },
  {
    n: 25,
    name: "Lamentations",
    aliases: ["LAMENTACIONES"],
  },
  {
    n: 26,
    name: "Ezekiel",
    aliases: ["EZEQUIEL"],
  },
  {
    n: 27,
    name: "Daniel",
    aliases: ["DANIEL"],
  },
  {
    n: 28,
    name: "Hosea",
    aliases: ["OSEAS", "OSEE"],
  },
  {
    n: 29,
    name: "Joel",
    aliases: ["JOEL"],
  },
  {
    n: 30,
    name: "Amos",
    aliases: ["AMOS"],
  },
  {
    n: 31,
    name: "Obadiah",
    aliases: ["ABDÍAS", "ABDIAS"],
  },
  {
    n: 32,
    name: "Jonah",
    aliases: ["JONÁS", "JONAS"],
  },
  {
    n: 33,
    name: "Micah",
    aliases: ["MIQUEAS"],
  },
  {
    n: 34,
    name: "Nahum",
    aliases: ["NAHUM"],
  },
  {
    n: 35,
    name: "Habakkuk",
    aliases: ["HABACUC", "HABACÚC"],
  },
  {
    n: 36,
    name: "Zephaniah",
    aliases: ["SOFONÍAS", "SOFONIAS"],
  },
  {
    n: 37,
    name: "Haggai",
    aliases: ["AGEO"],
  },
  {
    n: 38,
    name: "Zechariah",
    aliases: ["ZACARÍAS", "ZACARIAS"],
  },
  {
    n: 39,
    name: "Malachi",
    aliases: ["MALAQUÍAS", "MALAQUIAS"],
  },
  {
    n: 40,
    name: "Matthew",
    aliases: ["SAN MATEO", "MATEO"],
  },
  {
    n: 41,
    name: "Mark",
    aliases: ["SAN MARCOS", "MARCOS"],
  },
  {
    n: 42,
    name: "Luke",
    aliases: ["SAN LUCAS", "LUCAS"],
  },
  {
    n: 43,
    name: "John",
    aliases: ["SAN JUAN", "JUAN"],
  },
  {
    n: 44,
    name: "Acts",
    aliases: [
      "HECHOS DE LOS APÓSTOLES",
      "HECHOS DE LOS APOSTOLES",
      "HECHOS APOSTÓLICOS",
      "HECHOS APOSTOLICOS",
      "HECHOS",
    ],
  },
  {
    n: 45,
    name: "Romans",
    aliases: ["ROMANOS", "EPÍSTOLA A LOS ROMANOS", "EPISTOLA A LOS ROMANOS"],
  },
  {
    n: 46,
    name: "1 Corinthians",
    aliases: [
      "PRIMERA A LOS CORINTIOS",
      "PRIMERA EPÍSTOLA A LOS CORINTIOS",
      "PRIMERA EPISTOLA A LOS CORINTIOS",
      "PRIMERA CORINTIOS",
    ],
  },
  {
    n: 47,
    name: "2 Corinthians",
    aliases: [
      "SEGUNDA A LOS CORINTIOS",
      "SEGUNDA EPÍSTOLA A LOS CORINTIOS",
      "SEGUNDA EPISTOLA A LOS CORINTIOS",
      "SEGUNDA CORINTIOS",
    ],
  },
  {
    n: 48,
    name: "Galatians",
    aliases: [
      "GÁLATAS",
      "GALATAS",
      "EPÍSTOLA A LOS GÁLATAS",
      "EPISTOLA A LOS GALATAS",
    ],
  },
  {
    n: 49,
    name: "Ephesians",
    aliases: ["EFESIOS", "EPÍSTOLA A LOS EFESIOS", "EPISTOLA A LOS EFESIOS"],
  },
  {
    n: 50,
    name: "Philippians",
    aliases: [
      "FILIPENSES",
      "EPÍSTOLA A LOS FILIPENSES",
      "EPISTOLA A LOS FILIPENSES",
    ],
  },
  {
    n: 51,
    name: "Colossians",
    aliases: [
      "COLOSENSES",
      "EPÍSTOLA A LOS COLOSENSES",
      "EPISTOLA A LOS COLOSENSES",
    ],
  },
  {
    n: 52,
    name: "1 Thessalonians",
    aliases: [
      "PRIMERA A LOS TESALONICENSES",
      "PRIMERA EPÍSTOLA A LOS TESALONICENSES",
      "PRIMERA EPISTOLA A LOS TESALONICENSES",
      "PRIMERA TESALONICENSES",
    ],
  },
  {
    n: 53,
    name: "2 Thessalonians",
    aliases: [
      "SEGUNDA A LOS TESALONICENSES",
      "SEGUNDA EPÍSTOLA A LOS TESALONICENSES",
      "SEGUNDA EPISTOLA A LOS TESALONICENSES",
      "SEGUNDA TESALONICENSES",
    ],
  },
  {
    n: 54,
    name: "1 Timothy",
    aliases: [
      "PRIMERA A TIMOTEO",
      "PRIMERA EPÍSTOLA A TIMOTEO",
      "PRIMERA EPISTOLA A TIMOTEO",
      "PRIMERA TIMOTEO",
    ],
  },
  {
    n: 55,
    name: "2 Timothy",
    aliases: [
      "SEGUNDA A TIMOTEO",
      "SEGUNDA EPÍSTOLA A TIMOTEO",
      "SEGUNDA EPISTOLA A TIMOTEO",
      "SEGUNDA TIMOTEO",
    ],
  },
  {
    n: 56,
    name: "Titus",
    aliases: ["A TITO", "EPÍSTOLA A TITO", "EPISTOLA A TITO", "TITO"],
  },
  {
    n: 57,
    name: "Philemon",
    aliases: [
      "A FILEMÓN",
      "A FILEMON",
      "EPÍSTOLA A FILEMÓN",
      "EPISTOLA A FILEMON",
      "FILEMÓN",
      "FILEMON",
    ],
  },
  {
    n: 58,
    name: "Hebrews",
    aliases: [
      "A LOS HEBREOS",
      "EPÍSTOLA A LOS HEBREOS",
      "EPISTOLA A LOS HEBREOS",
      "HEBREOS",
    ],
  },
  {
    n: 59,
    name: "James",
    aliases: ["EPÍSTOLA DE SANTIAGO", "EPISTOLA DE SANTIAGO", "SANTIAGO"],
  },
  {
    n: 60,
    name: "1 Peter",
    aliases: [
      "PRIMERA EPÍSTOLA DE SAN PEDRO",
      "PRIMERA EPISTOLA DE SAN PEDRO",
      "PRIMERA DE PEDRO",
      "PRIMERA PEDRO",
    ],
  },
  {
    n: 61,
    name: "2 Peter",
    aliases: [
      "SEGUNDA EPÍSTOLA DE SAN PEDRO",
      "SEGUNDA EPISTOLA DE SAN PEDRO",
      "SEGUNDA DE PEDRO",
      "SEGUNDA PEDRO",
    ],
  },
  {
    n: 62,
    name: "1 John",
    aliases: [
      "PRIMERA EPÍSTOLA DE SAN JUAN",
      "PRIMERA EPISTOLA DE SAN JUAN",
      "PRIMERA DE JUAN",
      "PRIMERA JUAN",
    ],
  },
  {
    n: 63,
    name: "2 John",
    aliases: [
      "SEGUNDA EPÍSTOLA DE SAN JUAN",
      "SEGUNDA EPISTOLA DE SAN JUAN",
      "SEGUNDA DE JUAN",
      "SEGUNDA JUAN",
    ],
  },
  {
    n: 64,
    name: "3 John",
    aliases: [
      "TERCERA EPÍSTOLA DE SAN JUAN",
      "TERCERA EPISTOLA DE SAN JUAN",
      "TERCERA DE JUAN",
      "TERCERA JUAN",
    ],
  },
  {
    n: 65,
    name: "Jude",
    aliases: ["EPÍSTOLA DE SAN JUDAS", "EPISTOLA DE SAN JUDAS", "JUDAS"],
  },
  {
    n: 66,
    name: "Revelation",
    aliases: ["APOCALIPSIS", "APOCALIPSIS DE SAN JUAN"],
  },
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
   NORMALIZE BOOK HEADING
   ========================================================= */

function normalizeHeading(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/* =========================================================
   FIND CHAPTER HEADINGS
   ========================================================= */

const BOOK_LOOKUP = [];

for (const book of BOOKS) {
  for (const alias of book.aliases) {
    BOOK_LOOKUP.push({
      book,
      alias: normalizeHeading(alias),
    });
  }
}

function findChapterHeading(text, searchFrom = 0) {
  const upper = normalizeHeading(text.slice(searchFrom));

  let best = null;

  for (const entry of BOOK_LOOKUP) {
    /*
     * We require:
     *
     * BOOK NAME + whitespace + CHAPTER NUMBER
     *
     * This prevents ordinary verse numbers from being
     * mistaken for chapter headings.
     */
    const regex = new RegExp(
      `(?:^|\\s)${escapeRegex(entry.alias)}\\s+([0-9]{1,3})(?=\\s|$)`,
      "g",
    );

    const match = regex.exec(upper);

    if (!match) continue;

    const chapter = Number(match[1]);

    if (chapter < 1) continue;

    const relativeStart = match.index + match[0].indexOf(entry.alias);
    const absoluteStart = searchFrom + relativeStart;

    const chapterNumberOffset = match[0].lastIndexOf(match[1]);

    const absoluteEnd =
      searchFrom + match.index + chapterNumberOffset + match[1].length;

    if (!best || absoluteStart < best.start) {
      best = {
        book: entry.book,
        chapter,
        start: absoluteStart,
        end: absoluteEnd,
      };
    }
  }

  return best;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =========================================================
   VERSE PARSER
   ========================================================= */

function findNextVerse(text, expectedVerse, searchFrom) {
  const escaped = String(expectedVerse).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const start = Math.max(0, searchFrom - 1);

  /*
   * Supports:
   *
   * 1 Text
   * 2) Text
   * 3. Text
   *
   * and markers touching the following word:
   *
   * 13y dijo...
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

function parseChapter(text, expectedCount) {
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
   READ KJV VERSE COUNTS
   ========================================================= */

function getKjvVerseCounts(bookNumber) {
  const file = path.join(KJV_DIR, `${bookNumber}.json`);

  if (!fs.existsSync(file)) {
    throw new Error(`KJV source file not found: ${file}`);
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  const counts = {};

  for (const [chapter, verses] of Object.entries(data.v || {})) {
    counts[chapter] = Array.isArray(verses) ? verses.length : 0;
  }

  return counts;
}

/* =========================================================
   START
   ========================================================= */

console.log("==============================================");
console.log(" TORRES AMAT — BOOKS 6–66 BUILDER");
console.log("==============================================");
console.log();

if (!fs.existsSync(EPUB_DIR)) {
  console.error(`ERROR: EPUB directory not found:\n${EPUB_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(KJV_DIR)) {
  console.error(`ERROR: KJV data directory not found:\n${KJV_DIR}`);
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
   COLLECT CHAPTERS
   ========================================================= */

const chapters = new Map();

let currentBook = null;
let currentChapter = null;
let currentText = "";

function chapterKey(bookNumber, chapter) {
  return `${bookNumber}:${chapter}`;
}

function saveCurrentChapter() {
  if (currentBook === null || currentChapter === null) {
    return;
  }

  const cleaned = currentText.trim();

  if (!cleaned) {
    return;
  }

  const key = chapterKey(currentBook.n, currentChapter);

  if (!chapters.has(key)) {
    chapters.set(key, cleaned);
  } else {
    const old = chapters.get(key);

    chapters.set(key, `${old} ${cleaned}`.trim());
  }

  currentText = "";
}

for (const file of htmlFiles) {
  const filePath = path.join(EPUB_DIR, file);

  const html = fs.readFileSync(filePath, "utf8");

  const text = htmlToText(html);

  let searchFrom = 0;

  while (true) {
    const heading = findChapterHeading(text, searchFrom);

    if (!heading) {
      /*
       * Anything remaining belongs to the
       * current chapter.
       */
      if (
        currentBook !== null &&
        currentChapter !== null &&
        searchFrom < text.length
      ) {
        const remaining = text.slice(searchFrom).trim();

        if (remaining) {
          currentText += (currentText ? " " : "") + remaining;
        }
      }

      break;
    }

    /*
     * Text before this heading belongs to
     * the previous chapter.
     */
    if (currentBook !== null && currentChapter !== null) {
      const before = text.slice(searchFrom, heading.start).trim();

      if (before) {
        currentText += (currentText ? " " : "") + before;
      }
    }

    /*
     * Finish previous chapter.
     */
    saveCurrentChapter();

    /*
     * Start new chapter.
     */
    currentBook = heading.book;
    currentChapter = heading.chapter;

    console.log(`Found ${currentBook.name} ${currentChapter} in ${file}`);

    /*
     * Leave verse 1 marker intact.
     */
    searchFrom = heading.end;
  }
}

/*
 * Save final chapter.
 */
saveCurrentChapter();

/* =========================================================
   VALIDATION + BUILD
   ========================================================= */

console.log();
console.log("==============================================");
console.log(" BUILDING BOOKS");
console.log("==============================================");
console.log();

fs.mkdirSync(OUTPUT_DIR, {
  recursive: true,
});

const missingReport = [];

let totalBooks = 0;
let totalChapters = 0;
let totalVerseSlots = 0;
let totalMissing = 0;

for (const book of BOOKS) {
  console.log();
  console.log("----------------------------------------------");
  console.log(`${book.n}. ${book.name}`);
  console.log("----------------------------------------------");

  const counts = getKjvVerseCounts(book.n);

  const chapterNumbers = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);

  const output = {
    b: book.n,
    c: chapterNumbers.length,
    v: {},
  };

  let bookMissing = 0;

  for (const chapter of chapterNumbers) {
    const expectedCount = counts[String(chapter)];

    const key = chapterKey(book.n, chapter);

    const sourceText = chapters.get(key) || "";

    const verses = sourceText
      ? parseChapter(sourceText, expectedCount)
      : Array(expectedCount).fill("");

    output.v[String(chapter)] = verses;

    totalChapters++;
    totalVerseSlots += verses.length;

    const missing = [];

    for (let i = 0; i < verses.length; i++) {
      if (!verses[i]) {
        missing.push(i + 1);
        bookMissing++;
        totalMissing++;
      }
    }

    if (missing.length === 0) {
      console.log(`${book.name} ${chapter}: ${expectedCount} verses OK`);
    } else {
      console.log(
        `${book.name} ${chapter}: ${expectedCount} slots — missing: ${missing.join(
          ", ",
        )}`,
      );

      for (const verse of missing) {
        missingReport.push(`${book.name} ${chapter}:${verse}`);
      }
    }
  }

  const outputFile = path.join(OUTPUT_DIR, `${book.n}.json`);

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), "utf8");

  totalBooks++;

  console.log(`Output: ${outputFile}`);

  if (bookMissing === 0) {
    console.log("Missing verses: 0");
  } else {
    console.log(`Missing verses: ${bookMissing}`);
  }
}

/* =========================================================
   WRITE MISSING REPORT
   ========================================================= */

const report = [
  "==============================================",
  "TORRES AMAT — MISSING SOURCE VERSES",
  "==============================================",
  "",
  `Books processed: ${totalBooks}`,
  `Chapters processed: ${totalChapters}`,
  `Verse slots: ${totalVerseSlots}`,
  `Missing verses: ${totalMissing}`,
  "",
];

if (missingReport.length) {
  report.push(
    "SOURCE GAPS TO FIX MANUALLY:",
    "",
    ...missingReport.map((ref) => `  ${ref}`),
  );
} else {
  report.push("No missing source verses detected.");
}

report.push(
  "",
  "Missing source material is represented",
  "by empty strings in the corresponding JSON.",
  "",
);

fs.writeFileSync(MISSING_REPORT, report.join("\n"), "utf8");

/* =========================================================
   COMPLETE
   ========================================================= */

console.log();
console.log("==============================================");
console.log(" BUILD COMPLETE");
console.log("==============================================");
console.log();

console.log(`Books processed: ${totalBooks}`);
console.log(`Chapters processed: ${totalChapters}`);
console.log(`Total verse slots: ${totalVerseSlots}`);
console.log(`Missing verses: ${totalMissing}`);

console.log();
console.log(`Missing report: ${MISSING_REPORT}`);

console.log();

if (totalMissing > 0) {
  console.log("IMPORTANT: Missing verses were NOT invented.");
  console.log("They were written as empty strings for manual correction.");
} else {
  console.log("No missing source verses detected.");
}
