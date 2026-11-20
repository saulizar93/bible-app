import "./ChapterNav.css";

const T = {
  en: { prev: "Previous chapter", next: "Next chapter", show: "Show the 2nd pane", hide: "Hide the 2nd pane", vprev: "Previous verse", vnext: "Next verse" },
  es: { prev: "Capítulo anterior", next: "Capítulo siguiente", show: "Mostrar el 2.º panel", hide: "Ocultar el 2.º panel", vprev: "Versículo anterior", vnext: "Versículo siguiente" },
};

/**
 * Floating previous / next chapter buttons, drawn over the panes by SplitPanes.
 * Side by side (wide screens): middle of the left and right edges.
 * Stacked (phones): bottom-left and bottom-right of the lower pane.
 * The placement is pure CSS (ChapterNav.css), using the same 820px breakpoint
 * that switches .panes between column and row.
 * Just above the → button sits a matching round − / + that hides the 2nd pane
 * (−) or brings it back (+).
 */
export default function ChapterNav({ onStep, onVerseStep = null, lang = "en", bottomHidden = false, onToggleBottom = null, aboveBar = false }) {
  const t = T[lang] || T.en;
  return (
    <>
      <button
        type="button"
        className={aboveBar ? "chapter-nav prev above-bar" : "chapter-nav prev"}
        onClick={() => onStep(-1)}
        aria-label={t.prev}
        title={t.prev}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5" />
          <path d="M11 6l-6 6 6 6" />
        </svg>
      </button>
      <button
        type="button"
        className={aboveBar ? "chapter-nav next above-bar" : "chapter-nav next"}
        onClick={() => onStep(1)}
        aria-label={t.next}
        title={t.next}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </button>
      {/* ▲ / ▼: highlight the previous / next verse in both panes (middle right) */}
      {onVerseStep && (
        <div className="verse-nav">
          <button type="button" className="chapter-nav vstep" onClick={() => onVerseStep(-1)} aria-label={t.vprev} title={t.vprev}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5" />
              <path d="M6 11l6-6 6 6" />
            </svg>
          </button>
          <button type="button" className="chapter-nav vstep" onClick={() => onVerseStep(1)} aria-label={t.vnext} title={t.vnext}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M18 13l-6 6-6-6" />
            </svg>
          </button>
        </div>
      )}
      {onToggleBottom && (
        <button
          type="button"
          className={aboveBar ? "chapter-nav pane-toggle above-bar" : "chapter-nav pane-toggle"}
          onClick={onToggleBottom}
          aria-label={bottomHidden ? t.show : t.hide}
          title={bottomHidden ? t.show : t.hide}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            {bottomHidden ? <path d="M12 5v14M5 12h14" /> : <path d="M5 12h14" />}
          </svg>
        </button>
      )}
    </>
  );
}
