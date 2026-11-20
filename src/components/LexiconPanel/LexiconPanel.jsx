import { useState, useEffect, useMemo, useRef } from "react";
import BookFilterChart from "../BookFilterChart/BookFilterChart.jsx";
import { byNum, bookName } from "../../js/books.js";
import {
  PANE_OPTIONS,
  optionFor,
  loadLexiconIndex,
  loadRenderings,
  loadStrongsEntry,
  loadConcordance,
  loadBook,
  decodeVid,
} from "../../js/data.js";
import { normalizeStrong } from "../../js/strongsCode.js";
import "../StrongsPanel/StrongsPanel.css"; // same panel frame as the Strong's panel
import "./LexiconPanel.css";

const CHUNK = 30;
const MAX_RESULTS = 100;

const T = {
  en: {
    title: "Hebrew & Greek Lexicon",
    placeholder: "Search a word, transliteration, or Strong's Number",
    hint: (b) =>
      `Searches every Greek and Hebrew word tagged in the ${b}: the original word (ἐκκλησία), its transliteration (ekklesia), its Strong's number (G1577), or how the ${b} translates it (church).`,
    bible: "Bible",
    word: "Word",
    translit: "Transliteration",
    strongs: "Strong's",
    renderings: "Translated as",
    none: (q) => `No matches for “${q}”.`,
    loading: "Loading…",
    more: (n) => `Showing the first ${n} matches; type more to narrow the search.`,
    back: "Results",
    greek: "Greek",
    hebrew: "Hebrew",
    rendered: (b) => `Renderings in the ${b}`,
    occurrences: "Occurrences",
    noOcc: "No tagged occurrences in this Bible.",
    loadMore: (n, left) => `Load more (+${n} of ${left} left)`,
    close: "Close",
    noDef: "No definition found.",
    outline: "Meanings (outline)",
  },
  es: {
    title: "Léxico hebreo y griego",
    placeholder: "Buscar una palabra, transliteración o número Strong",
    hint: (b) =>
      `Busca en todas las palabras griegas y hebreas etiquetadas en la ${b}: la palabra original (ἐκκλησία), su transliteración (ekklesia), su número Strong (G1577), o cómo la traduce la ${b} (iglesia).`,
    bible: "Biblia",
    word: "Palabra",
    translit: "Transliteración",
    strongs: "Strong",
    renderings: "Traducida como",
    none: (q) => `No hay coincidencias para «${q}».`,
    loading: "Cargando…",
    more: (n) => `Se muestran las primeras ${n} coincidencias; escriba más para afinar la búsqueda.`,
    back: "Resultados",
    greek: "Griego",
    hebrew: "Hebreo",
    rendered: (b) => `Traducciones en la ${b}`,
    occurrences: "Apariciones",
    noOcc: "No hay apariciones etiquetadas en esta Biblia.",
    loadMore: (n, left) => `Cargar más (+${n} de ${left} restantes)`,
    close: "Cerrar",
    noDef: "No se encontró una definición.",
    outline: "Significados (esquema)",
  },
};

/** Lower case, no accents, breathings, vowel points or transliteration marks:
 *  "ἐκκλησία", "ekklēsía" and "ekklesia" all compare equal-ish. */
const fold = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-֑ͯ-ׇ]/g, "") // Greek/Latin accents, Hebrew points & cantillation
    .replace(/[ʼʽʾʿ'’‘`´]/g, "")
    .replace(/ς/g, "σ")
    .replace(/[ᵉᵃᵒ]/g, "e") // Strong's reduced vowels: Yᵉhôvâh -> yehovah
    .toLowerCase()
    // Strong's spells long Hebrew vowels with a letter: ʼĕlôhîym -> elohim
    .replace(/iy/g, "i")
    .replace(/([ou])w/g, "$1")
    .trim();

/** Accents off, lower case: "Señor" and "senor" both find "señor". */
const plain = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const langOf = (code) => (code[0] === "H" ? "hebrew" : "greek");

/** "church (79), churches (36)" — alphabetical. */
const renderList = (list) =>
  [...(list || [])]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([w, n]) => `${w} (${n})`)
    .join(", ");

export default function LexiconPanel({ lang = "en", onClose, onJump }) {
  const t = T[lang] || T.en;
  const bibles = useMemo(() => PANE_OPTIONS.filter((o) => o.kind === "bible" && o.strongs), []);
  const [source, setSource] = useState(() => {
    const want = lang === "es" ? "rvg-strong" : "kjv-strong";
    return bibles.some((b) => b.code === want) ? want : bibles[0]?.code;
  });
  const bibleLabel = optionFor(source)?.label || source;

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(null);
  const [rend, setRend] = useState({}); // "greek" | "hebrew" -> renderings of `source`
  const [code, setCode] = useState(null); // word page open
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadLexiconIndex().then((rows) => alive && setIndex(rows));
    return () => {
      alive = false;
    };
  }, []);

  // Renderings of the chosen Bible, both languages (needed for "church" -> G1577).
  useEffect(() => {
    let alive = true;
    Promise.all([loadRenderings("greek", source), loadRenderings("hebrew", source)])
      .then(([greek, hebrew]) => alive && setRend({ greek, hebrew }))
      .catch(() => alive && setRend({}));
    return () => {
      alive = false;
    };
  }, [source]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (code) setCode(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [code, onClose]);

  useEffect(() => {
    if (!code) inputRef.current?.focus();
    panelRef.current?.scrollTo({ top: 0 });
  }, [code]);

  // Folded copies of the index, built once.
  const folded = useMemo(
    () => (index || []).map(([c, gr, tr]) => ({ c, gr, tr, fgr: fold(gr), ftr: fold(tr) })),
    [index],
  );

  // Translation word -> numbers it renders, with how often: "church" -> [["G1577",79],["H6951",…]].
  const byWord = useMemo(() => {
    const m = new Map();
    for (const lg of ["greek", "hebrew"])
      for (const [c, list] of Object.entries(rend[lg] || {}))
        for (const [w, n] of list) {
          const keys = new Set([plain(w), ...plain(w).split(" ")]);
          for (const k of keys) {
            if (!k) continue;
            if (!m.has(k)) m.set(k, new Map());
            const per = m.get(k);
            per.set(c, Math.max(per.get(c) || 0, n));
          }
        }
    return m;
  }, [rend]);

  const { results, total } = useMemo(() => {
    const raw = query.trim();
    if (!raw || !index) return { results: [], total: 0 };
    const m = raw.match(/^([GHgh])\s*0*(\d+)$/);
    if (m) {
      const c = normalizeStrong(`${m[1]}${m[2]}`);
      const hit = folded.filter((r) => r.c === c);
      return { results: hit, total: hit.length };
    }
    const q = fold(raw);
    if (!q) return { results: [], total: 0 };
    const scored = new Map(); // code -> score (lower = better)
    for (const r of folded) {
      let s = null;
      if (r.fgr === q || r.ftr === q) s = 0;
      else if (r.fgr.startsWith(q) || r.ftr.startsWith(q)) s = 1;
      else if (q.length > 2 && (r.fgr.includes(q) || r.ftr.includes(q))) s = 3;
      if (s !== null) scored.set(r.c, s);
    }
    // How the chosen Bible translates it: "church" finds G1577 and H6951.
    const rq = plain(raw);
    if (rq.length > 1) {
      for (const [c, n] of byWord.get(rq) || []) {
        const s = 2 - Math.min(n, 999) / 1000; // more frequent renderings first
        if (!scored.has(c) || scored.get(c) > s) scored.set(c, s);
      }
    }
    const byCode = new Map(folded.map((r) => [r.c, r]));
    const list = [...scored]
      .filter(([c]) => byCode.has(c))
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([c]) => byCode.get(c));
    return { results: list.slice(0, MAX_RESULTS), total: list.length };
  }, [query, index, folded, byWord]);

  return (
    <aside className="strongs-panel lexicon-panel" role="dialog" aria-label={t.title} ref={panelRef}>
      <button type="button" className="strongs-close" onClick={onClose} aria-label={t.close}>
        ×
      </button>
      <h2 className="lexicon-title">{t.title}</h2>

      {code ? (
        <WordPage
          code={code}
          source={source}
          bibleLabel={bibleLabel}
          renderings={rend[langOf(code)]?.[code]}
          lang={lang}
          t={t}
          onBack={() => setCode(null)}
          onJump={onJump}
        />
      ) : (
        <>
          <div className="lexicon-controls">
            <input
              ref={inputRef}
              type="search"
              className="lexicon-input"
              value={query}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              onChange={(e) => setQuery(e.target.value)}
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
            />
            <label className="lexicon-bible">
              <span>{t.bible}</span>
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                {bibles.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="lexicon-hint dim">{t.hint(bibleLabel)}</p>

          {!index ? (
            query.trim() && <p className="dim">{t.loading}</p>
          ) : query.trim() && results.length === 0 ? (
            <p className="dim">{t.none(query.trim())}</p>
          ) : results.length > 0 ? (
            <>
              <table className="lexicon-results">
                <thead>
                  <tr>
                    <th>{t.word}</th>
                    <th>{t.translit}</th>
                    <th>{t.strongs}</th>
                    <th>{t.renderings}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.c}
                      tabIndex={0}
                      onClick={() => setCode(r.c)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setCode(r.c))}
                    >
                      <td
                        className={r.c[0] === "H" ? "lex-orig hebrew" : "lex-orig"}
                        lang={r.c[0] === "H" ? "hbo" : "grc"}
                        dir={r.c[0] === "H" ? "rtl" : undefined}
                      >
                        {r.gr}
                      </td>
                      <td className="lex-tr">{r.tr}</td>
                      <td className="lex-code">{r.c}</td>
                      <td className="lex-rend">{renderList(rend[langOf(r.c)]?.[r.c]) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {total > results.length && <p className="dim lexicon-more">{t.more(results.length)}</p>}
            </>
          ) : null}
        </>
      )}
    </aside>
  );
}

/** One word: original, transliteration, number + language, definition, how the
 *  chosen Bible renders it, and every verse it occurs in (filter by book; tap to go). */
function WordPage({ code, source, bibleLabel, renderings, lang, t, onBack, onJump }) {
  const [entry, setEntry] = useState(undefined);
  const [refs, setRefs] = useState(null);
  const [book, setBook] = useState(null);
  const [count, setCount] = useState(CHUNK);
  const [rows, setRows] = useState(null);
  const isHeb = code[0] === "H";

  useEffect(() => {
    let alive = true;
    loadStrongsEntry(code)
      .then((e) => alive && setEntry(e))
      .catch(() => alive && setEntry(null));
    loadConcordance(code, source)
      .then((l) => alive && setRefs(l || []))
      .catch(() => alive && setRefs([]));
    return () => {
      alive = false;
    };
  }, [code, source]);

  const chart = useMemo(() => {
    const m = new Map();
    for (const vid of refs || []) {
      const n = Math.floor(vid / 1_000_000);
      m.set(n, (m.get(n) || 0) + 1);
    }
    return [...m].map(([n, c]) => ({ key: n, label: bookName(byNum[n], lang) || `${n}`, count: c })).sort((a, b) => b.count - a.count);
  }, [refs, lang]);

  const filtered = useMemo(
    () => (refs ? (book ? refs.filter((v) => Math.floor(v / 1_000_000) === book) : refs) : null),
    [refs, book],
  );

  // Verse text for the shown occurrences, with the word for this number marked.
  useEffect(() => {
    if (!filtered) return;
    let alive = true;
    const batch = filtered.slice(0, count).map((vid) => ({ vid, ...decodeVid(vid) }));
    const nums = [...new Set(batch.map((d) => d.n))];
    Promise.all(nums.map((n) => loadBook(source, n).then((d) => [n, d])))
      .then((pairs) => {
        if (!alive) return;
        const data = new Map(pairs);
        setRows(
          batch.map(({ vid, n, c, v }) => {
            const d = data.get(n);
            const toks = d?.w?.[c]?.[v - 1];
            const segs = toks
              ? toks.map((tok) => ({ t: tok.t, j: !!tok.j, hit: !!(tok.s && normalizeStrong(tok.s) === code) }))
              : [{ t: d?.v?.[c]?.[v - 1] || "", hit: false }];
            return { vid, book: byNum[n], chapter: c, verse: v, segs };
          }),
        );
      })
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [filtered, count, source, code]);

  const def = entry && (lang === "es" ? entry["def-es"] : entry["def-en"]);
  const left = filtered ? Math.max(0, filtered.length - count) : 0;

  return (
    <div className="lexicon-word">
      <button type="button" className="lexicon-back" onClick={onBack}>
        ‹ {t.back}
      </button>

      <p className={isHeb ? "lexicon-orig hebrew" : "lexicon-orig"} lang={isHeb ? "hbo" : "grc"} dir={isHeb ? "rtl" : undefined}>
        {entry?.gr || " "}
      </p>
      {entry?.tr && <p className="lexicon-tr">{entry.tr}</p>}
      <p className="lexicon-code dim">
        {code} · {isHeb ? t.hebrew : t.greek}
      </p>

      {entry === undefined ? (
        <p className="dim">{t.loading}</p>
      ) : !entry ? (
        <p className="dim">{t.noDef}</p>
      ) : (
        <>
          {def && <p className="strongs-ref">{def}</p>}
          {entry.outline?.length > 0 && (
            <details className="strongs-outline">
              <summary>{t.outline}</summary>
              <ul>
                {entry.outline.map((en, i) => {
                  const line = (lang === "es" && entry["outline-es"]?.[i]) || en;
                  const label = en.match(/^(\w+)\)/)?.[1] || "";
                  const depth = (label.match(/\d+|[a-z]+/g) || [""]).length;
                  return (
                    <li key={i} style={{ paddingLeft: `${(depth - 1) * 14}px` }}>
                      {line}
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </>
      )}

      {renderings?.length > 0 && (
        <>
          <h4 className="strongs-sub">{t.rendered(bibleLabel)}</h4>
          <p className="lexicon-rend">{renderList(renderings)}</p>
        </>
      )}

      <h4 className="strongs-sub">
        {t.occurrences}
        {refs ? ` (${book ? `${filtered.length} / ` : ""}${refs.length})` : ""}
      </h4>
      {refs === null ? (
        <p className="dim">{t.loading}</p>
      ) : refs.length === 0 ? (
        <p className="dim">{t.noOcc}</p>
      ) : (
        <>
          <BookFilterChart
            items={chart}
            selectedKey={book}
            onSelectKey={(k) => {
              setBook(k);
              setCount(CHUNK);
              setRows(null);
            }}
            totalCount={refs.length}
            lang={lang}
          />
          {rows === null ? (
            <p className="dim">{t.loading}</p>
          ) : (
            <ul className="strongs-occurrences">
              {rows.map((r) => (
                <li key={r.vid}>
                  <button type="button" onClick={() => onJump({ book: r.book.id, chapter: r.chapter, verse: r.verse })}>
                    <span className="occ-ref">
                      {bookName(r.book, lang)} {r.chapter}:{r.verse}
                    </span>
                    <span className="occ-text">
                      {r.segs.map((s, i) => (
                        <span key={i}>
                          {i > 0 && !s.j ? " " : ""}
                          {s.hit ? <mark className="lex-hit">{s.t}</mark> : s.t}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
              {left > 0 && (
                <li className="strongs-more-item">
                  <button type="button" className="strongs-load-more" onClick={() => setCount((c) => c + CHUNK)}>
                    {t.loadMore(Math.min(CHUNK, left), left)}
                  </button>
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
