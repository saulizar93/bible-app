import { get, set } from "idb-keyval";
import { normalizeStrong } from "./strongsCode.js";

const DATA_VERSION = 2; // bump to invalidate every cached Bible chapter
const NOTES_VERSION = 1; // bump separately — notes change far more often
const LEXICON_VERSION = 3; // bump when strongs/ or concord/ data is rebuilt

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
    label: "KJV w/Strong (TR)",
    kind: "bible",
    lang: "en",
    strongs: true,
    concord: "", // concordance at data/concord/{greek,hebrew}
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
    label: "DRC (Catholic-Latin)",
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
    code: "rv1909-strong",
    label: "RV1909 c/Strong (TR)",
    kind: "bible",
    lang: "es",
    strongs: true,
    concord: "rv1909-strong/", // data/concord/rv1909-strong/{greek,hebrew}
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
    label: "BTA (Católica-Latín)",
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
/** "H1254" -> "hebrew", "G26" -> "greek" — the two numbering systems overlap. */
const langOf = (code) => (code[0] === "H" ? "hebrew" : "greek");

/** Encode/decode a verse reference as a single sortable integer. */
export const vidOf = (bookNum, chapter, verse) =>
  bookNum * 1_000_000 + chapter * 1_000 + verse;
export const decodeVid = (vid) => ({
  n: Math.floor(vid / 1_000_000),
  c: Math.floor((vid % 1_000_000) / 1_000),
  v: vid % 1_000,
});

/** Look up one Strong's number's dictionary entry, e.g. loadStrongsEntry("G26") or ("H1254"). */
export async function loadStrongsEntry(rawCode) {
  const code = normalizeStrong(rawCode);
  const num = parseInt(code.slice(1), 10);
  const shard = shardStart(num);
  const lang = langOf(code);
  const data = await cachedFetch(
    `strongs/${lang}/${shard}@${LEXICON_VERSION}`,
    `${import.meta.env.BASE_URL}data/strongs/${lang}/${shard}.json`,
  );
  return data ? data[code] || null : null;
}

/** All verse ids where this Strong's number occurs, e.g. loadConcordance("G26") or ("H1254").
 *  `source` = the tagged translation the word was tapped in (each has its own
 *  concordance, since translations tag different verses); defaults to the KJV. */
export async function loadConcordance(rawCode, source) {
  const code = normalizeStrong(rawCode);
  const num = parseInt(code.slice(1), 10);
  const shard = shardStart(num);
  const lang = langOf(code);
  const dir = `${optionFor(source)?.concord ?? optionFor(strongsSourceCode())?.concord ?? ""}${lang}`;
  const data = await cachedFetch(
    `concord/${dir}/${shard}@${LEXICON_VERSION}`,
    `${import.meta.env.BASE_URL}data/concord/${dir}/${shard}.json`,
  );
  return (data && data[code]) || [];
}
