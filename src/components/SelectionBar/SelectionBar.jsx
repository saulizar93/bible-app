import { useState, useEffect } from "react";
import "./SelectionBar.css";

const T = {
  en: { one: "verse selected", many: "verses selected", copy: "Copy", copied: "Copied", compare: "Compare", greek: "Greek", hebrew: "Hebrew", greekTitle: "Show the Greek of the selected verses", hebrewTitle: "Show the Hebrew of the selected verses", clear: "Clear selection" },
  es: { one: "versículo seleccionado", many: "versículos seleccionados", copy: "Copiar", copied: "Copiado", compare: "Comparar", greek: "Griego", hebrew: "Hebreo", greekTitle: "Mostrar el griego de los versículos seleccionados", hebrewTitle: "Mostrar el hebreo de los versículos seleccionados", clear: "Borrar selección" },
};

/**
 * Bottom bar shown while one or more verses are selected. Owns its own
 * "Copied" confirmation state — resets to "Copy" whenever `selectionKey`
 * changes (add/remove a verse, switch source, clear selection), so nothing
 * outside this component needs to know or care that the label is temporary.
 */
export default function SelectionBar({ count, selectionKey, onCopy, onCompare, onGreek, original = "greek", onClear, lang = "en" }) {
  const t = T[lang] || T.en;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [selectionKey]);

  const handleCopy = async () => {
    const ok = await onCopy();
    if (ok !== false) setCopied(true);
  };

  return (
    <div className="selection-bar">
      {/* Short count ("+1", "+2"…); the full wording stays for screen readers. */}
      <span
        className="selection-count"
        aria-label={`${count} ${count === 1 ? t.one : t.many}`}
        title={`${count} ${count === 1 ? t.one : t.many}`}
      >
        +{count}
      </span>

      <button onClick={handleCopy}>{copied ? t.copied : t.copy}</button>

      {onCompare && <button onClick={onCompare}>{t.compare}</button>}

      {onGreek && (
        <button onClick={onGreek} title={original === "hebrew" ? t.hebrewTitle : t.greekTitle}>
          {original === "hebrew" ? t.hebrew : t.greek}
        </button>
      )}

      <button
        className="selection-close"
        onClick={onClear}
        aria-label={t.clear}
      >
        ×
      </button>
    </div>
  );
}
