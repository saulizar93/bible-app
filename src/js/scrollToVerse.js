/**
 * Scroll a pane so `el` (a verse or note) sits at its top, and make sure it
 * stays there.
 *
 * Why not just el.scrollIntoView({ behavior: "smooth" })? Off-screen verses use
 * `content-visibility: auto` (BiblePane.css), so until they are drawn the browser
 * only guesses their height (60px). A smooth scroll aims at a spot computed from
 * those guesses; as the verses it passes get drawn at their real height the
 * target moves, and the scroll stops above or below the verse. Late-loading
 * fonts shift it the same way. scrollIntoView also scrolls the whole page on
 * iPhones, not just the pane.
 *
 * So: scroll only the pane, then keep checking where the verse really is and
 * correct the position (instantly) until it stays put. Stops early if the user
 * touches, wheels or presses a key, so it never fights them.
 */
const GAP = 8; // px left above the verse

export function scrollToVerse(container, el, { smooth = true } = {}) {
  if (!container || !el) return () => {};
  const offset = () => el.getBoundingClientRect().top - container.getBoundingClientRect().top - GAP;
  const target = () =>
    Math.max(0, Math.min(container.scrollTop + offset(), container.scrollHeight - container.clientHeight));

  let stopped = false;
  const stop = () => {
    stopped = true;
    for (const ev of ["wheel", "touchstart", "pointerdown", "keydown"]) container.removeEventListener(ev, stop);
    clearTimeout(timer);
  };
  for (const ev of ["wheel", "touchstart", "pointerdown", "keydown"])
    container.addEventListener(ev, stop, { passive: true, once: true });

  container.scrollTo({ top: target(), behavior: smooth ? "smooth" : "auto" });

  // Every 120ms for up to ~2s: once the scrolling has stopped, if the verse is not
  // at the top (the layout changed under us), jump the rest of the way.
  let last = -1;
  let tries = 0;
  let settled = 0;
  let timer;
  const check = () => {
    if (stopped) return;
    tries++;
    const now = container.scrollTop;
    const moving = Math.abs(now - last) > 1;
    last = now;
    if (!moving) {
      const t = target();
      if (Math.abs(now - t) > 2) {
        container.scrollTo({ top: t, behavior: "auto" });
        settled = 0;
      } else if (++settled >= 3) return stop(); // in place three checks running
    }
    if (tries < 17) timer = setTimeout(check, 120);
    else stop();
  };
  timer = setTimeout(check, 120);
  return stop;
}
