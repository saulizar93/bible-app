import { useState, useEffect, useRef, useCallback } from "react";
import { get, set } from "idb-keyval";
import { BOOKS, byId, parseRef, suggest } from "./books.js";
import "./app.css";

const DATA_VERSION = 1; // bump to invalidate every cached Bible chapter
const NOTES_VERSION = 1; // bump separately — notes change far more often

// One combined list drives both pane dropdowns, so either side can hold
// a translation or a notes set.
const PANE_OPTIONS = [
  { code: "kjv", label: "KJV", kind: "bible" },
  { code: "bsb", label: "BSB", kind: "bible" },
  { code: "msb", label: "MSB", kind: "bible" },
  { code: "lsv", label: "LSV", kind: "bible" },
  { code: "rv1909", label: "RV1909", kind: "bible" },
  { code: "rvg", label: "RVG", kind: "bible" },
  { code: "notes:en", label: "Notes (EN)", kind: "notes", lang: "en" },
  { code: "notes:es", label: "Notas (ES)", kind: "notes", lang: "es" },
];
const optionFor = (code) => PANE_OPTIONS.find((o) => o.code === code);

/* ---------- data layer: memory -> IndexedDB -> network ---------- */

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

const loadBook = (code, bookNum) =>
  cachedFetch(
    `bible/${code}/${bookNum}@${DATA_VERSION}`,
    `/data/bibles/${code}/${bookNum}.json`,
  );

const loadNotes = (lang, bookNum, chapter) =>
  cachedFetch(
    `notes/${lang}/${bookNum}/${chapter}@${NOTES_VERSION}`,
    `/data/notes/${lang}/${bookNum}/${chapter}.json`,
  );

/** Does verse `v` fall inside a note's key, "7" or "3-5"? */
function keyCovers(key, v) {
  const [a, b] = key.split("-").map(Number);
  return b ? v >= a && v <= b : v === a;
}
function keyStart(key) {
  return parseInt(key, 10);
}

/* ---------- panes ---------- */

function BiblePane({ code, refPos, highlight, scroller }) {
  const [verses, setVerses] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setVerses(null);
    setError(null);
    loadBook(code, byId[refPos.book].n)
      .then((book) => {
        if (alive) setVerses((book && book.v[refPos.chapter]) || []);
      })
      .catch((e) => {
        if (alive) {
          setVerses([]);
          setError(e.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [code, refPos.book, refPos.chapter]);

  useEffect(() => {
    if (!verses || !highlight) return;
    scroller.current
      ?.querySelector(`[data-v="${highlight}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [verses, highlight, scroller]);

  if (error)
    return (
      <p className="err">
        Missing data file — run the build script for “{code}”.
      </p>
    );
  if (!verses) return <p className="dim">Loading…</p>;
  return verses.map((text, i) =>
    text ? (
      <p
        key={i}
        data-v={i + 1}
        className={highlight === i + 1 ? "verse hit" : "verse"}
      >
        <span className="vnum">{i + 1}</span>
        {text}
      </p>
    ) : null,
  );
}

function NotesPane({ lang, refPos, highlight, scroller }) {
  const [notes, setNotes] = useState(null); // null = loading, {} = loaded-empty
  const [error, setError] = useState(null);
  const bookNum = byId[refPos.book].n;

  useEffect(() => {
    let alive = true;
    setNotes(null);
    setError(null);
    loadNotes(lang, bookNum, refPos.chapter)
      .then((data) => {
        if (alive) setNotes(data || {});
      })
      .catch((e) => {
        if (alive) {
          setNotes({});
          setError(e.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [lang, bookNum, refPos.chapter]);

  useEffect(() => {
    if (!notes || !highlight) return;
    const key = Object.keys(notes).find((k) => keyCovers(k, highlight));
    if (key)
      scroller.current
        ?.querySelector(`[data-v="${keyStart(key)}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [notes, highlight, scroller]);

  if (error) return <p className="err">Couldn't load notes: {error}</p>;
  if (!notes) return <p className="dim">Loading…</p>;

  const keys = Object.keys(notes).sort((a, b) => keyStart(a) - keyStart(b));
  if (!keys.length) {
    return (
      <p className="dim">
        No {lang === "es" ? "Spanish" : "English"} notes yet for{" "}
        {byId[refPos.book].en} {refPos.chapter}.
      </p>
    );
  }

  return keys.map((key) => {
    const isHit = highlight != null && keyCovers(key, highlight);
    return (
      <div
        key={key}
        data-v={keyStart(key)}
        className={isHit ? "note hit" : "note"}
      >
        <span className="note-ref">
          {refPos.chapter}:{key}
        </span>
        {notes[key].map((para, i) =>
          para.t === "hl" ? (
            <blockquote key={i} className="note-hl">
              {para.x}
            </blockquote>
          ) : (
            <p key={i} className="note-p">
              {para.x}
            </p>
          ),
        )}
      </div>
    );
  });
}

function PaneSlot({ code, refPos, highlight, onSelect }) {
  const opt = optionFor(code);
  const scroller = useRef(null);

  return (
    <section className="pane">
      <header className="pane-head">
        <select value={code} onChange={(e) => onSelect(e.target.value)}>
          <optgroup label="Translations">
            {PANE_OPTIONS.filter((o) => o.kind === "bible").map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Study notes">
            {PANE_OPTIONS.filter((o) => o.kind === "notes").map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </optgroup>
        </select>
      </header>
      <div className="pane-body" ref={scroller}>
        {opt.kind === "bible" ? (
          <BiblePane
            code={opt.code}
            refPos={refPos}
            highlight={highlight}
            scroller={scroller}
          />
        ) : (
          <NotesPane
            lang={opt.lang}
            refPos={refPos}
            highlight={highlight}
            scroller={scroller}
          />
        )}
      </div>
    </section>
  );
}

/* ---------- app ---------- */

export default function App() {
  const [refPos, setRefPos] = useState({
    book: "MAT",
    chapter: 1,
    verse: null,
  });
  const [top, setTop] = useState("kjv");
  const [bottom, setBottom] = useState("notes:en"); // your Matthew commentary, by default
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const book = byId[refPos.book];
  const options = open ? suggest(query) : [];

  // prefetch the next chapter (for whichever kind of content each pane holds)
  // while the user reads this one.
  useEffect(() => {
    const id = requestIdleCallback?.(() => {
      const next =
        refPos.chapter < book.chapters
          ? { n: book.n, c: refPos.chapter + 1 }
          : { n: Math.min(book.n + 1, 66), c: 1 };
      for (const code of [top, bottom]) {
        const opt = optionFor(code);
        if (opt.kind === "bible") loadBook(opt.code, next.n).catch(() => {});
        else loadNotes(opt.lang, next.n, next.c).catch(() => {});
      }
    });
    return () => id && cancelIdleCallback?.(id);
  }, [refPos, top, bottom, book]);

  const go = useCallback((next) => {
    setRefPos(next);
    setQuery("");
    setOpen(false);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const parsed = parseRef(query);
    if (parsed) go(parsed);
  };

  const step = (delta) => {
    let { n } = book,
      c = refPos.chapter + delta;
    if (c < 1) {
      n = Math.max(n - 1, 1);
      c = BOOKS[n - 1].chapters;
    } else if (c > book.chapters) {
      n = Math.min(n + 1, 66);
      c = 1;
    }
    go({ book: BOOKS[n - 1].id, chapter: c, verse: null });
  };

  return (
    <div className="app">
      <form className="jump" onSubmit={submit} autoComplete="off">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous chapter"
        >
          ‹
        </button>
        <div className="field">
          <input
            value={query}
            placeholder={`${book.en} ${refPos.chapter}`}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            enterKeyHint="go"
          />
          {options.length > 0 && (
            <ul className="menu">
              {options.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onMouseDown={() =>
                      go({
                        book: o.id,
                        chapter: Math.min(o.chapter, o.chapters),
                        verse: o.verse,
                      })
                    }
                  >
                    {o.en} {Math.min(o.chapter, o.chapters)}
                    {o.verse ? `:${o.verse}` : ""}
                    <span className="dim"> · {o.es}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={() => step(1)} aria-label="Next chapter">
          ›
        </button>
      </form>

      <main className="panes">
        <PaneSlot
          code={top}
          refPos={refPos}
          highlight={refPos.verse}
          onSelect={setTop}
        />
        <div className="divider" />
        <PaneSlot
          code={bottom}
          refPos={refPos}
          highlight={refPos.verse}
          onSelect={setBottom}
        />
      </main>
    </div>
  );
}
