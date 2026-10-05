import { useState, useEffect, useRef, useMemo } from "react";
import BookPicker from "../BookPicker/BookPicker.jsx";
import BookFilterChart from "../BookFilterChart/BookFilterChart.jsx";
import MainMenu from "../MainMenu/MainMenu.jsx";
import { byId, parseRef } from "../../books.js";
import { searchAvailablePanes, splitSnippet } from "../../search.js";
import { optionFor } from "../../data.js";
import "./JumpBar.css";

export default function JumpBar({
  query,
  onQueryChange,
  open,
  onOpenChange,
  options,
  book,
  chapter,
  panes,
  placeholder,
  onSubmit,
  onPick,
  onStep,
  strongsOn,
  onToggleStrongs,
  lang = "en",
  onOpenSettings,
  onOpenPage,
}) {
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [wordMatches, setWordMatches] = useState([]);
  const [selectedBookFilter, setSelectedBookFilter] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const searchInputRef = useRef(null);

  const displayTitle = book ? `${book.en} ${chapter}` : placeholder;
  const isOT = (book?.n ?? 40) <= 39; // books 1–39: Hebrew/Aramaic; 40–66: Greek
  // Only offer the Strong's toggle when a pane shows a Strong's-tagged translation.
  const hasStrongsPane = (panes || []).some((c) => optionFor(c)?.strongs);
  const parsedRef = parseRef(query);
  const parsedBook = parsedRef ? byId[parsedRef.book] : null;

  const activeSources = [...new Set(panes || [])]
    .map(optionFor)
    .filter(Boolean);
  const activeSourcesLabel = activeSources.map((s) => s.label).join(" & ");
  const maxResults = 1000;

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

  // Execute word search debounced across active panes
  useEffect(() => {
    setSelectedBookFilter(null);
    if (!searchOpen) {
      setWordMatches([]);
      setIsSearching(false);
      setSearchedQuery("");
      return;
    }

    const trimmed = (query || "").trim();
    if (trimmed.length < 2) {
      setWordMatches([]);
      setIsSearching(false);
      setSearchedQuery("");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      setSearchedQuery(trimmed);
      searchAvailablePanes(trimmed, panes || [], book?.id || "MAT", {
        signal: controller.signal,
        onProgress: (partial) => {
          setWordMatches(partial);
        },
        maxResults: maxResults,
      })
        .then((results) => {
          if (!controller.signal.aborted) {
            setWordMatches(results);
            setIsSearching(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 320);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, searchOpen, panes, book?.id]);

  const chartItems = useMemo(() => {
    if (!wordMatches.length) return [];
    const map = new Map();
    for (const m of wordMatches) {
      if (!map.has(m.bookId)) {
        map.set(m.bookId, {
          key: m.bookId,
          label: m.bookName,
          count: 0,
        });
      }
      map.get(m.bookId).count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [wordMatches]);

  const displayedMatches = useMemo(() => {
    if (!selectedBookFilter) return wordMatches;
    return wordMatches.filter((m) => m.bookId === selectedBookFilter);
  }, [wordMatches, selectedBookFilter]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (parsedRef && parsedBook) {
      onPick({
        id: parsedRef.book,
        chapter: parsedRef.chapter,
        verse: parsedRef.verse,
        chapters: parsedBook.chapters,
      });
      setSearchOpen(false);
      return;
    }

    const success = onSubmit(e);
    if (success) {
      setSearchOpen(false);
    }
  };

  const handleSelectOption = (o) => {
    onPick(o);
    setSearchOpen(false);
  };

  const handleSelectMatch = (match) => {
    onPick({
      id: match.bookId,
      chapter: match.chapter,
      verse: match.verse,
      chapters: match.chapters,
    });
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
          className="nav-step settings-trigger"
          onClick={onOpenSettings}
          aria-label={lang === "es" ? "Ajustes de lectura" : "Reading settings"}
          title={lang === "es" ? "Ajustes de lectura" : "Reading settings"}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <MainMenu lang={lang} onOpenPage={onOpenPage} />

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

          {hasStrongsPane && (
          <button
            type="button"
            className={strongsOn ? "strongs-toggle on" : "strongs-toggle"}
            aria-pressed={strongsOn}
            onClick={onToggleStrongs}
            title={
              isOT
                ? "Underline Strong's-tagged Hebrew words"
                : "Underline Strong's-tagged Greek words"
            }
          >
            {isOT ? "Heb" : "Gk"}
          </button>
          )}

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
            aria-label="Search reference or word"
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
                  placeholder="Search verse (e.g. Jn 3:16) or word (e.g. grace)..."
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
                      setWordMatches([]);
                      setSelectedBookFilter(null);
                      setSearchedQuery("");
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

            <div className="search-sources-bar">
              <span className="search-sources-label">In:</span>
              <span className="search-sources-names">
                {activeSourcesLabel || "Active panes"}
              </span>
              {isSearching && (
                <span className="search-spinner" aria-live="polite">
                  Searching…
                </span>
              )}
            </div>

            <div className="search-search-info dim">
              Current book is searched first · Up to{" "}
              {maxResults.toLocaleString()} matches
            </div>

            <div className="search-results-container">
              {parsedRef && parsedBook && (
                <div className="search-jump-card">
                  <button
                    type="button"
                    className="search-jump-btn"
                    onClick={() => {
                      onPick({
                        id: parsedRef.book,
                        chapter: parsedRef.chapter,
                        verse: parsedRef.verse,
                        chapters: parsedBook.chapters,
                      });
                      setSearchOpen(false);
                    }}
                  >
                    <span className="search-jump-icon">📖</span>
                    <div className="search-jump-info">
                      <div className="search-jump-title">
                        Go to {parsedBook.en} {parsedRef.chapter}
                        {parsedRef.verse ? `:${parsedRef.verse}` : ""}
                      </div>
                      <div className="dim">Jump directly to this passage</div>
                    </div>
                  </button>
                </div>
              )}

              {wordMatches.length > 0 && (
                <>
                  <div className="search-section-header">
                    <span>
                      Matches for “{searchedQuery}” ({displayedMatches.length}
                      {selectedBookFilter ? ` of ${wordMatches.length}` : ""})
                    </span>
                  </div>

                  <BookFilterChart
                    items={chartItems}
                    selectedKey={selectedBookFilter}
                    onSelectKey={setSelectedBookFilter}
                    totalCount={wordMatches.length}
                  />

                  <ul className="search-results-list">
                    {displayedMatches.map((m) => (
                      <li key={m.id} className="search-result-item">
                        <button
                          type="button"
                          onClick={() => handleSelectMatch(m)}
                        >
                          <div className="search-match-head">
                            <span className="search-match-ref">
                              {m.bookName} {m.chapter}:{m.verseRange || m.verse}
                            </span>
                            <span className={`search-badge ${m.kind}`}>
                              {m.sourceLabel}
                            </span>
                          </div>
                          <div className="search-match-snippet">
                            {splitSnippet(m.snippet, searchedQuery).map(
                              (part, i) =>
                                part.highlight ? (
                                  <strong key={i} className="search-highlight">
                                    {part.text}
                                  </strong>
                                ) : (
                                  part.text
                                ),
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {open &&
                options.length > 0 &&
                wordMatches.length === 0 &&
                !parsedRef && (
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

              {!isSearching &&
                searchedQuery &&
                wordMatches.length === 0 &&
                !parsedRef && (
                  <div className="search-empty">
                    <p>
                      No matches found for “{searchedQuery}” in{" "}
                      {activeSourcesLabel || "active panes"}.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
