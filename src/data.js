import { get, set } from "idb-keyval";
import { normalizeStrong } from "./strongsCode.js";

const DATA_VERSION = 1; // bump to invalidate every cached Bible chapter
const NOTES_VERSION = 1; // bump separately — notes change far more often

// One combined list drives both pane dropdowns, so either side can hold
// a translation or a notes set.
export const PANE_OPTIONS = [
  // {
  //   code: "kjv",
  //   label: "KJV",
  //   kind: "bible",
  //   lang: "en",
  //   citation: "KJV",
  // },
  {
    code: "kjv-strong",
    label: "KJV w/Greek (TR)",
    kind: "bible",
    lang: "en",
    strongs: true,
    citation: "KJV",
  },
  {
    code: "bsb",
    label: "BSB (CT)",
    kind: "bible",
    lang: "en",
    citation: "BSB",
  },
  {
    code: "msb",
    label: "MSB (MT)",
    kind: "bible",
    lang: "en",
    citation: "MSB",
  },
  {
    code: "lsv",
    label: "LSV (TR)",
    kind: "bible",
    lang: "en",
    citation: "LSV",
  },
  {
    code: "drc1750",
    label: "DRC1750 (Catholic from Latin)",
    kind: "bible",
    lang: "en",
    citation: "DRC1750",
  },
  {
    code: "rv1909",
    label: "RV1909 (TR)",
    kind: "bible",
    lang: "es",
    citation: "RV1909",
  },
  {
    code: "rvg",
    label: "RVG (TR)",
    kind: "bible",
    lang: "es",
    citation: "RVG",
  },
  {
    code: "torres-amat",
    label: "Torres-Amat (Catolica del Latin)",
    kind: "bible",
    lang: "es",
    citation: "Torres-Amat",
  },
  {
    code: "notes:en",
    label: "Notes (EN)",
    kind: "notes",
    lang: "en",
    citation: "Notes (EN)",
  },
  {
    code: "notes:es",
    label: "Notas (ES)",
    kind: "notes",
    lang: "es",
    citation: "Notas (ES)",
  },
];
export const optionFor = (code) => PANE_OPTIONS.find((o) => o.code === code);

/** Which translation's code holds Strong's-tagged data — used to fetch
 *  verse context for occurrence snippets without hardcoding "kjv-strong". */
export const strongsSourceCode = () =>
  PANE_OPTIONS.find((o) => o.strongs)?.code;

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
    let data;
    try {
      data = await res.json();
    } catch {
      // Some dev servers (Vite's SPA fallback among them) return index.html
      // with a 200 status for a missing file instead of a real 404 — treat
      // "not valid JSON" the same as "not found" rather than throwing.
      return null;
    }
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
    `${import.meta.env.BASE_URL}data/bibles/${code}/${bookNum}.json`,
  );

export const loadNotes = (lang, bookNum, chapter) =>
  cachedFetch(
    `notes/${lang}/${bookNum}/${chapter}@${NOTES_VERSION}`,
    `${import.meta.env.BASE_URL}data/notes/${lang}/${bookNum}/${chapter}.json`,
  );

/** Does verse `v` fall inside a note's key, "7" or "3-5"? */
export function keyCovers(key, v) {
  const [a, b] = key.split("-").map(Number);
  return b ? v >= a && v <= b : v === a;
}
export function keyStart(key) {
  return parseInt(key, 10);
}

/* ---------- Strong's: lexicon + concordance ---------- */

const SHARD_SIZE = 500;
const shardStart = (n) => Math.floor((n - 1) / SHARD_SIZE) * SHARD_SIZE + 1;

/** Encode/decode a verse reference as a single sortable integer. */
export const vidOf = (bookNum, chapter, verse) =>
  bookNum * 1_000_000 + chapter * 1_000 + verse;
export const decodeVid = (vid) => ({
  n: Math.floor(vid / 1_000_000),
  c: Math.floor((vid % 1_000_000) / 1_000),
  v: vid % 1_000,
});

/** Look up one Strong's number's dictionary entry, e.g. loadStrongsEntry("G26"). */
export async function loadStrongsEntry(rawCode) {
  const code = normalizeStrong(rawCode);
  const num = parseInt(code.slice(1), 10);
  const shard = shardStart(num);
  const data = await cachedFetch(
    `strongs/greek/${shard}`,
    `${import.meta.env.BASE_URL}data/strongs/greek/${shard}.json`,
  );
  return data ? data[code] || null : null;
}

/** All verse ids where this Strong's number occurs, e.g. loadConcordance("G26"). */
export async function loadConcordance(rawCode) {
  const code = normalizeStrong(rawCode);
  const num = parseInt(code.slice(1), 10);
  const shard = shardStart(num);
  const data = await cachedFetch(
    `concord/greek/${shard}`,
    `${import.meta.env.BASE_URL}data/concord/greek/${shard}.json`,
  );
  return (data && data[code]) || [];
}
