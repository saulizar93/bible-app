import { get, set } from "idb-keyval";

const DATA_VERSION = 1; // bump to invalidate every cached Bible chapter
const NOTES_VERSION = 1; // bump separately — notes change far more often

// One combined list drives both pane dropdowns, so either side can hold
// a translation or a notes set.
export const PANE_OPTIONS = [
  { code: "kjv", label: "KJV", kind: "bible", lang: "en" },
  { code: "bsb", label: "BSB", kind: "bible", lang: "en" },
  { code: "msb", label: "MSB", kind: "bible", lang: "en" },
  { code: "lsv", label: "LSV", kind: "bible", lang: "en" },
  { code: "drc1750", label: "DRC1750", kind: "bible", lang: "en" },
  { code: "rv1909", label: "RV1909", kind: "bible", lang: "es" },
  { code: "rvg", label: "RVG", kind: "bible", lang: "es" },
  { code: "notes:en", label: "Notes (EN)", kind: "notes", lang: "en" },
  { code: "notes:es", label: "Notas (ES)", kind: "notes", lang: "es" },
];
export const optionFor = (code) => PANE_OPTIONS.find((o) => o.code === code);

/* ---------- memory -> IndexedDB -> network ---------- */

const mem = new Map();

function cachedFetch(key, url) {
  if (mem.has(key)) return mem.get(key);

  const promise = (async () => {
    try {
      const cached = await get(key);
      if (cached !== undefined) return cached;
    } catch {
      /* private mode, etc. — fall through to network */
    }

    const res = await fetch(url);
    if (res.status === 404) return null; // "nothing written yet" — not an error
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const data = await res.json();
    set(key, data).catch(() => {});
    return data;
  })();

  mem.set(key, promise); // dedupe concurrent requests for the same key
  promise.catch(() => mem.delete(key));
  return promise;
}

export const loadBook = (code, bookNum) =>
  cachedFetch(
    `bible/${code}/${bookNum}@${DATA_VERSION}`,
    `/data/bibles/${code}/${bookNum}.json`,
  );

export const loadNotes = (lang, bookNum, chapter) =>
  cachedFetch(
    `notes/${lang}/${bookNum}/${chapter}@${NOTES_VERSION}`,
    `/data/notes/${lang}/${bookNum}/${chapter}.json`,
  );

/** Does verse `v` fall inside a note's key, "7" or "3-5"? */
export function keyCovers(key, v) {
  const [a, b] = key.split("-").map(Number);
  return b ? v >= a && v <= b : v === a;
}
export function keyStart(key) {
  return parseInt(key, 10);
}
