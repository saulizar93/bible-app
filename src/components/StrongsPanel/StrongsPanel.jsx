import { useState, useEffect, useMemo } from "react";
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

const MAX_SHOWN = 50;

export default function StrongsPanel({ code, word, onClose, onJump }) {
  const [entry, setEntry] = useState(undefined); // undefined = loading, null = not found
  const [refs, setRefs] = useState(null);
  const [selectedBookNum, setSelectedBookNum] = useState(null);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    setSelectedBookNum(null);
    setEntry(undefined);
    setRefs(null);
    loadStrongsEntry(code)
      .then((e) => {
        if (alive) setEntry(e);
      })
      .catch(() => {
        if (alive) setEntry(null);
      });
    loadConcordance(code)
      .then((list) => {
        if (alive) setRefs(list);
      })
      .catch(() => {
        if (alive) setRefs([]);
      });
    return () => {
      alive = false;
    };
  }, [code]);

  const bookChartItems = useMemo(() => {
    if (!refs || refs.length === 0) return [];
    const map = new Map();
    for (const vid of refs) {
      const n = Math.floor(vid / 1_000_000);
      map.set(n, (map.get(n) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([n, count]) => {
        const b = byNum[n];
        return {
          key: n,
          label: b ? b.en : `Book ${n}`,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [refs]);

  const filteredRefs = useMemo(() => {
    if (!refs) return null;
    if (!selectedBookNum) return refs;
    return refs.filter(
      (vid) => Math.floor(vid / 1_000_000) === selectedBookNum,
    );
  }, [refs, selectedBookNum]);

  // Fetch verse data for filtered references and build display rows
  useEffect(() => {
    if (!filteredRefs) return;
    let alive = true;
    setRows(null);
    const shown = filteredRefs.slice(0, MAX_SHOWN);
    const decoded = shown.map((vid) => ({ vid, ...decodeVid(vid) }));
    const bookNums = [...new Set(decoded.map((d) => d.n))];
    const srcCode = strongsSourceCode();

    Promise.all(
      bookNums.map((n) => loadBook(srcCode, n).then((data) => [n, data])),
    )
      .then((pairs) => {
        if (!alive) return;
        const byNumData = new Map(pairs);
        const built = decoded.map(({ vid, n, c, v }) => {
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
        setRows(built);
      })
      .catch(() => {
        if (alive) setRows([]);
      });

    return () => {
      alive = false;
    };
  }, [filteredRefs, code]);

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
        <p className="dim">Loading…</p>
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
          onSelectKey={setSelectedBookNum}
          totalCount={refs.length}
        />
      )}

      <h4 className="strongs-sub">
        Other occurrences
        {filteredRefs
          ? ` (${selectedBookNum ? filteredRefs.length : refs.length})`
          : ""}
      </h4>
      {refs === null || rows === null ? (
        <p className="dim">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="dim">No other tagged occurrences yet.</p>
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
                      {row.segments.flatMap((seg, i) => {
                        const piece = seg.bold ? (
                          <strong key={i}>{seg.t}</strong>
                        ) : (
                          seg.t
                        );
                        return i === 0 ? [piece] : [" ", piece];
                      })}
                    </span>
                  </button>
                </li>
              ),
          )}
          {filteredRefs.length > MAX_SHOWN && (
            <li className="dim strongs-more">
              +{filteredRefs.length - MAX_SHOWN} more not shown
            </li>
          )}
        </ul>
      )}
    </aside>
  );
}
