/**
 * Installable app + offline downloads.
 *
 *  - Registers the service worker (public/sw.js) in production builds, which
 *    keeps the app shell available offline.
 *  - Captures the browser's install prompt so the "Download App" panel can
 *    offer an Install button (Android / desktop Chrome & Edge). iOS has no
 *    install prompt: the panel shows "Share → Add to Home Screen" instead.
 *  - Downloads whole translations / note sets into IndexedDB (the same cache
 *    data.js reads from), so they work with no connection, and remembers
 *    which ones are complete in localStorage ("offline_status").
 *  - The first time the app runs installed, it downloads a starter pack:
 *    KJV w/Strong + English notes (app_lang "en") or RVG + Spanish notes ("es").
 */
import { BOOKS } from "./books.js";
import {
  PANE_OPTIONS,
  optionFor,
  SRC,
  storeOffline,
  NOTES_BOOKS,
  VERSIONS,
} from "./data.js";

const STATUS_KEY = "offline_status";
const STARTER_KEY = "offline_starter_done";
export const STARTER = {
  en: ["kjv-strong", "notes:en"],
  es: ["rvg-strong", "notes:es"],
};
const EVENT = "offline-change";

/* ---------- service worker + install prompt ---------- */

let deferredPrompt = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep it for our own button
    deferredPrompt = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
    startStarterPack();
  });
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(() => {});
    });
  }
}

export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const canPromptInstall = () => !!deferredPrompt;

export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  emit();
  if (outcome === "accepted") startStarterPack();
  return outcome === "accepted";
}

/* ---------- what each pack contains ---------- */

const GREEK_SHARDS = 12; // strongs/greek 1..5501 (G1–G5624)
const HEBREW_SHARDS = 18; // strongs/hebrew 1..8501 (H1–H8674)
const shards = (n) => Array.from({ length: n }, (_, i) => i * 500 + 1);

/** Version string a pack must have been downloaded with to count as ready. */
const packVersion = (opt) =>
  opt.kind === "notes"
    ? `n${VERSIONS.notes}`
    : `d${VERSIONS.data}${opt.strongs ? `l${VERSIONS.lexicon}` : ""}`;

function packFiles(opt) {
  if (opt.kind === "notes") {
    return NOTES_BOOKS.flatMap((n) => {
      const book = BOOKS[n - 1];
      return Array.from({ length: book.chapters }, (_, i) =>
        SRC.notes(opt.lang, n, i + 1),
      );
    });
  }
  const files = BOOKS.map((b) => SRC.book(opt.code, b.n));
  if (opt.strongs) {
    const c = opt.concord ?? "";
    for (const s of shards(GREEK_SHARDS))
      files.push(SRC.strongs("greek", s), SRC.concord(`${c}greek`, s));
    for (const s of shards(HEBREW_SHARDS))
      files.push(SRC.strongs("hebrew", s), SRC.concord(`${c}hebrew`, s));
  }
  return files;
}

/** Rough download sizes for the panel (uncompressed MB). */
export function approxSize(opt) {
  if (opt.kind === "notes") return 1.5;
  return opt.strongs ? 26 : 4;
}

/* ---------- status store ---------- */

const readStatus = () => {
  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeStatus = (s) => {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked */
  }
};

const progress = new Map(); // code -> 0..1 while downloading
const controllers = new Map();
let errors = {}; // code -> message

function emit() {
  window.dispatchEvent(new Event(EVENT));
}
export const subscribe = (fn) => {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
};

/** "ready" | "outdated" | "downloading" | "none" (+ progress 0..1, error). */
export function getState(code) {
  const opt = optionFor(code);
  if (!opt) return { state: "none" };
  if (progress.has(code))
    return { state: "downloading", progress: progress.get(code) };
  const v = readStatus()[code];
  if (v === packVersion(opt)) return { state: "ready" };
  return { state: v ? "outdated" : "none", error: errors[code] };
}
export const isReady = (code) => getState(code).state === "ready";

/* ---------- downloading ---------- */

export async function downloadPack(code) {
  const opt = optionFor(code);
  if (!opt || progress.has(code)) return;
  const files = packFiles(opt);
  const ctrl = new AbortController();
  controllers.set(code, ctrl);
  progress.set(code, 0);
  delete errors[code];
  emit();
  navigator.storage?.persist?.().catch(() => {});

  let done = 0;
  let lastEmit = 0;
  const queue = [...files];
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift();
      await storeOffline(f, ctrl.signal);
      done++;
      progress.set(code, done / files.length);
      if (Date.now() - lastEmit > 150) {
        lastEmit = Date.now();
        emit();
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: 4 }, worker));
    writeStatus({ ...readStatus(), [code]: packVersion(opt) });
  } catch (e) {
    if (e.name !== "AbortError") errors[code] = e.message || "Download failed";
  } finally {
    progress.delete(code);
    controllers.delete(code);
    emit();
  }
}

export const cancelDownload = (code) => controllers.get(code)?.abort();

export async function downloadAll() {
  for (const o of PANE_OPTIONS)
    if (!isReady(o.code)) await downloadPack(o.code);
}

/** First run as an installed app: fetch the starter pack for the app language. */
export function startStarterPack() {
  let lang;
  try {
    if (localStorage.getItem(STARTER_KEY)) return;
    lang = localStorage.getItem("app_lang");
  } catch {
    return;
  }
  if (!lang) return; // language not chosen yet — App calls this again after
  try {
    localStorage.setItem(STARTER_KEY, "1");
  } catch {
    /* ignore */
  }
  (async () => {
    for (const code of STARTER[lang] || STARTER.en) await downloadPack(code);
  })();
}

export async function storageEstimate() {
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
