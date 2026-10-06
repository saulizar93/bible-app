import { useState, useEffect } from "react";
import { BOOKS, bookName, bookAbbr } from "../../books.js";
import { loadBook, strongsSourceCode } from "../../data.js";
import "./BookPicker.css";

const T = {
  en: { goToBook: "Go to book", dialog: "Go to a Bible reference", back: "Back", close: "Close",
        ot: "Old Testament", nt: "New Testament", loading: "Loading…", whole: "Whole chapter" },
  es: { goToBook: "Ir al libro", dialog: "Ir a una referencia bíblica", back: "Atrás", close: "Cerrar",
        ot: "Antiguo Testamento", nt: "Nuevo Testamento", loading: "Cargando…", whole: "Capítulo completo" },
};

/**
 * Book -> chapter -> verse grid picker. An alternative to typing a
 * reference: tap a book abbreviation, then a chapter number, then a verse
 * number, and it jumps exactly the way typing "mt 5:3" + Enter would.
 *
 * Verse counts aren't stored anywhere as static data — rather than keep a
 * second source of truth for how many verses each of the 1,189 chapters in
 * the Bible has, this just asks the already-built KJV data (which is the
 * one guaranteed to be complete across all 66 books) once a chapter is
 * picked, and reads the verse count off the array length that's already
 * there for free.
 */
export default function BookPicker({ onSelect, onClose, currentBook, lang = "en" }) {
  const t = T[lang] || T.en;
  const [step, setStep] = useState("book"); // 'book' | 'chapter' | 'verse'
  const [book, setBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [verseCount, setVerseCount] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (step !== "verse" || !book || !chapter) return;
    let alive = true;
    setVerseCount(null);
    loadBook(strongsSourceCode(), book.n)
      .then((data) => {
        if (alive) setVerseCount(data?.v?.[chapter]?.length || 0);
      })
      .catch(() => {
        if (alive) setVerseCount(0);
      });
    return () => {
      alive = false;
    };
  }, [step, book, chapter]);

  const pickBook = (b) => {
    setBook(b);
    setStep("chapter");
  };
  const pickChapter = (c) => {
    setChapter(c);
    setStep("verse");
  };
  const pickVerse = (v) =>
    onSelect({
      ...book,
      chapter,
      verse: v,
    });
  const wholeChapter = () =>
    onSelect({
      ...book,
      chapter,
      verse: null,
    });
  const back = () => {
    if (step === "verse") setStep("chapter");
    else if (step === "chapter") setStep("book");
  };

  const title =
    step === "book"
      ? t.goToBook
      : step === "chapter"
        ? bookName(book, lang)
        : `${bookName(book, lang)} ${chapter}`;

  return (
    <>
      <div className="picker-backdrop" onClick={onClose} />
      <div
        className="book-picker"
        role="dialog"
        aria-label={t.dialog}
      >
        <header className="picker-head">
          {step !== "book" && (
            <button
              type="button"
              className="picker-back"
              onClick={back}
              aria-label={t.back}
            >
              ‹
            </button>
          )}
          <span className="picker-title">{title}</span>
          <button
            type="button"
            className="picker-close"
            onClick={onClose}
            aria-label={t.close}
          >
            ×
          </button>
        </header>

        {step === "book" && (
          <div className="picker-body">
            <p className="picker-section-label">{t.ot}</p>
            <div className="picker-grid">
              {BOOKS.filter((b) => b.n <= 39).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={
                    currentBook?.id === b.id
                      ? "picker-cell current"
                      : "picker-cell"
                  }
                  onClick={() => pickBook(b)}
                  title={bookName(b, lang)}
                >
                  {bookAbbr(b, lang)}
                </button>
              ))}
            </div>
            <p className="picker-section-label">{t.nt}</p>
            <div className="picker-grid">
              {BOOKS.filter((b) => b.n >= 40).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={
                    currentBook?.id === b.id
                      ? "picker-cell current"
                      : "picker-cell"
                  }
                  onClick={() => pickBook(b)}
                  title={bookName(b, lang)}
                >
                  {bookAbbr(b, lang)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "chapter" && (
          <div className="picker-body">
            <div className="picker-grid">
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    className="picker-cell"
                    onClick={() => pickChapter(c)}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {step === "verse" && (
          <div className="picker-body">
            {verseCount === null ? (
              <p className="dim">{t.loading}</p>
            ) : (
              <>
                <button
                  type="button"
                  className="picker-whole-chapter"
                  onClick={wholeChapter}
                >
                  {t.whole}
                </button>
                <div className="picker-grid">
                  {Array.from({ length: verseCount }, (_, i) => i + 1).map(
                    (v) => (
                      <button
                        key={v}
                        type="button"
                        className="picker-cell"
                        onClick={() => pickVerse(v)}
                      >
                        {v}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
