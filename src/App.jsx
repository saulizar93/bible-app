import { useState, useEffect, useRef, useCallback } from "react";
import { get, set } from "idb-keyval";
import { BOOKS, byId, parseRef, suggest } from "./books.js";
import "./app.css";

const DATA_VERSION = 2; // bump to invalidate every cached chapter
const TRANSLATIONS = [
  { code: "kjv", label: "KJV", lang: "en" },
  { code: "bsb", label: "BSB", lang: "en" },
  { code: "msb", label: "MSB", lang: "en" },
  { code: "rv1909", label: "RV1909", lang: "es" },
  { code: "rvg", label: "RVG", lang: "es" },
];

/* ---------- data layer: memory -> IndexedDB -> network ---------- */

const mem = new Map();

async function loadBook(code, bookNum) {
  const key = `${code}/${bookNum}@${DATA_VERSION}`;
  if (mem.has(key)) return mem.get(key);

  const promise = (async () => {
    try {
      const cached = await get(key);
      if (cached) return cached;
    } catch {
      /* private mode, etc. — fall through to network */
    }

    const res = await fetch(`/data/bibles/${code}/${bookNum}.json`);
    if (!res.ok) throw new Error(`${code} book ${bookNum}: ${res.status}`);
    const data = await res.json();
    set(key, data).catch(() => {});
    return data;
  })();

  mem.set(key, promise); // dedupe concurrent requests
  promise.catch(() => mem.delete(key));
  return promise;
}

/* ---------- panes ---------- */

function Pane({ code, ref: refPos, onSelectTranslation, highlight }) {
  const [verses, setVerses] = useState(null);
  const [error, setError] = useState(null);
  const scroller = useRef(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    loadBook(code, byId[refPos.book].n)
      .then((book) => {
        if (alive) setVerses(book.v[refPos.chapter] || []);
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

  // scroll the target verse into view once rendered
  useEffect(() => {
    if (!verses || !highlight) return;
    const el = scroller.current?.querySelector(`[data-v="${highlight}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [verses, highlight]);

  return (
    <section className="pane">
      <header className="pane-head">
        <select
          value={code}
          onChange={(e) => onSelectTranslation(e.target.value)}
        >
          {TRANSLATIONS.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label}
            </option>
          ))}
        </select>
      </header>
      <div className="pane-body" ref={scroller}>
        {error && (
          <p className="err">
            Missing data file — run the build script for “{code}”.
          </p>
        )}
        {!verses && !error && <p className="dim">Loading…</p>}
        {verses?.map((text, i) =>
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
  const [bottom, setBottom] = useState("rvg");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const book = byId[refPos.book];
  const options = open ? suggest(query) : [];

  // prefetch the next chapter while the user reads this one
  useEffect(() => {
    const id = requestIdleCallback?.(() => {
      const next =
        refPos.chapter < book.chapters
          ? { n: book.n, c: refPos.chapter + 1 }
          : { n: Math.min(book.n + 1, 66), c: 1 };
      loadBook(top, next.n).catch(() => {});
      loadBook(bottom, next.n).catch(() => {});
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
        <Pane
          code={top}
          ref={refPos}
          onSelectTranslation={setTop}
          highlight={refPos.verse}
        />
        <div className="divider" />
        <Pane
          code={bottom}
          ref={refPos}
          onSelectTranslation={setBottom}
          highlight={refPos.verse}
        />
      </main>
    </div>
  );
}
