import { useState, useEffect, useRef } from "react";
import BookPicker from "../BookPicker/BookPicker.jsx";
import "./JumpBar.css";

export default function JumpBar({
  query,
  onQueryChange,
  open,
  onOpenChange,
  options,
  book,
  chapter,
  placeholder,
  onSubmit,
  onPick,
  onStep,
  strongsOn,
  onToggleStrongs,
}) {
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const displayTitle = book ? `${book.en} ${chapter}` : placeholder;

  useEffect(() => {
    if (!searchOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, onOpenChange]);

  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const success = onSubmit(e);
    if (success !== false) {
      setSearchOpen(false);
    }
  };

  const handleSelectOption = (o) => {
    onPick(o);
    setSearchOpen(false);
  };

  return (
    <>
      <header className="jump">
        <button
          type="button"
          className="nav-step"
          onClick={() => onStep(-1)}
          aria-label="Previous chapter"
          title="Previous chapter"
        >
          ‹
        </button>

        <button
          type="button"
          className="book-picker-trigger"
          onClick={() => setBookPickerOpen(true)}
          aria-label="Choose Bible book, chapter, and verse"
          title="Choose Bible reference"
        >
          <span className="book-title">{displayTitle}</span>
          <span className="picker-caret" aria-hidden="true">
            ▾
          </span>
        </button>

        <div className="jump-actions">
          <button
            type="button"
            className="search-trigger"
            onClick={() => {
              setSearchOpen(true);
              onOpenChange(true);
            }}
            aria-label="Search verse reference"
            title="Search reference"
          >
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
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
            className="nav-step"
            onClick={() => onStep(1)}
            aria-label="Next chapter"
            title="Next chapter"
          >
            ›
          </button>
        </div>
      </header>

      {bookPickerOpen && (
        <BookPicker
          currentBook={book}
          onSelect={(ref) => {
            setBookPickerOpen(false);
            onPick(ref);
          }}
          onClose={() => setBookPickerOpen(false)}
        />
      )}

      {searchOpen && (
        <>
          <div
            className="search-backdrop"
            onClick={() => {
              setSearchOpen(false);
              onOpenChange(false);
            }}
          />
          <div
            className="search-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Search reference"
          >
            <form
              className="search-form"
              onSubmit={handleFormSubmit}
              autoComplete="off"
            >
              <div className="search-input-wrap">
                <svg
                  className="search-input-icon"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchInputRef}
                  className="search-input"
                  value={query}
                  placeholder="Jump to verse (e.g. Jn 3:16, Mt 5)..."
                  onChange={(e) => {
                    onQueryChange(e.target.value);
                    onOpenChange(true);
                  }}
                  enterKeyHint="go"
                />
                {query && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => {
                      onQueryChange("");
                      onOpenChange(false);
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="button"
                className="search-cancel-btn"
                onClick={() => {
                  setSearchOpen(false);
                  onOpenChange(false);
                }}
              >
                Cancel
              </button>
            </form>

            {open && options.length > 0 && (
              <ul className="search-results-menu">
                {options.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectOption(o)}
                    >
                      <span className="search-result-main">
                        {o.en} {Math.min(o.chapter, o.chapters)}
                        {o.verse ? `:${o.verse}` : ""}
                      </span>
                      <span className="dim"> · {o.es}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
