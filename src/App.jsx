import { useState, useCallback } from 'react';
import { BOOKS, byId, parseRef, suggest } from './books.js';
import { usePrefetchNextChapter } from './hooks/usePrefetchNextChapter.js';
import JumpBar from './components/JumpBar.jsx';
import PaneSlot from './components/PaneSlot.jsx';
import './app.css';

export default function App() {
  const [refPos, setRefPos] = useState({ book: 'MAT', chapter: 1, verse: null });
  const [top, setTop] = useState('kjv');
  const [bottom, setBottom] = useState('notes:en'); // your Matthew commentary, by default
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const book = byId[refPos.book];
  const options = open ? suggest(query) : [];

  usePrefetchNextChapter(refPos, book, top, bottom);

  const go = useCallback(next => {
    setRefPos(next);
    setQuery('');
    setOpen(false);
  }, []);

  const submit = e => {
    e.preventDefault();
    const parsed = parseRef(query);
    if (parsed) go(parsed);
  };

  const step = delta => {
    let { n } = book, c = refPos.chapter + delta;
    if (c < 1) { n = Math.max(n - 1, 1); c = BOOKS[n - 1].chapters; }
    else if (c > book.chapters) { n = Math.min(n + 1, 66); c = 1; }
    go({ book: BOOKS[n - 1].id, chapter: c, verse: null });
  };

  const pick = o => go({ book: o.id, chapter: Math.min(o.chapter, o.chapters), verse: o.verse });

  return (
    <div className="app">
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
      />

      <main className="panes">
        <PaneSlot code={top} refPos={refPos} highlight={refPos.verse} onSelect={setTop} />
        <div className="divider" />
        <PaneSlot code={bottom} refPos={refPos} highlight={refPos.verse} onSelect={setBottom} />
      </main>
    </div>
  );
}
