import { useState, useEffect } from "react";
import { byId } from "../../js/books.js";
import { loadBook, optionFor, noteLabelFor } from "../../js/data.js";
import { normalizeStrong } from "../../js/strongsCode.js";
import "./BiblePane.css";

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
  // Translator notes (`n` on a token, e.g. RVO): verses whose note box is open
  const [openNotes, setOpenNotes] = useState(() => new Set());
  const toggleNote = (v) =>
    setOpenNotes((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });

  useEffect(() => {
    let alive = true;
    setBook(null);
    setError(null);
    setOpenNotes(new Set());
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
  const italics = !!optionFor(code)?.italics; // KJV: supplied words in italics
  const allTokens = book?.w?.[refPos.chapter]; // translator notes show with Strong's on or off
  const noteLabel = noteLabelFor(code, optionFor(code)?.lang); // "Nota del traductor" only for the RVO

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

  const copyright = optionFor(code)?.copyright;

  const verseEls = verses.map((text, i) => {
    if (!text) return null;
    const tokens = tokensByVerse?.[i];
    const notes = (allTokens?.[i] || []).filter((t) => t.n).map((t) => t.n);
    const mark = (key) => (
      <button
        key={key}
        type="button"
        className="tn-mark"
        aria-label={noteLabel}
        aria-expanded={openNotes.has(i + 1)}
        onClick={(e) => {
          e.stopPropagation();
          toggleNote(i + 1);
        }}
      >
        †
      </button>
    );
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
        {tokens
          ? renderTokens(tokens, onWordClick, mark, italics)
          : (italics && renderItalics(allTokens?.[i], text)) || text}
        {!tokens && notes.length > 0 && mark("tn-end")}
        {notes.length > 0 && openNotes.has(i + 1) && (
          <span className="tn-box" onClick={(e) => e.stopPropagation()}>
            <span className="tn-label">{noteLabel}:</span>{" "}
            {notes.join(" ")}
          </span>
        )}
      </p>
    );
  });

  return (
    <>
      {verseEls}
      {copyright && <p className="pane-copyright">{copyright}</p>}
    </>
  );
}

/** Render a verse's tokens as spans, with a single space between each.
 *  Tagged words get a `.sw` span (clickable/underlined only while Strong's
 *  mode is on, via the .strongs-on CSS toggle — see app.css). */
/** Strong's off: the verse as plain text, with the translators' supplied words in
 *  italics. Returns null (show the plain text) if the tokens don't spell the verse. */
function renderItalics(tokens, text) {
  if (!tokens?.some((t) => t.it)) return null;
  const joined = tokens.map((t, i) => (i === 0 || t.j ? "" : " ") + t.t).join("");
  if (joined !== text) return null;
  return tokens.map((t, i) => {
    const sp = i === 0 || t.j ? "" : " ";
    return t.it ? (
      <span key={i}>
        {sp}
        <em className="supplied">{t.t}</em>
      </span>
    ) : (
      sp + t.t
    );
  });
}

function renderTokens(tokens, onWordClick, mark, italics) {
  return tokens.flatMap((tok, i) => {
    const code = tok.s && normalizeStrong(tok.s);
    const supplied = italics && tok.it ? " supplied" : "";
    const word = code ? (
      <span
        key={i}
        className={`strongs-underline${supplied}`}
        data-strong={code}
        onClick={(e) => {
          e.stopPropagation();
          onWordClick(code, tok.t, tok);
        }}
      >
        {tok.t}
      </span>
    ) : (
      <span key={i} className={supplied.trim() || undefined}>
        {tok.t}
      </span>
    );
    // `n` = translator note on this word: a † right after it opens the note
    const out = tok.n ? [word, mark(`tn${i}`)] : [word];
    // `j` = no space in the source before this token (a tag boundary inside a word)
    return i === 0 || tok.j ? out : [<span key={`sp${i}`}> </span>, ...out];
  });
}
