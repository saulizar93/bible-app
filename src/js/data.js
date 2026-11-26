import { get, set, del, keys, clear } from "idb-keyval";
import { normalizeStrong } from "./strongsCode.js";

/* ---------- versions: public/data/manifest.json ----------
 * scripts/build-manifest.mjs (run before `npm run dev` / `npm run build`) gives every
 * data file a short content hash and every pack (one Bible, one set of notes, the
 * lexicon, one concordance) a version number that goes up only when its files change.
 * Each file is stored on the device as "<file>@<hash>", so an update re-downloads only
 * the files that changed, and pruneOldVersions() deletes the old copies once the new
 * ones are stored. No version numbers to raise by hand. */
let manifest = { packs: {}, files: {} };
let manifestFresh = false; // true once this session has the server's current manifest
const MANIFEST_KEY = "manifest";

/** Load the manifest before the app renders (src/main.jsx). Online: the server's
 *  copy (saved for later); offline or slow: the last saved copy. */
export async function initData() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${import.meta.env.BASE_URL}data/manifest.json`, {
      cache: "no-cache",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    manifest = await res.json();
    manifestFresh = true;
    set(MANIFEST_KEY, manifest).catch(() => {});
  } catch {
    try {
      manifest = (await get(MANIFEST_KEY)) || manifest;
    } catch {
      /* storage blocked: keep the empty manifest; files load from the network */
    }
  }
  // Tidy up after the app has started.
  setTimeout(() => pruneOldVersions().catch(() => {}), 3000);
}

const fileHash = (rel) => manifest.files?.[rel] || "0";

/** Version number of a pack ("bible:rvg-strong", "notes:es", "lexicon", "concord:rvg-strong"). */
export const packVersion = (pack) => manifest.packs?.[pack]?.v || 1;
/** Content signature of a pack: changes whenever any of its files changes. */
export const packSig = (pack) => manifest.packs?.[pack]?.sig || "";
/** Date the data was last published ("2026-10-28"), shown in the menu. */
export const dataUpdated = () => manifest.updated || "";

/** Books that have study notes (canonical numbers). Add a book here after
 *  building its notes with scripts/build-notes.mjs. */
export const NOTES_BOOKS = [40]; // Matthew

// One combined list drives both pane dropdowns, so either side can hold
// a translation or a notes set. `copyright` is shown under the last verse of
// every chapter (BiblePane).
// about: text in the "## " heading of this Bible's section of the Bible Translations page
// (public/data/pages/translations.<lang>.md), shown by the (i) button beside the pane picker.
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
    about: "(KJV)",
    label: "KJV (TR)",
    name: "King James Version (TR)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "en",
    strongs: true,
    // Words the translators supplied (printed in italics in the KJV) are marked
    // "it": 1 on their tokens; show them in italics, with Strong's on or off.
    italics: true,
    concord: "", // concordance at data/concord/{greek,hebrew}
    citation: "KJV",
    copyright:
      "King James Version (1769). Public Domain. Strong's numbers and morphology © 2003–2023 CrossWire Bible Society (KJV2003 Project), licensed for any use. Old Testament Hebrew parsing and words: original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb (CC BY 4.0).",
  },
  {
    code: "bsb-strong",
    about: "(BSB)",
    label: "BSB (CT)",
    name: "Berean Standard Bible (CT)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "en",
    strongs: true,
    concord: "bsb-strong/", // data/concord/bsb-strong/{greek,hebrew}
    citation: "BSB",
    copyright:
      "Berean Standard Bible. Public Domain (CC0). BSB Publishing, LLC. Strong's numbers from the CrossWire SWORD module (bsb-to-sword, v2.0); Greek forms and morphology matched from the KJV2003 Project (CrossWire). Old Testament Hebrew parsing and words: original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb (CC BY 4.0).",
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
    about: "(MSB)",
    label: "MSB (MT)",
    name: "Majority Standard Bible (MT)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "en",
    strongs: true,
    concord: "msb-strong/", // data/concord/msb-strong/{greek,hebrew}
    citation: "MSB",
    copyright:
      "Majority Standard Bible. Public Domain (CC0). Berean Bible Translation Committee. Strong's numbers carried over from the Berean Standard Bible where the wording is shared; words unique to the MSB are untagged. Greek forms and morphology matched from the KJV2003 Project (CrossWire). Old Testament Hebrew parsing and words: original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb (CC BY 4.0).",
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
    code: "lsv-strong",
    about: "(LSV)",
    label: "LSV (TR)",
    name: "Literal Standard Version (TR)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "en",
    // Strong's tags copied from kjv-strong (SOURCE=kjv-strong TARGET=lsv scripts/rvg-strong/transfer.mjs).
    strongs: true,
    concord: "", // KJV concordance (same versification)
    citation: "LSV",
    copyright:
      "Literal Standard Version © 2020 Covenant Press. Licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0). Old Testament Hebrew parsing and words: original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb (CC BY 4.0).",
  },
  {
    code: "ylt-strong",
    about: "(YLT)",
    label: "YLT (TR)",
    name: "Young's Literal Translation (TR)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "en",
    // Text from the CrossWire SWORD module "YLT" (GBF); Strong's tags copied from kjv-strong
    // (SOURCE=kjv-strong TARGET=ylt-strong scripts/rvg-strong/transfer.mjs) and Hebrew
    // parsing from the OSHB (scripts/oshb/apply-oshb.mjs). See docs/AI-LOG.md 2026-11-26.
    strongs: true,
    // Words Young supplied (italic in the module) are marked "it": 1.
    italics: true,
    concord: "", // KJV concordance (same versification)
    citation: "YLT",
    copyright:
      "Young's Literal Translation, by Robert Young (1862; revised 1887, 1898). Public Domain. Strong's numbers carried over from the KJV (© 2003–2023 CrossWire Bible Society, KJV2003 Project). Old Testament Hebrew parsing and words: original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb (CC BY 4.0).",
  },
  {
    code: "lxx",
    about: "(LXX)",
    label: "LXX (+KJV NT)",
    name: "Septuagint (+KJV NT)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "en",
    // Old Testament: Brenton's English Septuagint (eBible.org LXX2012) in KJV verse
    // numbers, its words tagged with the Strong's numbers of Rahlfs' Greek (CrossWire
    // "LXX" module) by scripts/lxx/build-lxx.py. It has no New Testament: books 40-66
    // are read from the KJV (ntFrom), Strong's and all.
    ntFrom: "kjv-strong",
    // The interlinear in its Old Testament shows the Septuagint's Greek (strongs/lxx),
    // not the Hebrew, and its English words come from this Bible itself.
    otOriginal: "lxx",
    strongs: true,
    italics: true, // words Brenton supplied (\add in the source), and the KJV's
    concord: "lxx/", // data/concord/lxx: the LXX's OT + the KJV's NT
    citation: "LXX",
    copyright:
      "Old Testament: The Septuagint, translated by Sir Lancelot C. L. Brenton (1851), with language updates by Michael Paul Johnson (LXX2012, eBible.org). Public Domain. Verses renumbered to the KJV's where the Septuagint numbers them differently. Strong's numbers and Greek words from Rahlfs' Septuaginta (1935) with morphology from the CCAT (University of Pennsylvania), CrossWire Bible Society SWORD module LXX (free non-commercial distribution). New Testament: King James Version (1769), Public Domain, with Strong's numbers © 2003–2023 CrossWire Bible Society (KJV2003 Project).",
  },
  {
    code: "drc1750",
    about: "(DRC)",
    label: "DRC (Catholic, Latin)",
    name: "Douay-Rheims Challoner (Catholic, Latin)", // full name shown on the pane picker once selected
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
    about: "(RV1909)",
    label: "RV1909 (TR)",
    name: "Reina-Valera 1909 (TR)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "es",
    strongs: true,
    concord: "rv1909-strong/", // data/concord/rv1909-strong/{greek,hebrew}
    citation: "RV1909",
    copyright:
      "Reina-Valera 1909. Dominio público. Números de Strong © Rubén Gómez; distribución autorizada a CrossWire Bible Society. Análisis y palabras hebreas del Antiguo Testamento: obra original del Open Scriptures Hebrew Bible, disponible en https://github.com/openscriptures/morphhb (CC BY 4.0).",
  },
  {
    code: "rvg-strong",
    about: "(RVG)",
    label: "RVG (TR)",
    name: "Reina Valera Gómez (TR)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "es",
    // Strong's tags copied from rv1909-strong by scripts/rvg-strong/transfer.mjs
    // (every book, 1–66, now carries a "w").
    strongs: true,
    concord: "rvg-strong/", // its own: data/concord/rvg-strong/{greek,hebrew} (rebuild after retagging RVG)
    // Supplied words (~3,900, like the KJV's italics) are marked "it": 1 on their tokens.
    italics: true,
    citation: "RVG",
    copyright:
      "Santa Biblia Reina Valera Gómez © 2004, 2010, 2023 Dr. Humberto Gómez Caballero. Derechos reservados. Prohibida su reproducción con fines de lucro. Análisis y palabras hebreas del Antiguo Testamento: obra original del Open Scriptures Hebrew Bible, disponible en https://github.com/openscriptures/morphhb (CC BY 4.0).",
  },
  {
    code: "rvo-strong",
    about: "(RVO)",
    label: "RVO (TR+MT+CT)",
    name: "Reina Valera Ojeda (TR+MT+CT)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "es",
    strongs: true,
    // Words the reviser supplied are marked "it": 1 (|it in scripts/rvo/ediciones-manuales.json).
    italics: true,
    concord: "rvo-strong/", // data/concord/rvo-strong/{greek,hebrew}
    citation: "RVO2026",
    copyright: "Reina Valera Ojeda. Dominio público.",
  },
  {
    code: "torres-amat",
    about: "Torres Amat",
    label: "BTA (Católica, Latín)",
    name: "Biblia Torres Amat (Católica, Latín)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "es",
    citation: "Torres-Amat",
    copyright:
      "Biblia de Torres Amat (1823–1825), traducción de Félix Torres Amat. Dominio público.",
  },
  {
    code: "straubinger-strong",
    about: "Straubinger",
    label: "STR (Católica, TR+CT)",
    name: "Biblia Straubinger (Católica, TR+CT)", // full name shown on the pane picker once selected
    kind: "bible",
    lang: "es",
    // Strong's tags copied from rv1909-strong (scripts/rvg-strong/transfer.mjs, TARGET=platense).
    strongs: true,
    concord: "straubinger-strong/", // its own: Catholic versification and independent wording
    citation: "Straubinger",
    copyright:
      "Biblia Platense, traducción de Mons. Juan Straubinger (1948). Dominio público. Análisis y palabras hebreas del Antiguo Testamento: obra original del Open Scriptures Hebrew Bible, disponible en https://github.com/openscriptures/morphhb (CC BY 4.0).",
  },
  {
    code: "notes:en",
    label: "Notes (EN)",
    name: "Study Notes (EN)", // full name shown on the pane picker once selected
    kind: "notes",
    lang: "en",
    citation: "Notes (EN)",
    copyright: "Oneness Study Notes written by Saul Ojeda (2026) using the King James Version (KJV).",
  },
  {
    code: "notes:es",
    label: "Notas (ES)",
    name: "Notas de estudio (ES)", // full name shown on the pane picker once selected
    kind: "notes",
    lang: "es",
    citation: "Notas (ES)",
    copyright:
      "Notas de estudio de la Unicidad escritas originalmente en inglés por Saul Ojeda con la Biblia King James (KJV), y traducidas al español a mano y con ayuda de IA usando la Reina Valera Gómez (RVG).",
  },
];
/** Label for a note (`n` on a token): the RVO's own notes are the translator's;
 *  on any other Bible a note is the app author's, so it is just "Note" / "Nota". */
export function noteLabelFor(code, lang) {
  if (code === "rvo-strong") return lang === "es" ? "Nota del traductor" : "Translator's note";
  return lang === "es" ? "Nota" : "Note";
}

export const optionFor = (code) => PANE_OPTIONS.find((o) => o.code === code);

/** Which translation's code holds Strong's-tagged data — used to fetch
 *  verse context for occurrence snippets without hardcoding "kjv-strong". */
export const strongsSourceCode = () =>
  PANE_OPTIONS.find((o) => o.strongs)?.code;

/* ---------- memory -> IndexedDB -> network ---------- */

const mem = new Map();
const DEV = import.meta.env.DEV;

/** Any stored copy of this file, whatever its version (offline fallback). */
async function anyStoredVersion(key) {
  const prefix = key.slice(0, key.lastIndexOf("@") + 1);
  try {
    const all = await keys();
    const alt = all.find((k) => typeof k === "string" && k.startsWith(prefix) && k !== key);
    return alt === undefined ? undefined : await get(alt);
  } catch {
    return undefined;
  }
}

function cachedFetch(key, url) {
  if (mem.has(key)) return mem.get(key);

  const promise = (async () => {
    // In `npm run dev` always read the file itself, so edits show at once
    // (the manifest is only rebuilt when the dev server starts).
    if (!DEV) {
      try {
        const cached = await get(key);
        if (cached !== undefined) return cached;
      } catch {
        /* private mode, etc. — fall through to network */
      }
    }

    let res;
    try {
      res = await fetch(url, DEV ? { cache: "no-store" } : undefined);
    } catch (e) {
      // Offline and this version isn't stored: use an older stored copy if there is one.
      const old = await anyStoredVersion(key);
      if (old !== undefined) return old;
      throw e;
    }
    if (res.status === 404) return null; // "nothing written yet" — not an error
    if (!res.ok) {
      const old = await anyStoredVersion(key);
      if (old !== undefined) return old;
      throw new Error(`${url}: ${res.status}`);
    }
    let data;
    try {
      data = await res.json();
    } catch {
      // Some dev servers (Vite's SPA fallback among them) return index.html
      // with a 200 status for a missing file instead of a real 404 — treat
      // "not valid JSON" the same as "not found" rather than throwing.
      return null;
    }
    if (!DEV) set(key, data).catch(() => {});
    return data;
  })();

  mem.set(key, promise); // dedupe concurrent requests for the same key
  promise.catch(() => mem.delete(key));
  return promise;
}

/* Cache keys + URLs for every kind of data file (shared with src/offline.js). */
const BASE = import.meta.env.BASE_URL;
// Key = "<kind>/<path>@<content hash>"; the part before "@" names the file.
/** Which Bible's files hold book n of `code`: itself, or for the New Testament of a
 *  Bible that has none (LXX), the Bible named by its ntFrom. */
export const bookSource = (code, n) => {
  const o = PANE_OPTIONS.find((x) => x.code === code);
  return o?.ntFrom && n >= 40 ? o.ntFrom : code;
};
const entry = (kind, rel) => [
  `${kind}/${rel}@${fileHash(`${kind === "bible" ? "bibles" : kind}/${rel}.json`)}`,
  `${BASE}data/${kind === "bible" ? "bibles" : kind}/${rel}.json`,
];
export const SRC = {
  // A Bible with ntFrom (the Septuagint) reads its New Testament from that Bible's files.
  book: (code, n) => entry("bible", `${bookSource(code, n)}/${n}`),
  notes: (lang, n, ch) => entry("notes", `${lang}/${n}/${ch}`),
  strongs: (lang, shard) => entry("strongs", `${lang}/${shard}`),
  concord: (dir, shard) => entry("concord", `${dir}/${shard}`),
  // Lexicon search (scripts/build-lexicon-search.mjs): every entry's number, word
  // and transliteration; and per tagged Bible, how it renders each number.
  strongsIndex: () => entry("strongs", "index"),
  renderings: (dir, lang) => entry("concord", `${dir}${lang}/renderings`),
  // Greek New Testament (KJTR, scripts/build-kjtr.mjs): the interlinear and the
  // lexicon's search by inflected form. Part of the lexicon pack.
  greekNT: (n) => entry("strongs", `kjtr/${n}`),
  greekForms: () => entry("strongs", "kjtr/forms"),
  // Hebrew Old Testament (OSHB / WLC, scripts/build-oshb-interlinear.mjs), same uses.
  hebrewOT: (n) => entry("strongs", `oshb/${n}`),
  hebrewForms: () => entry("strongs", "oshb/forms"),
  // Greek Old Testament (Rahlfs' Septuagint, KJV-numbered; scripts/lxx/build-lxx.py).
  greekOT: (n) => entry("strongs", `lxx/${n}`),
  greekOTForms: () => entry("strongs", "lxx/forms"),
};

/** Delete stored copies of files that have a newer version stored, and of files
 *  that no longer exist. A copy whose newer version isn't stored yet is kept, so
 *  it can still be read offline (cachedFetch). Runs once after start-up and after
 *  each download (offline.js). Only with the server's current manifest. */
export async function pruneOldVersions() {
  if (!manifestFresh) return 0;
  const all = await keys();
  const have = new Set(all);
  let removed = 0;
  for (const k of all) {
    const m = typeof k === "string" && k.match(/^(bible|notes|strongs|concord)\/(.+)@([^@/]+)$/);
    if (!m) continue;
    const [, kind, rel, h] = m;
    const current = manifest.files[`${kind === "bible" ? "bibles" : kind}/${rel}.json`];
    if (h === current) continue;
    if (!current || have.has(`${kind}/${rel}@${current}`)) {
      await del(k);
      removed++;
    }
  }
  return removed;
}

/** Download one file straight into IndexedDB without keeping it in memory
 *  (used for "download for offline"). Resolves true if it is now stored,
 *  false if the file doesn't exist. Skips files already stored. */
export async function storeOffline([key, url], signal) {
  if ((await get(key)) !== undefined) return true;
  const res = await fetch(url, { signal });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  let data;
  try {
    data = await res.json();
  } catch {
    return false; // dev-server SPA fallback for a missing file
  }
  await set(key, data);
  return true;
}

export const loadBook = (code, bookNum) =>
  cachedFetch(...SRC.book(code, bookNum));

export const loadNotes = (lang, bookNum, chapter) =>
  cachedFetch(...SRC.notes(lang, bookNum, chapter));

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
  const data = await cachedFetch(...SRC.strongs(lang, shard));
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
  const data = await cachedFetch(...SRC.concord(dir, shard));
  return (data && data[code]) || [];
}

/** [["G1577","ἐκκλησία","ekklēsía"], ...] — every lexicon entry, for the lexicon search. */
export async function loadLexiconIndex() {
  return (await cachedFetch(...SRC.strongsIndex())) || [];
}

/** How a tagged Bible renders each Strong's number of one language:
 *  { "G1577": [["church",79],["churches",36],["assembly",3]], ... }.
 *  `lang` = "greek" | "hebrew"; `source` = the Bible (its concordance folder). */
export async function loadRenderings(lang, source) {
  const dir = optionFor(source)?.concord ?? optionFor(strongsSourceCode())?.concord ?? "";
  return (await cachedFetch(...SRC.renderings(dir, lang))) || {};
}

/** Greek words of one New Testament book, per chapter and verse:
 *  { b, w: { "1": [ [ ["Βίβλος","G976","N-NSF","βίβλος"], … ], … ] } }
 *  (word as printed, Strong's number, Robinson parsing, dictionary form).
 *  null for the Old Testament. */
export const loadGreekNT = (bookNum) =>
  bookNum >= 40 && bookNum <= 66 ? cachedFetch(...SRC.greekNT(bookNum)) : Promise.resolve(null);

/** Every form of each Greek number in the New Testament, most frequent first:
 *  { "G1520": [["εἷς",98],["ἕν",66],["μία",17], …], … }. */
export async function loadGreekForms() {
  return (await cachedFetch(...SRC.greekForms())) || {};
}

/** Hebrew (and Aramaic) words of one Old Testament book, in KJV chapter/verse numbers:
 *  { b, w: { "1": [ [ ["בְּרֵאשִׁית","H7225","HR/Ncfsa","רֵאשִׁית"], … ], … ] } }
 *  (word with vowels, Strong's number, OSHB parsing, the main part when it has prefixes).
 *  null for the New Testament. */
export const loadHebrewOT = (bookNum) =>
  bookNum >= 1 && bookNum <= 39 ? cachedFetch(...SRC.hebrewOT(bookNum)) : Promise.resolve(null);

/** Greek (Septuagint) words of one Old Testament book, in KJV verse numbers; same shape
 *  as loadGreekNT. null for the New Testament. */
export const loadGreekOT = (bookNum) =>
  bookNum >= 1 && bookNum <= 39 ? cachedFetch(...SRC.greekOT(bookNum)) : Promise.resolve(null);

/** Every form of each Greek number in the Septuagint: { "G2316": [["θεὸς",…], …] }. */
export async function loadGreekOTForms() {
  return (await cachedFetch(...SRC.greekOTForms())) || {};
}

/** The original-language words of any book: Hebrew (OT) or Greek (NT); with
 *  greekOT, the Septuagint's Greek for the Old Testament. */
export const loadOriginal = (bookNum, greekOT = false) =>
  bookNum <= 39 ? (greekOT ? loadGreekOT(bookNum) : loadHebrewOT(bookNum)) : loadGreekNT(bookNum);

/** Every form of each Hebrew number in the Old Testament: { "H430": [["אֱלֹהִים",1062], …] }. */
export async function loadHebrewForms() {
  return (await cachedFetch(...SRC.hebrewForms())) || {};
}

export const HEBREW_OT_CREDIT = {
  en: "Hebrew: Westminster Leningrad Codex, with Strong's numbers and morphology from the Open Scriptures Hebrew Bible (https://github.com/openscriptures/morphhb, CC BY 4.0).",
  es: "Hebreo: Códice de Leningrado de Westminster, con números Strong y morfología del Open Scriptures Hebrew Bible (https://github.com/openscriptures/morphhb, CC BY 4.0).",
};

export const GREEK_OT_CREDIT = {
  en: "Greek: Rahlfs' Septuaginta (1935), morphology from the CCAT (University of Pennsylvania), Strong's numbers by the CrossWire Bible Society (SWORD module LXX).",
  es: "Griego: Septuaginta de Rahlfs (1935), morfología del CCAT (Universidad de Pensilvania), números Strong de CrossWire Bible Society (módulo SWORD LXX).",
};

/** Credit line for the Greek text (CC BY 4.0 asks for it wherever it is shown). */
export const GREEK_NT_CREDIT = {
  en: "Greek: King James Textus Receptus (KJTR), ed. Alan Bunning, Center for New Testament Restoration, 2014 (CC BY 4.0).",
  es: "Griego: King James Textus Receptus (KJTR), ed. Alan Bunning, Center for New Testament Restoration, 2014 (CC BY 4.0).",
};

/** Wipe everything this app has stored on the device — the IndexedDB cache of
 *  Bible chapters, notes and lexicon shards, the offline cache of the app
 *  shell and info pages (and its service worker), plus every localStorage setting —
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
    // Drop the offline service worker too; the app registers a fresh one on
    // the next load, so no old copy of the shell or info pages survives.
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* service workers unavailable */
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
