import "./ChapterNav.css";

const T = {
  en: { prev: "Previous chapter", next: "Next chapter", show: "Show the bottom pane" },
  es: { prev: "Capítulo anterior", next: "Capítulo siguiente", show: "Mostrar el panel inferior" },
};

/**
 * Floating previous / next chapter buttons, drawn over the panes by SplitPanes.
 * Side by side (wide screens): middle of the left and right edges.
 * Stacked (phones): bottom-left and bottom-right of the lower pane.
 * The placement is pure CSS (ChapterNav.css), using the same 820px breakpoint
 * that switches .panes between column and row.
 * When the bottom pane is hidden (Settings), the round + that brings it back is
 * drawn here too, stacked just above the → button so neither covers the other.
 */
export default function ChapterNav({ onStep, lang = "en", onShowBottom = null, aboveBar = false }) {
  const t = T[lang] || T.en;
  return (
    <>
      <button
        type="button"
        className="chapter-nav prev"
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
        className="chapter-nav next"
        onClick={() => onStep(1)}
        aria-label={t.next}
        title={t.next}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </button>
      {onShowBottom && (
        <button
          type="button"
          className={aboveBar ? "show-bottom-fab in-nav above-bar" : "show-bottom-fab in-nav"}
          onClick={onShowBottom}
          aria-label={t.show}
          title={t.show}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      )}
    </>
  );
}
