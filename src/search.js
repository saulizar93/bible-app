import { BOOKS, byId } from "./books.js";
import { loadBook, loadNotes, optionFor, keyStart } from "./data.js";

// Fast lookup for books that currently have study notes
const BOOKS_WITH_NOTES = new Set([40]); // Book 40: Matthew

const stripAccents = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function makeAccentPattern(str) {
  const map = {
    a: "[aáàäâã]",
    e: "[eéèëê]",
    i: "[iíìïî]",
    o: "[oóòöôõ]",
    u: "[uúùüû]",
    n: "[nñ]",
    c: "[cç]",
  };
  return str
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      const escaped = ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return map[lower] || escaped;
    })
    .join("");
}

export function textMatches(text, query) {
  if (!text || !query) return false;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (lowerText.includes(lowerQuery)) return true;
  return stripAccents(lowerText).includes(stripAccents(lowerQuery));
}

export function createSnippet(text, query, maxLen = 160) {
  if (!text || !query) return text || "";
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) {
    const strippedText = stripAccents(lowerText);
    const strippedQuery = stripAccents(lowerQuery);
    idx = strippedText.indexOf(strippedQuery);
  }

  if (idx === -1 || text.length <= maxLen) return text;

  const half = Math.floor((maxLen - query.length) / 2);
  let start = Math.max(0, idx - half);
  let end = Math.min(text.length, idx + query.length + half);

  if (start > 0) {
    const spaceIdx = text.indexOf(" ", start);
    if (spaceIdx !== -1 && spaceIdx < idx) start = spaceIdx + 1;
  }
  if (end < text.length) {
    const spaceIdx = text.lastIndexOf(" ", end);
    if (spaceIdx !== -1 && spaceIdx > idx + query.length) end = spaceIdx;
  }

  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = "… " + snippet;
  if (end < text.length) snippet = snippet + " …";
  return snippet;
}

export function splitSnippet(text, query) {
  if (!query || !text) return [{ text: text || "", highlight: false }];
  try {
    const pattern = makeAccentPattern(query);
    const regex = new RegExp(`(${pattern})`, "gi");
    const parts = text.split(regex);
    return parts.map((part) => ({
      text: part,
      highlight: regex.test(part),
    }));
  } catch {
    return [{ text, highlight: false }];
  }
}

/**
 * Searches across the active panes for verses or notes containing the query.
 *
 * @param {string} query Search term
 * @param {string[]} paneCodes Array of active pane codes (e.g. ['kjv-strong', 'notes:en'])
 * @param {string} currentBookId Active book ID to search first (e.g. 'MAT')
 * @param {object} options { onProgress, signal, maxResults }
 * @returns {Promise<Array>} List of matches
 */
export async function searchAvailablePanes(
  query,
  paneCodes,
  currentBookId,
  { onProgress, signal, maxResults = 120 } = {},
) {
  const trimmed = (query || "").trim();
  if (!trimmed || trimmed.length < 2) return [];

  const configs = [...new Set(paneCodes)].map(optionFor).filter(Boolean);

  if (configs.length === 0) return [];

  const currentBook = BOOKS.find((b) => b.id === currentBookId);
  const otherBooks = BOOKS.filter((b) => b.id !== currentBookId);
  const orderedBooks = currentBook ? [currentBook, ...otherBooks] : BOOKS;

  const matches = [];

  for (const b of orderedBooks) {
    if (signal?.aborted) break;

    for (const config of configs) {
      if (signal?.aborted) break;

      if (config.kind === "bible") {
        try {
          const bookData = await loadBook(config.code, b.n);
          if (!bookData?.v) continue;

          for (const chStr in bookData.v) {
            if (signal?.aborted) break;
            const ch = parseInt(chStr, 10);
            const verses = bookData.v[chStr];
            if (!Array.isArray(verses)) continue;

            for (let vIdx = 0; vIdx < verses.length; vIdx++) {
              const verseText = verses[vIdx];
              if (!verseText) continue;

              if (textMatches(verseText, trimmed)) {
                matches.push({
                  id: `${config.code}-${b.id}-${ch}-${vIdx + 1}`,
                  bookId: b.id,
                  bookName: b.en,
                  chapters: b.chapters,
                  chapter: ch,
                  verse: vIdx + 1,
                  sourceCode: config.code,
                  sourceLabel: config.label,
                  kind: "bible",
                  snippet: createSnippet(verseText, trimmed),
                });

                if (matches.length >= maxResults) break;
              }
            }
            if (matches.length >= maxResults) break;
          }
        } catch {
          // Ignore missing book file
        }
      } else if (config.kind === "notes" && BOOKS_WITH_NOTES.has(b.n)) {
        try {
          for (let ch = 1; ch <= b.chapters; ch++) {
            if (signal?.aborted) break;
            const notesData = await loadNotes(config.lang, b.n, ch);
            if (!notesData) continue;

            for (const key in notesData) {
              const items = notesData[key];
              if (!Array.isArray(items)) continue;

              for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
                const item = items[itemIdx];
                if (item?.x && textMatches(item.x, trimmed)) {
                  matches.push({
                    id: `${config.code}-${b.id}-${ch}-${key}-${itemIdx}`,
                    bookId: b.id,
                    bookName: b.en,
                    chapters: b.chapters,
                    chapter: ch,
                    verse: keyStart(key),
                    verseRange: key,
                    sourceCode: config.code,
                    sourceLabel: config.label,
                    kind: "notes",
                    snippet: createSnippet(item.x, trimmed),
                  });

                  if (matches.length >= maxResults) break;
                }
              }
              if (matches.length >= maxResults) break;
            }
            if (matches.length >= maxResults) break;
          }
        } catch {
          // Ignore missing notes
        }
      }

      if (matches.length >= maxResults) break;
    }

    if (onProgress && !signal?.aborted) {
      onProgress([...matches]);
    }

    if (matches.length >= maxResults) break;
  }

  return matches;
}
