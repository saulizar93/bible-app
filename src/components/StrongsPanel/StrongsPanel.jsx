import { useState, useEffect, useMemo, useTransition, useRef } from "react";
import BookFilterChart from "../BookFilterChart/BookFilterChart.jsx";
import { byNum } from "../../books.js";
import {
  loadStrongsEntry,
  loadConcordance,
  loadBook,
  decodeVid,
  strongsSourceCode,
  optionFor,
} from "../../data.js";
import { normalizeStrong } from "../../strongsCode.js";
import { decodeMorph, decodeHebrewPos } from "../../morph.js";
import "./StrongsPanel.css";

const CHUNK_SIZE = 30;

function getBookNum(book) {
  if (typeof book === "number") return book;
  if (!book) return null;
  const entry = Object.entries(byNum).find(
    ([_, b]) =>
      b.id?.toLowerCase() === String(book).toLowerCase() ||
      b.en?.toLowerCase() === String(book).toLowerCase(),
  );
  return entry ? Number(entry[0]) : null;
}

export default function StrongsPanel({
  code,
  word,
  morph,
  form,
  source,
  lang = "en",
  currentBookId,
  onClose,
  onJump,
}) {
  const [entry, setEntry] = useState(undefined);

  // Occurrences UI toggle state
  const [showOccurrences, setShowOccurrences] = useState(false);
  const [loadingConcordance, setLoadingConcordance] = useState(false);

  const [refs, setRefs] = useState(null);
  const [selectedBookNum, setSelectedBookNum] = useState(null);
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);
  const [rows, setRows] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const prevCountRef = useRef(0);

  // 1. Light initial load: Fetch ONLY the Strong's definition
  useEffect(() => {
    let alive = true;

    // Reset all occurrence state when opening a new code
    setShowOccurrences(false);
    setLoadingConcordance(false);
    setSelectedBookNum(null);
    setVisibleCount(CHUNK_SIZE);
    prevCountRef.current = 0;
    setEntry(undefined);
    setRefs(null);
    setRows(null);

    loadStrongsEntry(code)
      .then((e) => {
        if (alive) setEntry(e);
      })
      .catch(() => {
        if (alive) setEntry(null);
      });

    return () => {
      alive = false;
    };
  }, [code, source]);

  // 2. Fetch Concordance list ONLY when user clicks "Show occurrences"
  const handleToggleOccurrences = () => {
    if (showOccurrences) {
      setShowOccurrences(false);
      return;
    }

    setShowOccurrences(true);

    // If already loaded for this code, skip re-fetching
    if (refs !== null) return;

    setLoadingConcordance(true);
    loadConcordance(code, source)
      .then((list) => {
        setRefs(list || []);
        if (list && list.length > 0) {
          const activeBookNum = getBookNum(currentBookId);
          const hasCurrentBookMatches =
            activeBookNum &&
            list.some((vid) => Math.floor(vid / 1_000_000) === activeBookNum);

          if (hasCurrentBookMatches) {
            setSelectedBookNum(activeBookNum);
          } else {
            const topBook = Math.floor(list[0] / 1_000_000);
            setSelectedBookNum(topBook);
          }
        }
      })
      .catch(() => {
        setRefs([]);
      })
      .finally(() => {
        setLoadingConcordance(false);
      });
  };

  const handleSelectBook = (key) => {
    startTransition(() => {
      setSelectedBookNum(key);
      setVisibleCount(CHUNK_SIZE);
      prevCountRef.current = 0;
      setRows(null);
    });
  };

  // FIX C: Skip charting loops entirely when occurrences are collapsed
  const bookChartItems = useMemo(() => {
    if (!showOccurrences || !refs || refs.length === 0) return [];
    const map = new Map();
    for (let i = 0; i < refs.length; i++) {
      const vid = refs[i];
      const n = Math.floor(vid / 1_000_000);
      map.set(n, (map.get(n) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([n, count]) => ({
        key: n,
        label: byNum[n]?.en || `Book ${n}`,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [showOccurrences, refs]);

  // FIX B: Flush heavy state right before triggering close
  const handleSafeClose = () => {
    setRefs(null);
    setRows(null);
    onClose();
  };

  const filteredRefs = useMemo(() => {
    if (!refs) return null;
    if (!selectedBookNum) return refs;
    return refs.filter(
      (vid) => Math.floor(vid / 1_000_000) === selectedBookNum,
    );
  }, [refs, selectedBookNum]);

  // 3. Incrementally fetch verse text snippets only when occurrences are expanded
  useEffect(() => {
    if (!showOccurrences || !filteredRefs) return;
    let alive = true;

    const startIndex = prevCountRef.current;
    const isInitialLoad = startIndex === 0;

    const newBatch = filteredRefs.slice(startIndex, visibleCount);
    if (newBatch.length === 0) return;

    if (!isInitialLoad) {
      setLoadingMore(true);
    }

    const decoded = newBatch.map((vid) => ({ vid, ...decodeVid(vid) }));
    const bookNums = [...new Set(decoded.map((d) => d.n))];
    // Snippets come from the translation the word was tapped in (if it's tagged).
    const srcCode = optionFor(source)?.strongs ? source : strongsSourceCode();

    Promise.all(
      bookNums.map((n) => loadBook(srcCode, n).then((data) => [n, data])),
    )
      .then((pairs) => {
        if (!alive) return;
        const byNumData = new Map(pairs);
        const builtNewRows = decoded.map(({ vid, n, c, v }) => {
          const book = byNum[n];
          const bookData = byNumData.get(n);
          const tokens = bookData?.w?.[c]?.[v - 1];
          const segments = tokens
            ? tokens.map((tok) => ({
                t: tok.t,
                bold: !!(tok.s && normalizeStrong(tok.s) === code),
              }))
            : bookData?.v?.[c]?.[v - 1]
              ? [{ t: bookData.v[c][v - 1], bold: false }]
              : [];
          return { vid, book, chapter: c, verse: v, segments };
        });

        startTransition(() => {
          if (!alive) return;
          setRows((prevRows) =>
            isInitialLoad
              ? builtNewRows
              : [...(prevRows || []), ...builtNewRows],
          );
          prevCountRef.current = visibleCount;
        });
      })
      .catch(() => {
        if (alive && isInitialLoad) setRows([]);
      })
      .finally(() => {
        if (alive) setLoadingMore(false);
      });

    return () => {
      alive = false;
    };
  }, [showOccurrences, filteredRefs, visibleCount, code, source]);

  const remainingCount = filteredRefs
    ? Math.max(0, filteredRefs.length - visibleCount)
    : 0;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + CHUNK_SIZE);
  };

  return (
    <aside
      className="strongs-panel"
      role="dialog"
      aria-label="Strong's definition"
    >
      <button
        type="button"
        className="strongs-close"
        onClick={handleSafeClose}
        aria-label="Close"
      >
        ×
      </button>

      <div className="strongs-head">
        <span className="strongs-code">{code}</span>
        {entry?.gr && (
          <span
            className={code.startsWith("H") ? "strongs-greek strongs-hebrew" : "strongs-greek"}
            lang={code.startsWith("H") ? "he" : "grc"}
            dir={code.startsWith("H") ? "rtl" : undefined}
          >
            {entry.gr}
          </span>
        )}
      </div>

      {entry?.tr && (
        <p className="dim strongs-translit">
          {entry.tr}
          {entry.pron ? ` · ${entry.pron}` : ""}
        </p>
      )}
      {word && <p className="dim">Translated “{word}” here.</p>}

      {(morph || form || entry?.pos) && (
        <MorphBlock morph={morph} form={form} pos={entry?.pos} lang={lang} />
      )}

      {entry === undefined ? (
        <p className="dim">Loading definition…</p>
      ) : entry === null ? (
        <p className="dim">No lexicon entry found for {code}.</p>
      ) : (
        <>
          {entry.def && <p className="strongs-ref">{entry.def}</p>}
          {entry.deriv && <p className="dim">{entry.deriv}</p>}
          {entry.kjv && <p className="strongs-kjv">KJV usage: {entry.kjv}</p>}
          {entry.outline?.length > 0 && (
            <details className="strongs-outline">
              <summary>{lang === "es" ? "Significados (esquema)" : "Meanings (outline)"}</summary>
              <ul>
                {entry.outline.map((line, i) => {
                  // "1a2) ..." -> depth 3 (number / letter / number levels)
                  const label = line.match(/^(\w+)\)/)?.[1] || "";
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

      {/* Toggle button to load occurrences on demand */}
      <div className="strongs-occurrences-toggle">
        <button
          type="button"
          className="strongs-toggle-btn"
          onClick={handleToggleOccurrences}
        >
          {showOccurrences ? "Hide occurrences" : "Show other occurrences"}
        </button>
      </div>

      {showOccurrences && (
        <>
          {loadingConcordance ? (
            <p className="dim">Loading concordance data…</p>
          ) : refs && refs.length > 0 ? (
            <>
              <BookFilterChart
                items={bookChartItems}
                selectedKey={selectedBookNum}
                onSelectKey={handleSelectBook}
                totalCount={refs.length}
              />

              <h4 className="strongs-sub">
                Occurrences
                {filteredRefs
                  ? ` (${selectedBookNum ? filteredRefs.length : refs.length})`
                  : ""}
              </h4>

              {rows === null && isPending ? (
                <p className="dim">Loading occurrences…</p>
              ) : rows === null || rows.length === 0 ? (
                <p className="dim">No tagged occurrences found.</p>
              ) : (
                <ul className="strongs-occurrences">
                  {rows.map(
                    (row) =>
                      row.book && (
                        <li key={row.vid}>
                          <button
                            type="button"
                            onClick={() =>
                              onJump({
                                book: row.book.id,
                                chapter: row.chapter,
                                verse: row.verse,
                              })
                            }
                          >
                            <span className="occ-ref">
                              {row.book.en} {row.chapter}:{row.verse}
                            </span>
                            <span className="occ-text">
                              {row.segments.map((seg, i) => (
                                <span key={i}>
                                  {i > 0 ? " " : ""}
                                  {seg.bold ? <strong>{seg.t}</strong> : seg.t}
                                </span>
                              ))}
                            </span>
                          </button>
                        </li>
                      ),
                  )}

                  {remainingCount > 0 && (
                    <li className="strongs-more-item">
                      <button
                        type="button"
                        className="strongs-load-more"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore
                          ? "Loading next batch…"
                          : `Load More (+${Math.min(
                              CHUNK_SIZE,
                              remainingCount,
                            )} of ${remainingCount} left)`}
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </>
          ) : (
            <p className="dim">No occurrences found for this word.</p>
          )}
        </>
      )}
    </aside>
  );
}

/** Parsing of the tapped word: Greek case/number/gender or verb tense/voice/mood,
 *  Hebrew verb stem + form — plus the Greek word as it stands in the TR. */
function MorphBlock({ morph, form, pos, lang }) {
  const isEs = lang === "es";
  let d = decodeMorph(morph, lang);
  // Hebrew nouns/adjectives aren't parsed in the KJV module; fall back to the
  // dictionary's part of speech + gender ("n-f" -> Noun · Feminine).
  if (!d && pos) {
    const [first, ...rest] = decodeHebrewPos(pos, lang);
    d = { pos: first, fields: rest.map((v) => ({ k: /^(Mascul|Femen|Femin)/.test(v) ? "gender" : "pos2", v })) };
  }
  return (
    <div className="strongs-morph">
      <div className="morph-head">
        <span className="morph-label">{isEs ? "Análisis" : "Parsing"}</span>
        {morph && <code className="morph-code">{morph}</code>}
      </div>
      {d && (
        <div className="morph-chips">
          {d.pos && <span className="morph-chip pos">{d.pos}</span>}
          {d.fields.map((f, i) => (
            <span key={i} className={`morph-chip ${f.k}`}>
              {f.v}
            </span>
          ))}
        </div>
      )}
      {form && (
        <p className="morph-form dim">
          {isEs ? "Texto Recibido: " : "Textus Receptus: "}
          <span lang="grc" className="strongs-greek">
            {form}
          </span>
        </p>
      )}
    </div>
  );
}
