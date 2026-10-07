import { useEffect, useMemo, useState } from "react";
import { byId } from "../../js/books.js";
import { loadBook, PANE_OPTIONS, optionFor } from "../../js/data.js";
import "./CompareModal.css";

const T = {
  en: { title: "Compare translations", close: "Close", loading: "Loading…", missing: "Not available in this translation.",
        hint: "Tap a translation to open it in the other pane.", current: "current" },
  es: { title: "Comparar traducciones", close: "Cerrar", loading: "Cargando…", missing: "No disponible en esta traducción.",
        hint: "Toque una traducción para abrirla en el otro panel.", current: "actual" },
};

/** "Juan 3:16-18, 20" style reference for a sorted verse list. */
function refLabel(bookName, chapter, verses) {
  const parts = [];
  let start = verses[0], prev = verses[0];
  for (const v of [...verses.slice(1), null]) {
    if (v === prev + 1) { prev = v; continue; }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = v;
  }
  return `${bookName} ${chapter}:${parts.join(", ")}`;
}

/**
 * The selected verses in every Bible in the app, one block per translation:
 * the translation they were selected in first, then the others in the same
 * language, then the other language. Picking a block calls onPick(code).
 */
export default function CompareModal({ source, bookId, chapter, verses, lang = "en", onPick, onClose }) {
  const t = T[lang] || T.en;
  const book = byId[bookId];
  const sorted = useMemo(() => [...verses].sort((a, b) => a - b), [verses]);

  const order = useMemo(() => {
    const bibles = PANE_OPTIONS.filter((o) => o.kind === "bible");
    const src = optionFor(source);
    const srcLang = src?.lang || lang;
    return [
      ...(src ? [src] : []),
      ...bibles.filter((o) => o.code !== source && o.lang === srcLang),
      ...bibles.filter((o) => o.code !== source && o.lang !== srcLang),
    ];
  }, [source, lang]);

  // code -> array of verse texts (undefined = loading, null = failed)
  const [texts, setTexts] = useState({});
  useEffect(() => {
    let alive = true;
    for (const o of order) {
      loadBook(o.code, book.n)
        .then((data) => {
          const ch = data?.v?.[chapter];
          if (alive) setTexts((prev) => ({ ...prev, [o.code]: ch ? sorted.map((v) => ch[v - 1] || "") : null }));
        })
        .catch(() => alive && setTexts((prev) => ({ ...prev, [o.code]: null })));
    }
    return () => {
      alive = false;
    };
  }, [order, book.n, chapter, sorted]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="compare-backdrop" onClick={onClose} />
      <div className="compare-modal" role="dialog" aria-modal="true" aria-label={t.title}>
        <header className="compare-head">
          <div>
            <h2>{t.title}</h2>
            <p className="compare-ref">{refLabel(lang === "es" ? book.es : book.en, chapter, sorted)}</p>
          </div>
          <button type="button" className="compare-close" onClick={onClose} aria-label={t.close}>
            ×
          </button>
        </header>
        <p className="compare-hint">{t.hint}</p>

        <ul className="compare-list">
          {order.map((o, i) => {
            const list = texts[o.code];
            const name = o.lang === "es" ? book.es : book.en;
            const empty = list && list.every((x) => !x);
            const newGroup = i > 0 && o.lang !== order[i - 1].lang;
            return (
              <li key={o.code} className={newGroup ? "compare-group-start" : undefined}>
                <button
                  type="button"
                  className={o.code === source ? "compare-item current" : "compare-item"}
                  onClick={() => onPick(o.code)}
                >
                  <span className="compare-item-head">
                    <span className="compare-label">{o.label}</span>
                    {o.code === source && <span className="compare-badge">{t.current}</span>}
                    <span className="compare-cite">{refLabel(name, chapter, sorted)}</span>
                  </span>
                  {list === undefined ? (
                    <span className="compare-text dim">{t.loading}</span>
                  ) : list === null || empty ? (
                    <span className="compare-text dim">{t.missing}</span>
                  ) : (
                    <span className="compare-text">
                      {list.map((txt, k) =>
                        txt ? (
                          <span key={k}>
                            {sorted.length > 1 && <sup className="compare-vnum">{sorted[k]}</sup>}
                            {txt}{" "}
                          </span>
                        ) : null,
                      )}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
