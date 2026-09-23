import { useState, useEffect } from "react";
import { byId } from "../books.js";
import { loadBook } from "../data.js";
import { normalizeStrong } from "../strongsCode.js";

export default function BiblePane({
  code,
  refPos,
  highlight,
  selectedVerses,
  scroller,
  strongsOn,
  onWordClick,
  onVerseClick,
  onVerseToggle,
}) {
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setBook(null);
    setError(null);
    loadBook(code, byId[refPos.book].n)
      .then((b) => {
        if (alive) setBook(b || { v: {} });
      })
      .catch((e) => {
        if (alive) {
          setBook({ v: {} });
          setError(e.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [code, refPos.book, refPos.chapter]);

  const verses = book?.v[refPos.chapter];
  const tokensByVerse = strongsOn ? book?.w?.[refPos.chapter] : null;

  useEffect(() => {
    if (!verses || !highlight) return;
    scroller.current
      ?.querySelector(`[data-v="${highlight}"]`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [verses, highlight, scroller]);

  if (error)
    return (
      <p className="err">
        Missing data file — run the build script for “{code}”.
      </p>
    );
  if (!verses) return <p className="dim">Loading…</p>;

  return verses.map((text, i) => {
    if (!text) return null;
    const tokens = tokensByVerse?.[i];
    return (
      <p
        key={i}
        data-v={i + 1}
        className={[
          "verse",
          highlight === i + 1 ? "hit" : "",
          selectedVerses?.has(i + 1) ? "selected" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(e) => {
          e.stopPropagation();
          onVerseToggle?.(i + 1);
        }}
      >
        <span
          className="vnum"
          onClick={(e) => {
            e.stopPropagation();
            onVerseClick?.(i + 1);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onVerseClick?.(i + 1);
            }
          }}
        >
          {i + 1}
        </span>
        {tokens ? renderTokens(tokens, onWordClick) : text}
      </p>
    );
  });
}

/** Render a verse's tokens as spans, with a single space between each.
 *  Tagged words get a `.sw` span (clickable/underlined only while Strong's
 *  mode is on, via the .strongs-on CSS toggle — see app.css). */
function renderTokens(tokens, onWordClick) {
  return tokens.flatMap((tok, i) => {
    const code = tok.s && normalizeStrong(tok.s);
    const word = code ? (
      <span
        key={i}
        className="sw"
        data-strong={code}
        onClick={() => onWordClick(code, tok.t)}
      >
        {tok.t}
      </span>
    ) : (
      <span key={i}>{tok.t}</span>
    );
    return i === 0 ? [word] : [<span key={`sp${i}`}> </span>, word];
  });
}
