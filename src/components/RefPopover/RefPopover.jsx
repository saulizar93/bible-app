import { useState, useEffect } from "react";
import { byId, bookName } from "../../js/books.js";
import { PANE_OPTIONS, loadBook } from "../../js/data.js";
import { findRefs } from "../../js/refLinks.js";
import "./RefPopover.css";

// "KJV" -> "kjv-strong", "RVG" -> "rvg-strong"...: the first word of each Bible's label.
const VERSION = Object.fromEntries(
  PANE_OPTIONS.filter((o) => o.kind === "bible").map((o) => [o.label.split(/\s/)[0].toUpperCase(), o.code]),
);
const DEFAULT = { en: "kjv-strong", es: "rvg-strong" };

const T = {
  en: { go: "Go to passage", close: "Close", loading: "Loading…", missing: "Verse not found.", shown: (v, b) => `${v} isn't in the app; showing the ${b}.` },
  es: { go: "Ir al pasaje", close: "Cerrar", loading: "Cargando…", missing: "No se encontró el versículo.", shown: (v, b) => `La ${v} no está en la aplicación; se muestra la ${b}.` },
};

/** Plain text with every Bible reference turned into a link that opens the
 *  verse pop-up (see RefPopover below). `onOpen(ref, element)`. */
export function RefText({ text, onOpen }) {
  return findRefs(text).map((part, i) =>
    typeof part === "string" ? (
      part
    ) : (
      // A span, not a <button>: buttons can't break across lines, so "(Is 11:10"
      // would jump to the next line by itself.
      <span
        key={i}
        role="button"
        tabIndex={0}
        className="ref-link"
        onClick={(e) => {
          e.stopPropagation(); // don't clear the pane's highlight
          onOpen(part.ref, e.currentTarget);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onOpen(part.ref, e.currentTarget);
          }
        }}
      >
        {part.text}
      </span>
    ),
  );
}

/** Small card next to a tapped reference showing the verse(s), with "Go to". */
export default function RefPopover({ target, anchor, lang = "en", onGo, onClose }) {
  const t = T[lang] || T.en;
  const asked = target.version && VERSION[target.version] ? VERSION[target.version] : null;
  const code = asked || DEFAULT[lang] || DEFAULT.en;
  const label = PANE_OPTIONS.find((o) => o.code === code)?.label.split(/\s/)[0] || code;
  const book = byId[target.book];
  const [verses, setVerses] = useState(null);
  // Placed once when it opens (NotesPane gives each opening its own key).
  const [pos] = useState(() => placeNear(anchor));

  useEffect(() => {
    let alive = true;
    loadBook(code, book.n)
      .then((d) => {
        if (!alive) return;
        const ch = d?.v?.[target.chapter] || [];
        setVerses(
          target.verses
            .map((v) => ({ v, text: (ch[v - 1] || "").replace(/^¶\s*/, "") }))
            .filter((x) => x.text),
        );
      })
      .catch(() => alive && setVerses([]));
    return () => {
      alive = false;
    };
  }, [code, book.n, target]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const range = target.verses.length ? `:${compact(target.verses)}` : "";
  return (
    <>
      <div className="ref-backdrop" onClick={onClose} />
      <div
        className="ref-popover"
        role="dialog"
        aria-label={`${bookName(book, lang)} ${target.chapter}${range}`}
        style={pos}
      >
        <div className="ref-head">
          <span className="ref-title">
            {bookName(book, lang)} {target.chapter}
            {range}
            <span className="ref-version"> · {label}</span>
          </span>
          <button type="button" className="ref-close" onClick={onClose} aria-label={t.close}>
            ×
          </button>
        </div>
        {target.version && !asked && <p className="ref-note">{t.shown(target.version, label)}</p>}
        <div className="ref-body">
          {verses === null ? (
            <p className="ref-dim">{t.loading}</p>
          ) : verses.length === 0 ? (
            <p className="ref-dim">{t.missing}</p>
          ) : (
            verses.map((x) => (
              <p key={x.v} className="ref-verse">
                <sup>{x.v}</sup> {x.text}
              </p>
            ))
          )}
        </div>
        <button
          type="button"
          className="ref-go"
          onClick={() => {
            onGo({ book: target.book, chapter: target.chapter, verse: target.verses[0] || null });
            onClose();
          }}
        >
          {t.go}
        </button>
      </div>
    </>
  );
}

/** Below the link, or above it when the link is low on the screen; kept inside
 *  the screen sideways. */
function placeNear(anchor) {
  const r = anchor.getBoundingClientRect();
  const w = Math.min(360, window.innerWidth - 24);
  const left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
  return r.bottom < window.innerHeight * 0.55
    ? { left, width: w, top: r.bottom + 6 }
    : { left, width: w, bottom: window.innerHeight - r.top + 6 };
}

/** [11,12,13,15] -> "11-13, 15" */
function compact(vs) {
  const out = [];
  for (let i = 0; i < vs.length; i++) {
    let j = i;
    while (j + 1 < vs.length && vs[j + 1] === vs[j] + 1) j++;
    out.push(j > i ? `${vs[i]}-${vs[j]}` : `${vs[i]}`);
    i = j;
  }
  return out.join(", ");
}
