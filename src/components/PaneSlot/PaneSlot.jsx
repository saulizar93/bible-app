import { useRef } from "react";
import { PANE_OPTIONS, optionFor } from "../../js/data.js";
import BiblePane from "../BiblePane/BiblePane.jsx";
import NotesPane from "../NotesPane/NotesPane.jsx";
import { getState, downloadPack, cancelDownload, approxSize } from "../../js/offline.js";
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
  onGo, // go to a passage (references in the notes)
  greekVerses, // verses showing their Greek (Interlinear)
  onCloseGreek,
  onAbout, // (code) => show this Bible's section of Bible Translations
}) {
  const opt = optionFor(code) || PANE_OPTIONS[0];
  const scroller = useRef(null);
  useOfflineStatus(); // re-render when a translation finishes downloading
  const optLabel = (o) => o.label;
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
        {opt.about && onAbout ? (
          <button
            type="button"
            className="pane-side pane-about"
            onClick={() => onAbout(opt.code)}
            aria-label={es ? `Acerca de ${opt.name || opt.label}` : `About ${opt.name || opt.label}`}
            title={es ? "Acerca de esta traducción" : "About this translation"}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 11v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="7.6" r="1.35" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <span className="pane-side" aria-hidden="true" />
        )}
        <label className={`pane-picker ${opt.kind}`}>
          <span className="pane-badge" aria-hidden="true">{badge}</span>
          {/* The visible label shows the full name (opt.name) of the selection and sizes
              the pill; the dropdown list itself uses the short labels. The native
              <select> lies invisibly on top of it and still opens the list. */}
          <span className="pane-current" aria-hidden="true">{opt.name || opt.label}</span>
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
        <DownloadButton code={opt.code} es={es} />
      </header>
      <div
        className={opt.kind === "notes" ? "pane-body notes-body" : "pane-body"}
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
            greekVerses={greekVerses}
            onCloseGreek={onCloseGreek}
            uiLang={es ? "es" : "en"}
          />
        ) : (
          <NotesPane
            lang={opt.lang}
            refPos={refPos}
            highlight={highlight}
            selectedVerses={selectedVerses}
            scroller={scroller}
            onGo={onGo}
          />
        )}
      </div>
    </section>
  );
}

/** Download / update / downloading / downloaded, for the Bible (or notes) in this pane.
 *  The same downloads as Settings ▸ Download App (src/js/offline.js). */
function DownloadButton({ code, es }) {
  const st = getState(code);
  const opt = optionFor(code);
  const size = opt ? approxSize(opt) : 0;
  const pct = Math.round((st.progress || 0) * 100);
  const t = es
    ? {
        none: `Descargar para usar sin conexión (≈ ${size} MB)`,
        outdated: "Hay una actualización: toque para descargarla",
        downloading: `Descargando… ${pct}% (toque para cancelar)`,
        ready: "Descargada: disponible sin conexión",
        error: "La descarga falló: toque para reintentar",
      }
    : {
        none: `Download for offline use (≈ ${size} MB)`,
        outdated: "Update available: tap to download it",
        downloading: `Downloading… ${pct}% (tap to cancel)`,
        ready: "Downloaded: available offline",
        error: "Download failed: tap to try again",
      };
  const state = st.error && st.state !== "downloading" ? "error" : st.state;
  const label = t[state] || t.none;
  const onClick = () => {
    if (st.state === "downloading") cancelDownload(code);
    else if (st.state !== "ready") downloadPack(code);
  };
  const R = 9.5;
  const C = 2 * Math.PI * R;
  return (
    <button
      type="button"
      className={`pane-side pane-download ${state}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-disabled={state === "ready" || undefined}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        {state === "downloading" && (
          <>
            <circle cx="12" cy="12" r={R} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.2" />
            <circle
              cx="12"
              cy="12"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeDasharray={`${(C * pct) / 100} ${C}`}
              transform="rotate(-90 12 12)"
              strokeLinecap="round"
            />
          </>
        )}
        {state === "ready" ? (
          // downloaded: the green circle with the white arrow
          <>
            <circle cx="12" cy="12" r="10" fill="#2f855a" />
            <path d="M12 6.5v8M8.4 11.4l3.6 3.6 3.6-3.6M8 17.5h8" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : state === "downloading" ? (
          <path d="M9.5 9.5h5v5h-5z" fill="currentColor" />
        ) : (
          // not downloaded (or an update waits): the same arrow inside an outlined circle
          <>
            <circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 6.5v8M8.4 11.4l3.6 3.6 3.6-3.6M8 17.5h8" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
      {(state === "outdated" || state === "error") && <span className="pane-download-dot" aria-hidden="true" />}
    </button>
  );
}
