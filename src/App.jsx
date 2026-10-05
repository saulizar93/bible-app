import { useState, useCallback, useEffect, startTransition } from "react";
import { BOOKS, byId, parseRef, suggest } from "./books.js";
import { usePrefetchNextChapter } from "./hooks/usePrefetchNextChapter.js";
import { loadBook, PANE_OPTIONS, optionFor } from "./data.js";
import JumpBar from "./components/JumpBar/JumpBar.jsx";
import PaneSlot from "./components/PaneSlot/PaneSlot.jsx";
import StrongsPanel from "./components/StrongsPanel/StrongsPanel.jsx";
import SelectionBar from "./components/SelectionBar/SelectionBar.jsx";
import SplitPanes from "./components/SplitPanes/SplitPanes.jsx";
import LanguageSelectionModal from "./components/Modals/LanguageSelectionModal.jsx";
import SettingsModal from "./components/SettingsModal/SettingsModal.jsx";
import InfoPanel from "./components/InfoPanel/InfoPanel.jsx";
import { loadSettings, saveSettings, fontStack } from "./settings.js";
import "./app.css";

const STORAGE_KEYS = {
  LANG: "app_lang",
  REF_POS: "app_ref_pos",
  TOP_PANE: "app_top_pane",
  BOTTOM_PANE: "app_bottom_pane",
  // Optional per-pane defaults chosen in Settings: when set, the app always
  // opens with them (instead of the last-used pane). Empty = remember last used.
  DEFAULT_TOP: "app_default_top",
  DEFAULT_BOTTOM: "app_default_bottom",
};

/** A saved default pane code, if it still exists in PANE_OPTIONS. */
function savedDefault(key) {
  try {
    const code = localStorage.getItem(key);
    return code && optionFor(code) ? code : "";
  } catch {
    return "";
  }
}

export default function App() {
  // 1. Language State
  const [lang, setLang] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.LANG),
  );
  const [showLangModal, setShowLangModal] = useState(
    () => !localStorage.getItem(STORAGE_KEYS.LANG),
  );

  // 2. Position State (Persisted)
  const [refPos, setRefPos] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REF_POS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved refPos", e);
      }
    }
    return { book: "MAT", chapter: 1, verse: null };
  });

  // Top Pane State Initializer
  const [top, setTop] = useState(() => {
    const def = savedDefault(STORAGE_KEYS.DEFAULT_TOP);
    if (def) return def;
    const saved = localStorage.getItem(STORAGE_KEYS.TOP_PANE);
    if (saved) return saved;
    const currentLang = localStorage.getItem(STORAGE_KEYS.LANG);
    return currentLang === "es" ? "rvg" : "kjv-strong";
  });

  // Bottom Pane State Initializer
  const [bottom, setBottom] = useState(() => {
    const def = savedDefault(STORAGE_KEYS.DEFAULT_BOTTOM);
    if (def) return def;
    const saved = localStorage.getItem(STORAGE_KEYS.BOTTOM_PANE);
    if (saved) return saved;
    const currentLang = localStorage.getItem(STORAGE_KEYS.LANG);
    return currentLang === "es" ? "notes:es" : "notes:en";
  });

  const [verseSelection, setVerseSelection] = useState({
    source: null,
    verses: new Set(),
  });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [strongsOn, setStrongsOn] = useState(false);
  const [selection, setSelection] = useState(null);
  const [settings, setSettings] = useState(loadSettings); // reading text size + font
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoPage, setInfoPage] = useState(null); // id from pages.js, or null
  const [defaultPanes, setDefaultPanes] = useState(() => ({
    top: savedDefault(STORAGE_KEYS.DEFAULT_TOP),
    bottom: savedDefault(STORAGE_KEYS.DEFAULT_BOTTOM),
  }));

  // Settings: switch the interface language (app_lang). Panes are left as they are.
  const changeLanguage = (next) => {
    localStorage.setItem(STORAGE_KEYS.LANG, next);
    setLang(next);
  };

  // Settings: set (or clear, with "") a pane's default. A chosen default is
  // also shown right away.
  const changeDefaultPane = (which, code) => {
    const key = which === "top" ? STORAGE_KEYS.DEFAULT_TOP : STORAGE_KEYS.DEFAULT_BOTTOM;
    if (code) localStorage.setItem(key, code);
    else localStorage.removeItem(key);
    setDefaultPanes((prev) => ({ ...prev, [which]: code }));
    if (code) (which === "top" ? setTop : setBottom)(code);
  };

  const book = byId[refPos.book] || byId["MAT"];
  const options = open ? suggest(query) : [];

  usePrefetchNextChapter(refPos, book, top, bottom);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REF_POS, JSON.stringify(refPos));
  }, [refPos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOP_PANE, top);
  }, [top]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BOTTOM_PANE, bottom);
  }, [bottom]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Language Selection Handler
  const handleSelectLanguage = (selectedLang) => {
    // 1. Persist the language choice
    localStorage.setItem(STORAGE_KEYS.LANG, selectedLang);
    setLang(selectedLang);
    setShowLangModal(false);

    // 2. Explicitly set top and bottom defaults based on selected language
    const defaultTop = selectedLang === "es" ? "rvg" : "kjv-strong";
    const defaultBottom = selectedLang === "es" ? "notes:es" : "notes:en";

    setTop(defaultTop);
    setBottom(defaultBottom);

    localStorage.setItem(STORAGE_KEYS.TOP_PANE, defaultTop);
    localStorage.setItem(STORAGE_KEYS.BOTTOM_PANE, defaultBottom);
  };

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
    if (parsed) {
      go(parsed);
      return true;
    }
    return false;
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
    go({ book: BOOKS[n - 1].id, chapter: c, verse: 1 });
  };

  const pick = (o) => {
    go({
      book: o.id,
      chapter: Math.min(o.chapter, o.chapters),
      verse: o.verse,
    });
  };

  const jumpFromConcordance = (ref) => {
    go(ref);
    setSelection(null);
  };

  const toggleVerse = useCallback((code, verse) => {
    setVerseSelection((prev) => {
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

  const handleCloseStrongs = useCallback(() => {
    startTransition(() => {
      setSelection(null);
    });
  }, []);

  return (
    <div
      className={strongsOn ? "app strongs-on" : "app"}
      style={{
        // read by .pane-body (PaneSlot.css) and .vnum (BiblePane.css)
        "--reading-scale": settings.scale / 100,
        "--reading-font": fontStack(settings.font),
        "--verse-num-scale": settings.numScale / 100,
      }}
    >
      {/* First-time Language Selection Modal */}
      {showLangModal && (
        <LanguageSelectionModal
          lang="en"
          onSelectLanguage={handleSelectLanguage}
        />
      )}

      <JumpBar
        query={query}
        onQueryChange={setQuery}
        open={open}
        onOpenChange={setOpen}
        options={options}
        book={book}
        chapter={refPos.chapter}
        panes={[top, bottom]}
        placeholder={`${book.en} ${refPos.chapter}`}
        onSubmit={submit}
        onPick={pick}
        onStep={step}
        strongsOn={strongsOn}
        onToggleStrongs={() => setStrongsOn((v) => !v)}
        lang={lang || "en"}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPage={(id) => {
          setSelection(null); // one side panel at a time
          setInfoPage(id);
        }}
      />

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          lang={lang || "en"}
          onLangChange={changeLanguage}
          defaultPanes={defaultPanes}
          onDefaultPaneChange={changeDefaultPane}
        />
      )}



      <div className="content-row">
        <SplitPanes>
          <PaneSlot
            code={top}
            refPos={refPos}
            highlight={refPos.verse}
            selectedVerses={
              verseSelection.source === top ? verseSelection.verses : new Set()
            }
            onSelect={setTop}
            strongsOn={strongsOn}
            onWordClick={(code, word, tok) => {
              setInfoPage(null); // one side panel at a time
              setSelection({ code, word, morph: tok?.m, form: tok?.g, source: top });
            }}
            onVerseClick={selectVerse}
            onVerseToggle={(verse) => toggleVerse(top, verse)}
            onClearHighlight={() =>
              setRefPos((prev) => ({ ...prev, verse: null }))
            }
          />
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
            onWordClick={(code, word, tok) => {
              setInfoPage(null); // one side panel at a time
              setSelection({ code, word, morph: tok?.m, form: tok?.g, source: bottom });
            }}
            onVerseClick={selectVerse}
            onVerseToggle={(verse) => toggleVerse(bottom, verse)}
            onClearHighlight={() =>
              setRefPos((prev) => ({ ...prev, verse: null }))
            }
          />
        </SplitPanes>

        {/* Info pages (hamburger menu) dock exactly like the Strong's panel:
            a sidebar inside .content-row on wide screens, a modal over the
            panes on phones (StrongsPanel.css @media 900px). */}
        {infoPage && (
          <InfoPanel
            pageId={infoPage}
            lang={lang || "en"}
            onClose={() => setInfoPage(null)}
          />
        )}

        {selection && (
          <>
            <div className="strongs-backdrop" onClick={handleCloseStrongs} />
            <StrongsPanel
              code={selection.code}
              word={selection.word}
              morph={selection.morph}
              form={selection.form}
              source={selection.source}
              lang={lang || "en"}
              currentBookId={refPos.book}
              onClose={handleCloseStrongs}
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
