import { useRef, useState, useCallback } from 'react';

const MIN_PCT = 15;
const MAX_PCT = 85;

/**
 * Wraps exactly two children (the two panes) with a draggable divider
 * between them. Whether dragging moves horizontally or vertically is read
 * from the container's own computed flex-direction at drag-start — the
 * existing 820px media query in app.css already decides row-vs-column, so
 * this doesn't duplicate that breakpoint in JS, it just asks the DOM which
 * way things are currently laid out.
 */
export default function SplitPanes({ children }) {
  const [first, second] = children;
  const containerRef = useRef(null);
  const orientationRef = useRef('column');
  const draggingRef = useRef(false);
  const [pct, setPct] = useState(50);

  const onPointerDown = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;
    orientationRef.current =
      getComputedStyle(container).flexDirection === 'row' ? 'row' : 'column';
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const isRow = orientationRef.current === 'row';
    const pos = isRow ? e.clientX - rect.left : e.clientY - rect.top;
    const size = isRow ? rect.width : rect.height;
    if (size <= 0) return;
    setPct(Math.min(MAX_PCT, Math.max(MIN_PCT, (pos / size) * 100)));
  }, []);

  const endDrag = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <main className="panes" ref={containerRef}>
      <div className="pane-slot" style={{ flex: `0 0 ${pct}%` }}>
        {first}
      </div>
      <div
        className="divider"
        title="Drag to resize"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <div className="pane-slot" style={{ flex: '1 1 auto' }}>
        {second}
      </div>
    </main>
  );
}
