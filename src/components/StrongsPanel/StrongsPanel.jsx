import { useState, useEffect, useMemo, useTransition, useRef } from "react";
import BookFilterChart from "../BookFilterChart/BookFilterChart.jsx";
import { byNum } from "../../books.js";
import {
  loadStrongsEntry,
  loadConcordance,
  loadBook,
  decodeVid,
  strongsSourceCode,
} from "../../data.js";
import { normalizeStrong } from "../../strongsCode.js";
import "./StrongsPanel.css";

const CHUNK_SIZE = 30;

// Helper to look up book number by book ID (e.g., "MAT", "MRK", "LUK") or name
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
  currentBookId,
  onClose,
  onJump,
}) {
  const [entry, setEntry] = useState(undefined);
  const [refs, setRefs] = useState(null);
  const [selectedBookNum, setSelectedBookNum] = useState(null);
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);
  const [rows, setRows] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const prevCountRef = useRef(0);

  useEffect(() => {
    let alive = true;
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

    const timer = setTimeout(() => {
      loadConcordance(code)
        .then((list) => {
          if (alive) {
            setRefs(list);
            if (list && list.length > 0) {
              const activeBookNum = getBookNum(currentBookId);

              // Check if the current reader book has occurrences for this word
              const hasCurrentBookMatches =
                activeBookNum &&
                list.some(
                  (vid) => Math.floor(vid / 1_000_000) === activeBookNum,
                );

              // Default to active reader book if matches exist; otherwise fallback to top-occurring book
              if (hasCurrentBookMatches) {
                setSelectedBookNum(activeBookNum);
              } else {
                const topBook = Math.floor(list[0] / 1_000_000);
                setSelectedBookNum(topBook);
              }
            }
          }
        })
        .catch(() => {
          if (alive) setRefs([]);
        });
    }, 50);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [code, currentBookId]); // <--- Re-run when code or currentBookId changes

  const handleSelectBook = (key) => {
    startTransition(() => {
      setSelectedBookNum(key);
      setVisibleCount(CHUNK_SIZE);
      prevCountRef.current = 0;
      setRows(null);
    });
  };

  const bookChartItems = useMemo(() => {
    if (!refs || refs.length === 0) return [];
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
  }, [refs]);

  const filteredRefs = useMemo(() => {
    if (!refs) return null;
    if (!selectedBookNum) return refs;
    return refs.filter(
      (vid) => Math.floor(vid / 1_000_000) === selectedBookNum,
    );
  }, [refs, selectedBookNum]);

  useEffect(() => {
    if (!filteredRefs) return;
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
    const srcCode = strongsSourceCode();

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
  }, [filteredRefs, visibleCount, code]);

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
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      <div className="strongs-head">
        <span className="strongs-code">{code}</span>
        {entry?.gr && <span className="strongs-greek">{entry.gr}</span>}
      </div>

      {entry?.tr && (
        <p className="dim strongs-translit">
          {entry.tr}
          {entry.pron ? ` · ${entry.pron}` : ""}
        </p>
      )}
      {word && <p className="dim">Translated “{word}” here.</p>}

      {entry === undefined ? (
        <p className="dim">Loading definition…</p>
      ) : entry === null ? (
        <p className="dim">No lexicon entry found for {code}.</p>
      ) : (
        <>
          {entry.def && <p className="strongs-ref">{entry.def}</p>}
          {entry.deriv && <p className="dim">{entry.deriv}</p>}
          {entry.kjv && <p className="strongs-kjv">KJV usage: {entry.kjv}</p>}
        </>
      )}

      {refs && refs.length > 0 && (
        <BookFilterChart
          items={bookChartItems}
          selectedKey={selectedBookNum}
          onSelectKey={handleSelectBook}
          totalCount={refs.length}
        />
      )}

      <h4 className="strongs-sub">
        Occurrences
        {filteredRefs
          ? ` (${selectedBookNum ? filteredRefs.length : refs.length})`
          : ""}
      </h4>

      {refs === null || (rows === null && isPending) ? (
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
                  : `Load More (+${Math.min(CHUNK_SIZE, remainingCount)} of ${remainingCount} left)`}
              </button>
            </li>
          )}
        </ul>
      )}
    </aside>
  );
}
