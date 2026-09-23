import { useState, useCallback } from "react";
import { BOOKS, byId, parseRef, suggest } from "./books.js";
import { usePrefetchNextChapter } from "./hooks/usePrefetchNextChapter.js";
import { loadBook, PANE_OPTIONS } from "./data.js";
import JumpBar from "./components/JumpBar.jsx";
import PaneSlot from "./components/PaneSlot.jsx";
import StrongsPanel from "./components/StrongsPanel.jsx";
import SelectionBar from "./components/SelectionBar.jsx";
import "./app.css";

export default function App() {
  const [refPos, setRefPos] = useState({
    book: "MAT",
    chapter: 1,
    verse: null,
  });
  const [verseSelection, setVerseSelection] = useState({
    source: null,
    verses: new Set(),
  });
  const [top, setTop] = useState("kjv-strong");
  const [bottom, setBottom] = useState("notes:en"); // your Matthew commentary, by default
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [strongsOn, setStrongsOn] = useState(false);
  const [selection, setSelection] = useState(null); // { code: "G26", word: "love" } | null

  const book = byId[refPos.book];
  const options = open ? suggest(query) : [];

  usePrefetchNextChapter(refPos, book, top, bottom);

  const go = useCallback((next) => {
    setRefPos(next);
    setQuery("");
    setOpen(false);
  }, []);

  const selectVerse = useCallback((verse) => {
    setRefPos((prev) => ({
      ...prev,
      verse: prev.verse === verse ? null : verse,
    }));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const parsed = parseRef(query);
    if (parsed) go(parsed);
  };

  const step = (delta) => {
    let { n } = book,
      c = refPos.chapter + delta;
    if (c < 1) {
      n = Math.max(n - 1, 1);
      c = BOOKS[n - 1].chapters;
    } else if (c > book.chapters) {
      n = Math.min(n + 1, 66);
      c = 1;
    }
    go({ book: BOOKS[n - 1].id, chapter: c, verse: null });
  };

  const pick = (o) => {
    go({
      book: o.book,
      chapter: o.chapter,
      verse: o.verse,
    });
  };

  const jumpFromConcordance = (ref) => {
    go(ref);
    setSelection(null);
  };

  const toggleVerse = useCallback((code, verse) => {
    setVerseSelection((prev) => {
      // Clicking a different Bible starts a new selection.
      if (prev.source !== code) {
        return {
          source: code,
          verses: new Set([verse]),
        };
      }

      const verses = new Set(prev.verses);

      if (verses.has(verse)) {
        verses.delete(verse);
      } else {
        verses.add(verse);
      }

      return {
        source: verses.size ? code : null,
        verses,
      };
    });
  }, []);

  const copySelectedVerses = useCallback(async () => {
    const { source, verses } = verseSelection;

    if (!source || verses.size === 0) return;

    const opt = byId[refPos.book];
    const paneOption = PANE_OPTIONS.find((o) => o.code === source);

    if (!paneOption || paneOption.kind !== "bible") return;

    try {
      const bookData = await loadBook(source, opt.n);

      const chapterVerses = bookData?.v?.[refPos.chapter];

      if (!chapterVerses) return;

      const sortedVerses = [...verses].sort((a, b) => a - b);

      /*
       * Group consecutive verses together.
       *
       * Example:
       * 3, 4, 5, 8, 10, 11
       *
       * becomes:
       * [3, 4, 5]
       * [8]
       * [10, 11]
       */
      const groups = [];
      let current = [];

      for (const verse of sortedVerses) {
        if (current.length === 0 || verse === current[current.length - 1] + 1) {
          current.push(verse);
        } else {
          groups.push(current);
          current = [verse];
        }
      }

      if (current.length) {
        groups.push(current);
      }

      // Text only — no verse numbers.
      const paragraphs = groups.map((group) =>
        group
          .map((verse) => chapterVerses[verse - 1])
          .filter(Boolean)
          .join(" "),
      );

      // Build the citation.
      const citation = buildCitation(
        byId[refPos.book].en,
        refPos.chapter,
        sortedVerses,
        paneOption.citation,
      );

      const text = `${paragraphs.join("\n\n")}\n\n${citation}`;

      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error("Could not copy verses:", error);
      return false;
    }
  }, [verseSelection, refPos.book, refPos.chapter]);

  return (
    <div className={strongsOn ? "app strongs-on" : "app"}>
      <JumpBar
        query={query}
        onQueryChange={setQuery}
        open={open}
        onOpenChange={setOpen}
        options={options}
        placeholder={`${book.en} ${refPos.chapter}`}
        onSubmit={submit}
        onPick={pick}
        onStep={step}
        strongsOn={strongsOn}
        onToggleStrongs={() => setStrongsOn((v) => !v)}
      />

      <div className="content-row">
        <main className="panes">
          <PaneSlot
            code={top}
            refPos={refPos}
            highlight={refPos.verse}
            selectedVerses={
              verseSelection.source === top ? verseSelection.verses : new Set()
            }
            onSelect={setTop}
            strongsOn={strongsOn}
            onWordClick={(code, word) => setSelection({ code, word })}
            onVerseClick={selectVerse}
            onVerseToggle={(verse) => toggleVerse(top, verse)}
            onClearHighlight={() =>
              setRefPos((prev) => ({ ...prev, verse: null }))
            }
          />
          <div className="divider" />
          <PaneSlot
            code={bottom}
            refPos={refPos}
            highlight={refPos.verse}
            selectedVerses={
              verseSelection.source === bottom
                ? verseSelection.verses
                : new Set()
            }
            onSelect={setBottom}
            strongsOn={strongsOn}
            onWordClick={(code, word) => setSelection({ code, word })}
            onVerseClick={selectVerse}
            onVerseToggle={(verse) => toggleVerse(bottom, verse)}
            onClearHighlight={() =>
              setRefPos((prev) => ({ ...prev, verse: null }))
            }
          />
        </main>

        {selection && (
          <>
            <div
              className="strongs-backdrop"
              onClick={() => setSelection(null)}
            />
            <StrongsPanel
              code={selection.code}
              word={selection.word}
              onClose={() => setSelection(null)}
              onJump={jumpFromConcordance}
            />
          </>
        )}
      </div>

      {verseSelection.verses.size > 0 && (
        <SelectionBar
          count={verseSelection.verses.size}
          selectionKey={verseSelection.verses}
          onCopy={copySelectedVerses}
          onClear={() => setVerseSelection({ source: null, verses: new Set() })}
        />
      )}
    </div>
  );
}

function buildCitation(bookName, chapter, verses, version) {
  const ranges = [];

  let start = verses[0];
  let end = verses[0];

  for (let i = 1; i < verses.length; i++) {
    const verse = verses[i];

    if (verse === end + 1) {
      end = verse;
    } else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`);

      start = verse;
      end = verse;
    }
  }

  ranges.push(start === end ? `${start}` : `${start}–${end}`);

  return `${bookName} ${chapter}:${ranges.join(", ")} (${version})`;
}
