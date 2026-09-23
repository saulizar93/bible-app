import { useState, useEffect } from "react";

/**
 * Bottom bar shown while one or more verses are selected. Owns its own
 * "Copied" confirmation state — resets to "Copy" whenever `selectionKey`
 * changes (add/remove a verse, switch source, clear selection), so nothing
 * outside this component needs to know or care that the label is temporary.
 */
export default function SelectionBar({ count, selectionKey, onCopy, onClear }) {
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
        {count} {count === 1 ? "verse" : "verses"} selected
      </span>

      <button onClick={handleCopy}>{copied ? "Copied" : "Copy"}</button>

      <button
        className="selection-close"
        onClick={onClear}
        aria-label="Clear selection"
      >
        ×
      </button>
    </div>
  );
}
