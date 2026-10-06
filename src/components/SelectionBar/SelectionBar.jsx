import { useState, useEffect } from "react";
import "./SelectionBar.css";

const T = {
  en: { one: "verse selected", many: "verses selected", copy: "Copy", copied: "Copied", compare: "Compare", clear: "Clear selection" },
  es: { one: "versículo seleccionado", many: "versículos seleccionados", copy: "Copiar", copied: "Copiado", compare: "Comparar", clear: "Borrar selección" },
};

/**
 * Bottom bar shown while one or more verses are selected. Owns its own
 * "Copied" confirmation state — resets to "Copy" whenever `selectionKey`
 * changes (add/remove a verse, switch source, clear selection), so nothing
 * outside this component needs to know or care that the label is temporary.
 */
export default function SelectionBar({ count, selectionKey, onCopy, onCompare, onClear, lang = "en" }) {
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
      <span>
        {count} {count === 1 ? t.one : t.many}
      </span>

      <button onClick={handleCopy}>{copied ? t.copied : t.copy}</button>

      {onCompare && <button onClick={onCompare}>{t.compare}</button>}

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
