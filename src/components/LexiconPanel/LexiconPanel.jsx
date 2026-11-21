import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
  loadGreekForms,
  loadGreekNT,
} from "../../js/data.js";
import { translitGreek } from "../../js/greekTranslit.js";
import { normalizeStrong } from "../../js/strongsCode.js";
import { renderingOf } from "../../js/renderings.js";
import "../StrongsPanel/StrongsPanel.css"; // same panel frame as the Strong's panel
import "./LexiconPanel.css";

const CHUNK = 30;
const MAX_RESULTS = 100;

const T = {
  en: {
    title: "Hebrew & Greek Lexicon",
    placeholder: "Search a word, transliteration, or Strong's Number",
    hint: (b) =>
      `Searches every Greek and Hebrew word tagged in the ${b}: the original word (ἐκκλησία), its transliteration (ekklesia), its Strong's number (G1577), or how the ${b} translates it (church). Greek words are also found in any form they take in the New Testament (μία, mia → εἷς).`,
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
    all: "Show all",
    less: "Show less",
    filterBy: (w) => `Show only the verses where it is translated “${w}”`,
    unfilter: "Show every rendering again",
    filteredBy: (w) => `Only verses where it is translated “${w}”.`,
    showAll: "Show all renderings",
    form: "form",
    forms: "Forms in the Greek New Testament (KJTR)",
    formBy: (w) => `Show only the verses where the Greek reads “${w}”`,
    formFiltered: (w) => `Only verses where the Greek reads “${w}”.`,
    showAllForms: "Show every form again",
  },
  es: {
    title: "Léxico hebreo y griego",
    placeholder: "Buscar una palabra, transliteración o número Strong",
    hint: (b) =>
      `Busca en todas las palabras griegas y hebreas etiquetadas en la ${b}: la palabra original (ἐκκλησία), su transliteración (ekklesia), su número Strong (G1577), o cómo la traduce la ${b} (iglesia). Las palabras griegas también se encuentran en cualquier forma que tengan en el Nuevo Testamento (μία, mia → εἷς).`,
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
    all: "Ver todas",
    less: "Ver menos",
    filterBy: (w) => `Mostrar solo los versículos donde se traduce «${w}»`,
    unfilter: "Volver a mostrar todas las traducciones",
    filteredBy: (w) => `Solo versículos donde se traduce «${w}».`,
    showAll: "Mostrar todas las traducciones",
    form: "forma",
    forms: "Formas en el Nuevo Testamento griego (KJTR)",
    formBy: (w) => `Mostrar solo los versículos donde el griego dice «${w}»`,
    formFiltered: (w) => `Solo versículos donde el griego dice «${w}».`,
    showAllForms: "Volver a mostrar todas las formas",
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

/** "church (79), churches (36)" — most frequent first (the data is stored that way). */
const renderList = (list) => (list || []).map(([w, n]) => `${w} (${n})`).join(", ");

/** Text cut to a few lines with "…", and a button to show it all / hide it again
 *  (only when it is actually cut). */
function Clamp({ children, lines = 3, t }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setCut(el.scrollHeight > el.clientHeight + 1);
  }, [children, open]);
  return (
    <>
      <p ref={ref} className={open ? "lexicon-rend" : "lexicon-rend clamp"} style={{ "--lines": lines }}>
        {children}
      </p>
      {(cut || open) && (
        <button type="button" className="lexicon-expand" onClick={() => setOpen((v) => !v)}>
          {open ? t.less : t.all}
        </button>
      )}
    </>
  );
}

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
  const [openForm, setOpenForm] = useState(null); // Greek form the word page starts filtered by
  const [forms, setForms] = useState(null); // { "G1520": [["εἷς",98],["μία",17],…] }
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadLexiconIndex().then((rows) => alive && setIndex(rows));
    loadGreekForms()
      .then((f) => alive && setForms(f))
      .catch(() => alive && setForms({}));
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
    // Focus the search box only with a mouse/keyboard: on phones the keyboard
    // popping up at once shifts the page.
    if (!code && window.matchMedia?.("(pointer: fine)").matches) inputRef.current?.focus();
    panelRef.current?.scrollTo({ top: 0 });
  }, [code]);

  // Folded copies of the index, built once.
  const folded = useMemo(
    () => (index || []).map(([c, gr, tr]) => ({ c, gr, tr, fgr: fold(gr), ftr: fold(tr) })),
    [index],
  );

  // Every Greek form of the New Testament, folded and transliterated: μία -> "μια", "mia".
  const foldedForms = useMemo(() => {
    const out = [];
    for (const [c, list] of Object.entries(forms || {}))
      for (const [form] of list) out.push({ c, form, f: fold(form), ft: fold(translitGreek(form)) });
    return out;
  }, [forms]);

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
    const formOf = new Map(); // code -> the Greek form that matched (μία for "mia")
    for (const r of folded) {
      let s = null;
      if (r.fgr === q || r.ftr === q) s = 0;
      else if (r.fgr.startsWith(q) || r.ftr.startsWith(q)) s = 1;
      else if (q.length > 2 && (r.fgr.includes(q) || r.ftr.includes(q))) s = 3;
      if (s !== null) scored.set(r.c, s);
    }
    // Any form of a Greek word in the New Testament: "mia", "μία", "hen" -> G1520 (εἷς).
    for (const r of foldedForms) {
      let s = null;
      if (r.f === q || r.ft === q) s = 0.5;
      else if (q.length > 2 && (r.f.startsWith(q) || r.ft.startsWith(q))) s = 1.5;
      if (s === null) continue;
      if (!scored.has(r.c) || scored.get(r.c) > s) scored.set(r.c, s);
      if (s === 0.5 && !formOf.has(r.c)) formOf.set(r.c, r.form);
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
      .map(([c]) => {
        const r = byCode.get(c);
        // show the matched form only when it isn't the dictionary form itself
        const form = formOf.get(c);
        return form && fold(form) !== r.fgr ? { ...r, form } : r;
      });
    return { results: list.slice(0, MAX_RESULTS), total: list.length };
  }, [query, index, folded, byWord, foldedForms]);
  const openWord = (r) => {
    setOpenForm(r.form || null);
    setCode(r.c);
  };

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
          forms={forms?.[code]}
          startForm={openForm}
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
                    <th className="c-orig">{t.word}</th>
                    <th className="c-tr">{t.translit}</th>
                    <th className="c-code">{t.strongs}</th>
                    <th className="c-rend">{t.renderings}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.c}
                      tabIndex={0}
                      onClick={() => openWord(r)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openWord(r))}
                    >
                      <td
                        className={r.c[0] === "H" ? "lex-orig hebrew" : "lex-orig"}
                        lang={r.c[0] === "H" ? "hbo" : "grc"}
                        dir={r.c[0] === "H" ? "rtl" : undefined}
                      >
                        {r.gr}
                        {r.form && (
                          <span className="lex-form" lang="grc">
                            {t.form}: {r.form} <i lang="en">({translitGreek(r.form)})</i>
                          </span>
                        )}
                        {/* narrow phones: the transliteration column folds in here */}
                        <span className="lex-tr-inline" dir="ltr">{r.tr}</span>
                      </td>
                      <td className="lex-tr">{r.tr}</td>
                      <td className="lex-code">{r.c}</td>
                      <td className="lex-rend">
                        <span className="lex-rend-clamp">{renderList(rend[langOf(r.c)]?.[r.c]) || "—"}</span>
                      </td>
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
function WordPage({ code, source, bibleLabel, renderings, forms, startForm, lang, t, onBack, onJump }) {
  const [entry, setEntry] = useState(undefined);
  const [refs, setRefs] = useState(null);
  const [book, setBook] = useState(null);
  const [count, setCount] = useState(CHUNK);
  const [rows, setRows] = useState(null);
  const [word, setWord] = useState(null); // rendering filter, e.g. "one"
  const [wordRefs, setWordRefs] = useState(null); // verses where it is rendered that way
  const [gform, setGform] = useState(startForm || null); // Greek form filter, e.g. "μία"
  const [formRefs, setFormRefs] = useState(null); // verses where the Greek has that form
  const isHeb = code[0] === "H";

  // Rendering filter: read the books this number occurs in and keep the verses
  // where its tagged word reads `word` (same reduction as renderings.json).
  useEffect(() => {
    if (!word || !refs) return;
    let alive = true;
    const nums = [...new Set(refs.map((v) => Math.floor(v / 1_000_000)))];
    Promise.all(nums.map((n) => loadBook(source, n).then((d) => [n, d])))
      .then((pairs) => {
        if (!alive) return;
        const data = new Map(pairs);
        setWordRefs(
          refs.filter((vid) => {
            const { n, c, v } = decodeVid(vid);
            const toks = data.get(n)?.w?.[c]?.[v - 1] || [];
            return toks.some((tok) => tok.s && normalizeStrong(tok.s) === code && renderingOf(tok.t) === word);
          }),
        );
      })
      .catch(() => alive && setWordRefs([]));
    return () => {
      alive = false;
    };
  }, [word, refs, source, code]);

  // Greek form filter: read the Greek of the books this number occurs in and keep
  // the verses where it has this form (New Testament only).
  useEffect(() => {
    if (!gform || !refs) return;
    let alive = true;
    const want = fold(gform);
    const nums = [...new Set(refs.map((v) => Math.floor(v / 1_000_000)))].filter((n) => n >= 40);
    Promise.all(nums.map((n) => loadGreekNT(n).then((d) => [n, d])))
      .then((pairs) => {
        if (!alive) return;
        const data = new Map(pairs);
        setFormRefs(
          refs.filter((vid) => {
            const { n, c, v } = decodeVid(vid);
            const words = data.get(n)?.w?.[c]?.[v - 1] || [];
            return words.some(([w, wc]) => wc === code && fold(w.replace(/[^\p{L}\p{M}]/gu, "")) === want);
          }),
        );
      })
      .catch(() => alive && setFormRefs([]));
    return () => {
      alive = false;
    };
  }, [gform, refs, code]);

  const pickForm = (f) => {
    setGform((cur) => (cur === f ? null : f)); // tap again to clear
    setFormRefs(null);
    setWord(null);
    setWordRefs(null);
    setBook(null);
    setCount(CHUNK);
    setRows(null);
  };

  const pickWord = (w) => {
    setGform(null);
    setFormRefs(null);
    setWord((cur) => (cur === w ? null : w)); // tap again to clear
    setWordRefs(null);
    setBook(null);
    setCount(CHUNK);
    setRows(null);
  };
  // the verses the book chart and the list work from
  const base = word ? wordRefs : gform ? formRefs : refs;

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
    for (const vid of base || []) {
      const n = Math.floor(vid / 1_000_000);
      m.set(n, (m.get(n) || 0) + 1);
    }
    return [...m].map(([n, c]) => ({ key: n, label: bookName(byNum[n], lang) || `${n}`, count: c })).sort((a, b) => b.count - a.count);
  }, [base, lang]);

  const filtered = useMemo(
    () => (base ? (book ? base.filter((v) => Math.floor(v / 1_000_000) === book) : base) : null),
    [base, book],
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
              ? toks.map((tok) => ({
                  t: tok.t,
                  j: !!tok.j,
                  hit: !!(tok.s && normalizeStrong(tok.s) === code && (!word || renderingOf(tok.t) === word)),
                }))
              : [{ t: d?.v?.[c]?.[v - 1] || "", hit: false }];
            return { vid, book: byNum[n], chapter: c, verse: v, segs };
          }),
        );
      })
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [filtered, count, source, code, word]);

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
          <Clamp lines={3} t={t}>
            {renderings.map(([w, n], i) => (
              <span key={w}>
                {i > 0 && ", "}
                <button
                  type="button"
                  className={word === w ? "lexicon-chip on" : "lexicon-chip"}
                  aria-pressed={word === w}
                  title={word === w ? t.unfilter : t.filterBy(w)}
                  onClick={() => pickWord(w)}
                >
                  {w} ({n})
                </button>
              </span>
            ))}
          </Clamp>
        </>
      )}

      {forms?.length > 0 && (
        <>
          <h4 className="strongs-sub">{t.forms}</h4>
          <Clamp lines={3} t={t}>
            {forms.map(([f, n], i) => (
              <span key={f}>
                {i > 0 && ", "}
                <button
                  type="button"
                  lang="grc"
                  className={gform === f ? "lexicon-chip greek on" : "lexicon-chip greek"}
                  aria-pressed={gform === f}
                  title={gform === f ? t.showAllForms : t.formBy(f)}
                  onClick={() => pickForm(f)}
                >
                  {f} <i lang="en">{translitGreek(f)}</i> ({n})
                </button>
              </span>
            ))}
          </Clamp>
        </>
      )}

      <h4 className="strongs-sub">
        {t.occurrences}
        {base ? ` (${book ? `${filtered.length} / ` : ""}${base.length})` : ""}
      </h4>
      {word && (
        <p className="lexicon-filter">
          {t.filteredBy(word)}{" "}
          <button type="button" className="lexicon-expand" onClick={() => pickWord(word)}>
            {t.showAll}
          </button>
        </p>
      )}
      {gform && (
        <p className="lexicon-filter">
          {t.formFiltered(gform)}{" "}
          <button type="button" className="lexicon-expand" onClick={() => pickForm(gform)}>
            {t.showAllForms}
          </button>
        </p>
      )}
      {refs === null || (word && wordRefs === null) || (gform && formRefs === null) ? (
        <p className="dim">{t.loading}</p>
      ) : base.length === 0 ? (
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
            totalCount={base.length}
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
