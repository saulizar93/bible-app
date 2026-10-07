import { useRef } from "react";
import { PANE_OPTIONS, optionFor } from "../../data.js";
import BiblePane from "../BiblePane/BiblePane.jsx";
import NotesPane from "../NotesPane/NotesPane.jsx";
import { isReady } from "../../offline.js";
import useOfflineStatus from "../../hooks/useOfflineStatus.js";
import "./PaneSlot.css";

export default function PaneSlot({
  code,
  refPos,
  highlight,
  selectedVerses,
  onSelect,
  strongsOn,
  onWordClick,
  onVerseClick,
  onVerseToggle,
  onClearHighlight,
}) {
  const opt = optionFor(code) || PANE_OPTIONS[0];
  const scroller = useRef(null);
  useOfflineStatus(); // re-render when a translation finishes downloading
  // "✓" after a name = downloaded and readable offline
  const optLabel = (o) => (isReady(o.code) ? `${o.label}  ✓` : o.label);
  const es = (() => {
    try {
      return localStorage.getItem("app_lang") === "es";
    } catch {
      return false;
    }
  })();
  const badge = opt.kind === "notes" ? (es ? "Notas" : "Notes") : opt.lang.toUpperCase();

  return (
    <section className="pane">
      <header className="pane-head">
        <label className={`pane-picker ${opt.kind}`}>
          <span className="pane-badge" aria-hidden="true">{badge}</span>
          {/* The visible label shows the full name (opt.name) of the selection and sizes
              the pill; the dropdown list itself uses the short labels. The native
              <select> lies invisibly on top of it and still opens the list. */}
          <span className="pane-current" aria-hidden="true">{opt.name || opt.label}</span>
          {isReady(opt.code) && (
            <span className="pane-offline" title={es ? "Disponible sin conexión" : "Available offline"} aria-hidden="true">
              ✓
            </span>
          )}
          <select
            value={code}
            onChange={(e) => onSelect(e.target.value)}
            aria-label={es ? "Elegir traducción o notas" : "Choose translation or notes"}
          >
          <optgroup label="English">
            {PANE_OPTIONS.filter(
              (o) => o.kind === "bible" && o.lang === "en",
            ).map((o) => (
              <option key={o.code} value={o.code}>
                {optLabel(o)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Español">
            {PANE_OPTIONS.filter(
              (o) => o.kind === "bible" && o.lang === "es",
            ).map((o) => (
              <option key={o.code} value={o.code}>
                {optLabel(o)}
              </option>
            ))}
          </optgroup>
          <optgroup label={es ? "Notas de estudio" : "Study notes"}>
            {PANE_OPTIONS.filter((o) => o.kind === "notes").map((o) => (
              <option key={o.code} value={o.code}>
                {optLabel(o)}
              </option>
            ))}
          </optgroup>
          </select>
          <svg className="pane-caret" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </label>
      </header>
      <div
        className="pane-body"
        ref={scroller}
        onClick={() => onClearHighlight?.()}
      >
        {opt.kind === "bible" ? (
          <BiblePane
            code={opt.code}
            refPos={refPos}
            highlight={highlight}
            selectedVerses={selectedVerses}
            scroller={scroller}
            strongsOn={strongsOn && !!opt.strongs}
            onWordClick={onWordClick}
            onVerseClick={onVerseClick}
            onVerseToggle={onVerseToggle}
          />
        ) : (
          <NotesPane
            lang={opt.lang}
            refPos={refPos}
            highlight={highlight}
            selectedVerses={selectedVerses}
            scroller={scroller}
          />
        )}
      </div>
    </section>
  );
}
