import BookPicker from "./BookPicker.jsx";
import { useState } from "react";

export default function JumpBar({
  query,
  onQueryChange,
  open,
  onOpenChange,
  options,
  placeholder,
  onSubmit,
  onPick,
  onStep,
  strongsOn,
  onToggleStrongs,
}) {
  const [bookPickerOpen, setBookPickerOpen] = useState(false);

  return (
    <>
      <form className="jump" onSubmit={onSubmit} autoComplete="off">
        <button
          type="button"
          onClick={() => onStep(-1)}
          aria-label="Previous chapter"
        >
          ‹
        </button>
        <div className="field">
          <input
            value={query}
            placeholder={placeholder}
            onChange={(e) => {
              onQueryChange(e.target.value);
              onOpenChange(true);
            }}
            onFocus={() => onOpenChange(true)}
            onBlur={() => setTimeout(() => onOpenChange(false), 150)}
            enterKeyHint="go"
          />
          {open && options.length > 0 && (
            <ul className="menu">
              {options.map((o) => (
                <li key={o.id}>
                  <button type="button" onMouseDown={() => onPick(o)}>
                    {o.en} {Math.min(o.chapter, o.chapters)}
                    {o.verse ? `:${o.verse}` : ""}
                    <span className="dim"> · {o.es}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="jump-book"
          onClick={() => setBookPickerOpen(true)}
          aria-label="Choose Bible book, chapter, and verse"
          title="Choose Bible reference"
        >
          📖
        </button>
        <button
          type="button"
          className={strongsOn ? "strongs-toggle on" : "strongs-toggle"}
          aria-pressed={strongsOn}
          onClick={onToggleStrongs}
          title="Underline Strong's-tagged Greek words"
        >
          Gk
        </button>
        <button
          type="button"
          onClick={() => onStep(1)}
          aria-label="Next chapter"
        >
          ›
        </button>
      </form>

      {bookPickerOpen && (
        <BookPicker
          onSelect={(ref) => {
            setBookPickerOpen(false);
            onPick(ref);
          }}
          onClose={() => setBookPickerOpen(false)}
        />
      )}
    </>
  );
}
