import { get, set, clear } from "idb-keyval";
import { normalizeStrong } from "./strongsCode.js";

const DATA_VERSION = 3; // bump to invalidate every cached Bible chapter
const NOTES_VERSION = 2; // bump separately — notes change far more often
const LEXICON_VERSION = 3; // bump when strongs/ or concord/ data is rebuilt

/** Shown to users (menu footer, notes authorship line) so they can tell when
 *  new data has been published and clear their saved copies in Settings. */
export const VERSIONS = { data: DATA_VERSION, notes: NOTES_VERSION, lexicon: LEXICON_VERSION };

// One combined list drives both pane dropdowns, so either side can hold
// a translation or a notes set. `copyright` is shown under the last verse of
// every chapter (BiblePane).
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
    copyright:
      "King James Version (1769). Public Domain. Strong's numbers and morphology © 2003–2023 CrossWire Bible Society (KJV2003 Project), licensed for any use.",
  },
  {
    code: "bsb-strong",
    label: "BSB w/Strong (CT)",
    kind: "bible",
    lang: "en",
    strongs: true,
    concord: "bsb-strong/", // data/concord/bsb-strong/{greek,hebrew}
    citation: "BSB",
    copyright:
      "Berean Standard Bible. Public Domain (CC0). BSB Publishing, LLC. Strong's numbers from the CrossWire SWORD module (bsb-to-sword, v2.0); Greek forms and morphology matched from the KJV2003 Project (CrossWire).",
  },
  // {
  //   code: "bsb",
  //   label: "BSB (CT)",
  //   kind: "bible",
  //   lang: "en",
  //   citation: "BSB",
  //   copyright: "Berean Standard Bible. Public Domain. BSB Publishing, LLC.",
  // },
  {
    code: "msb-strong",
    label: "MSB w/Strong (MT)",
    kind: "bible",
    lang: "en",
    strongs: true,
    concord: "msb-strong/", // data/concord/msb-strong/{greek,hebrew}
    citation: "MSB",
    copyright:
      "Majority Standard Bible. Public Domain (CC0). Berean Bible Translation Committee. Strong's numbers carried over from the Berean Standard Bible where the wording is shared; words unique to the MSB are untagged. Greek forms and morphology matched from the KJV2003 Project (CrossWire).",
  },
  // {
  //   code: "msb",
  //   label: "MSB (MT)",
  //   kind: "bible",
  //   lang: "en",
  //   citation: "MSB",
  //   copyright:
  //     "Majority Standard Bible. Public Domain. Berean Bible Translation Committee.",
  // },
  {
    code: "lsv",
    label: "LSV (TR)",
    kind: "bible",
    lang: "en",
    citation: "LSV",
    copyright:
      "Literal Standard Version © 2020 Covenant Press. Licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0).",
  },
  {
    code: "drc1750",
    label: "DRC (Catholic, Latin)",
    kind: "bible",
    lang: "en",
    citation: "DRC1750",
    copyright:
      "Douay-Rheims Bible, Challoner revision (1749–1752). Public Domain.",
  },
  // {
  //   code: "rv1909",
  //   label: "RV1909 (TR)",
  //   kind: "bible",
  //   lang: "es",
  //   citation: "RV1909",
  //   copyright: "Reina-Valera 1909. Dominio público.",
  // },
  {
    code: "rv1909-strong",
    label: "RV1909 c/Strong (TR)",
    kind: "bible",
    lang: "es",
    strongs: true,
    concord: "rv1909-strong/", // data/concord/rv1909-strong/{greek,hebrew}
    citation: "RV1909",
    copyright:
      "Reina-Valera 1909. Dominio público. Números de Strong © Rubén Gómez; distribución autorizada a CrossWire Bible Society.",
  },
  {
    code: "rvg",
    label: "RVG (TR)",
    kind: "bible",
    lang: "es",
    citation: "RVG",
    copyright:
      "Santa Biblia Reina Valera Gómez © 2004, 2010, 2023 Dr. Humberto Gómez Caballero. Derechos reservados. Prohibida su reproducción con fines de lucro.",
  },
  {
    code: "torres-amat",
    label: "BTA (Católica, Latín)",
    kind: "bible",
    lang: "es",
    citation: "Torres-Amat",
    copyright:
      "Biblia de Torres Amat (1823–1825), traducción de Félix Torres Amat. Dominio público.",
  },
  {
    code: "platense",
    label: "Straubinger (Católica, TR+CT)",
    kind: "bible",
    lang: "es",
    citation: "Straubinger",
    copyright:
      "Biblia Platense, traducción de Mons. Juan Straubinger (1948). Dominio público.",
  },
  {
    code: "notes:en",
    label: "Notes (EN)",
    kind: "notes",
    lang: "en",
    citation: "Notes (EN)",
    copyright: "Oneness Study Notes written by Saul Ojeda (2026).",
  },
  {
    code: "notes:es",
    label: "Notas (ES)",
    kind: "notes",
    lang: "es",
    citation: "Notas (ES)",
    copyright:
      "Notas de estudio de la Unicidad escritas originalmente en inglés por Saul Ojeda y traducidas al español a mano y con ayuda de IA.",
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

/** Wipe everything this app has stored on the device — the IndexedDB cache of
 *  Bible chapters, notes and lexicon shards, plus every localStorage setting —
 *  so the next load fetches only the current data. Used by Settings ▸
 *  "Clear saved data". The caller reloads the page afterwards. */
export async function clearAllAppData() {
  try {
    await clear();
  } catch {
    /* store may not exist yet */
  }
  try {
    // Also drop any other databases left by older builds of the app.
    const dbs = (await indexedDB.databases?.()) || [];
    await Promise.all(
      dbs
        .filter((d) => d.name)
        .map(
          (d) =>
            new Promise((resolve) => {
              const req = indexedDB.deleteDatabase(d.name);
              req.onsuccess = req.onerror = req.onblocked = () => resolve();
            }),
        ),
    );
  } catch {
    /* indexedDB.databases() unsupported (older Firefox) */
  }
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* Cache API unavailable */
  }
  try {
    localStorage.clear();
  } catch {
    /* storage blocked */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* storage blocked */
  }
}
