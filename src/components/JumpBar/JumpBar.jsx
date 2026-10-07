import { useState, useEffect, useRef, useMemo } from "react";
import BookPicker from "../BookPicker/BookPicker.jsx";
import BookFilterChart from "../BookFilterChart/BookFilterChart.jsx";
import MainMenu from "../MainMenu/MainMenu.jsx";
import { byId, parseRef, bookName } from "../../js/books.js";
import { searchAvailablePanes, splitSnippet } from "../../js/search.js";
import { optionFor } from "../../js/data.js";
import "./JumpBar.css";

const T = {
  en: {
    prev: "Previous chapter", next: "Next chapter", settings: "Reading settings",
    pickerAria: "Choose Bible book, chapter, and verse", pickerTitle: "Choose Bible reference",
    searchAria: "Search verse reference", searchTitle: "Search reference",
    strongsOT: "Underline Strong's-tagged Hebrew words", strongsNT: "Underline Strong's-tagged Greek words",
    heb: "Heb", gk: "Gk",
    dialog: "Search reference or word",
    placeholder: "Search verse (e.g. Jn 3:16) or word (e.g. grace)...",
    clear: "Clear search", cancel: "Cancel", in: "In:", activePanes: "Active panes", searching: "Searching…",
    info: (n) => `Current book is searched first · Up to ${n} matches`,
    goTo: "Go to", jumpHint: "Jump directly to this passage",
    matchesFor: (q, shown, total) => `Matches for “${q}” (${shown}${total != null ? ` of ${total}` : ""})`,
    none: (q, src) => `No matches found for “${q}” in ${src || "active panes"}.`,
  },
  es: {
    prev: "Capítulo anterior", next: "Capítulo siguiente", settings: "Ajustes de lectura",
    pickerAria: "Elegir libro, capítulo y versículo", pickerTitle: "Elegir referencia bíblica",
    searchAria: "Buscar referencia de versículo", searchTitle: "Buscar referencia",
    strongsOT: "Subrayar las palabras hebreas con números Strong", strongsNT: "Subrayar las palabras griegas con números Strong",
    heb: "Heb", gr: "Gr",
    dialog: "Buscar referencia o palabra",
    placeholder: "Buscar versículo (p. ej., Jn 3:16) o palabra (p. ej., gracia)...",
    clear: "Borrar búsqueda", cancel: "Cancelar", in: "En:", activePanes: "Paneles activos", searching: "Buscando…",
    info: (n) => `Se busca primero en el libro actual · Hasta ${n} coincidencias`,
    goTo: "Ir a", jumpHint: "Ir directamente a este pasaje",
    matchesFor: (q, shown, total) => `Coincidencias para «${q}» (${shown}${total != null ? ` de ${total}` : ""})`,
    none: (q, src) => `No se encontraron coincidencias para «${q}» en ${src || "los paneles activos"}.`,
  },
};

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
  const t = T[lang] || T.en;
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [wordMatches, setWordMatches] = useState([]);
  const [selectedBookFilter, setSelectedBookFilter] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const searchInputRef = useRef(null);

  const displayTitle = book ? `${bookName(book, lang)} ${chapter}` : placeholder;
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
          label: bookName(byId[m.bookId], lang) || m.bookName,
          count: 0,
        });
      }
      map.get(m.bookId).count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [wordMatches, lang]);

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
          aria-label={t.prev}
          title={t.prev}
        >
          ‹
        </button>

        <button
          type="button"
          className="nav-step settings-trigger"
          onClick={onOpenSettings}
          aria-label={t.settings}
          title={t.settings}
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
          aria-label={t.pickerAria}
          title={t.pickerTitle}
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
            aria-label={t.searchAria}
            title={t.searchTitle}
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
            title={isOT ? t.strongsOT : t.strongsNT}
          >
            {isOT ? t.heb : (t.gr || t.gk)}
          </button>
          )}

          <button
            type="button"
            className="nav-step"
            onClick={() => onStep(1)}
            aria-label={t.next}
            title={t.next}
          >
            ›
          </button>
        </div>
      </header>

      {bookPickerOpen && (
        <BookPicker
          currentBook={book}
          lang={lang}
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
            aria-label={t.dialog}
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
                  placeholder={t.placeholder}
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
                    aria-label={t.clear}
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
                {t.cancel}
              </button>
            </form>

            <div className="search-sources-bar">
              <span className="search-sources-label">{t.in}</span>
              <span className="search-sources-names">
                {activeSourcesLabel || t.activePanes}
              </span>
              {isSearching && (
                <span className="search-spinner" aria-live="polite">
                  {t.searching}
                </span>
              )}
            </div>

            <div className="search-search-info dim">
              {t.info(maxResults.toLocaleString(lang === "es" ? "es-MX" : "en-US"))}
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
                        {t.goTo} {bookName(parsedBook, lang)} {parsedRef.chapter}
                        {parsedRef.verse ? `:${parsedRef.verse}` : ""}
                      </div>
                      <div className="dim">{t.jumpHint}</div>
                    </div>
                  </button>
                </div>
              )}

              {wordMatches.length > 0 && (
                <>
                  <div className="search-section-header">
                    <span>
                      {t.matchesFor(
                        searchedQuery,
                        displayedMatches.length,
                        selectedBookFilter ? wordMatches.length : null,
                      )}
                    </span>
                  </div>

                  <BookFilterChart
                    items={chartItems}
                    selectedKey={selectedBookFilter}
                    onSelectKey={setSelectedBookFilter}
                    totalCount={wordMatches.length}
                    lang={lang}
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
                              {bookName(byId[m.bookId], lang) || m.bookName} {m.chapter}:{m.verseRange || m.verse}
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
                            {bookName(o, lang)} {Math.min(o.chapter, o.chapters)}
                            {o.verse ? `:${o.verse}` : ""}
                          </span>
                          <span className="dim"> · {lang === "es" ? o.en : o.es}</span>
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
                    <p>{t.none(searchedQuery, activeSourcesLabel)}</p>
                  </div>
                )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
