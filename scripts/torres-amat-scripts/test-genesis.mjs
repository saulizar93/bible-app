import fs from "fs";

const FILE = "C:\\Users\\saulo\\Downloads\\petisco-epub\\index_split_000.html";

const html = fs.readFileSync(FILE, "utf8");

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html) {
  return decodeEntities(
    html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""),
  )
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Extract paragraphs.
 */
const paragraphs = [];

const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

let match;

while ((match = pRegex.exec(html))) {
  const rawHtml = match[1];

  const text = htmlToText(rawHtml);

  if (text) {
    paragraphs.push({
      html: rawHtml,
      text,
    });
  }
}

console.log(`Paragraphs found: ${paragraphs.length}`);

/*
 * Build chapters.
 *
 * IMPORTANT:
 * We identify chapter headings from the actual bold span:
 *
 *   <span class="bold">GÉNESIS 27</span>
 *
 * rather than trying to infer them from plain text.
 */
const chapters = {};

let currentChapter = null;

for (const paragraph of paragraphs) {
  const headingMatch = paragraph.html.match(
    /<span\b[^>]*class=["'][^"']*\bbold\b[^"']*["'][^>]*>\s*GÉNESIS\s+(\d+)\s*<\/span>/i,
  );

  if (headingMatch) {
    currentChapter = Number(headingMatch[1]);

    chapters[currentChapter] = "";

    /*
     * Everything after the chapter heading belongs to this chapter.
     */
    const headingEnd = headingMatch.index + headingMatch[0].length;

    const remainderHtml = paragraph.html.slice(headingEnd);
    const remainder = htmlToText(remainderHtml);

    if (remainder) {
      chapters[currentChapter] = remainder;
    }

    continue;
  }

  if (currentChapter !== null) {
    chapters[currentChapter] +=
      (chapters[currentChapter] ? " " : "") + paragraph.text;
  }
}

/*
 * Print chapter list.
 */
const chapterNumbers = Object.keys(chapters)
  .map(Number)
  .sort((a, b) => a - b);

console.log("\nChapters detected:");
console.log(chapterNumbers);

/*
 * Parse verses.
 *
 * Accept:
 *
 *   1 Text
 *   8. Text
 *   15. Text
 *   24) Text
 *
 * But don't treat arbitrary numbers inside words as verse numbers.
 */
function parseVerses(text) {
  const verses = [];

  // Find verse numbers that are followed by either:
  //   whitespace
  //   "."
  //   ")"
  //   or directly by a lowercase/uppercase letter (e.g. "13y dijo")
  //
  // We use the expected sequential number to avoid accidentally
  // treating ordinary numbers inside the prose as verse markers.

  let expectedVerse = 1;
  let searchFrom = 0;

  while (expectedVerse <= 200) {
    const escaped = String(expectedVerse).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    const regex = new RegExp(
      `(?:^|\\s)(${escaped})(?=(?:[.)]\\s*)|(?:\\s+)|(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]))`,
      "g",
    );

    regex.lastIndex = searchFrom;

    const match = regex.exec(text);

    if (!match) {
      break;
    }

    const markerStart = match.index;
    const numberStart = markerStart + match[0].indexOf(match[1]);

    // Find where the actual verse text begins.
    let contentStart = numberStart + match[1].length;

    // Consume optional punctuation and whitespace after the number.
    while (contentStart < text.length && /[\s.)]/.test(text[contentStart])) {
      contentStart++;
    }

    // Search for the next expected verse.
    const nextVerse = expectedVerse + 1;
    let nextMatch = null;

    if (nextVerse <= 200) {
      const nextEscaped = String(nextVerse).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      const nextRegex = new RegExp(
        `(?:^|\\s)(${nextEscaped})(?=(?:[.)]\\s*)|(?:\\s+)|(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]))`,
        "g",
      );

      nextRegex.lastIndex = contentStart;
      nextMatch = nextRegex.exec(text);
    }

    const contentEnd = nextMatch ? nextMatch.index : text.length;

    const verseText = text.slice(contentStart, contentEnd).trim();

    verses.push({
      verse: expectedVerse,
      text: verseText,
    });

    expectedVerse++;

    if (nextMatch) {
      searchFrom = nextMatch.index;
    } else {
      break;
    }
  }

  return verses;
}

/*
 * Genesis expected chapter count.
 */
const expectedVerses = {
  1: 31,
  2: 25,
  3: 24,
  4: 26,
  5: 32,
  6: 22,
  7: 24,
  8: 22,
  9: 29,
  10: 32,
  11: 32,
  12: 20,
  13: 18,
  14: 24,
  15: 21,
  16: 16,
  17: 27,
  18: 33,
  19: 38,
  20: 18,
  21: 34,
  22: 24,
  23: 20,
  24: 67,
  25: 34,
  26: 35,
  27: 46,
  28: 22,
  29: 35,
  30: 43,
  31: 55,
  32: 32,
  33: 20,
  34: 31,
  35: 29,
  36: 43,
  37: 36,
  38: 30,
  39: 23,
};

console.log("\nVerse counts:");

for (const chapter of chapterNumbers) {
  const verses = parseVerses(chapters[chapter]);

  const expected = expectedVerses[chapter];

  const status = expected === verses.length ? "OK" : `EXPECTED ${expected}`;

  console.log(`Genesis ${chapter}: ${verses.length} verses — ${status}`);

  /*
   * Show first and last verse for Genesis 27,
   * since this was the problematic chapter.
   */
  if (chapter === 27) {
    console.log("\nGenesis 27 first verses:");

    for (const verse of verses.slice(0, 3)) {
      console.log(`  ${verse.verse}: ${verse.text.slice(0, 120)}`);
    }

    console.log("\nGenesis 27 last verse:");

    const last = verses.at(-1);

    console.log(`  ${last.verse}: ${last.text}`);
  }

  for (const chapter of [5, 11, 19]) {
    console.log("\n========================================");
    console.log(`GENESIS ${chapter}`);
    console.log("========================================");

    console.log(chapters[chapter]);
  }
}
