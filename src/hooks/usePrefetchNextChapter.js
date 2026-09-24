import { useEffect } from "react";
import { optionFor, loadBook, loadNotes } from "../data.js";

/** While the user reads, quietly warm the cache for the next chapter
 *  in whatever each pane currently shows (translation or notes). */
// export function usePrefetchNextChapter(refPos, book, top, bottom) {
//   useEffect(() => {
//     const id = requestIdleCallback?.(() => {
//       const next = refPos.chapter < book.chapters
//         ? { n: book.n, c: refPos.chapter + 1 }
//         : { n: Math.min(book.n + 1, 66), c: 1 };
//       for (const code of [top, bottom]) {
//         const opt = optionFor(code);
//         if (opt.kind === 'bible') loadBook(opt.code, next.n).catch(() => {});
//         else loadNotes(opt.lang, next.n, next.c).catch(() => {});
//       }
//     });
//     return () => id && cancelIdleCallback?.(id);
//   }, [refPos, top, bottom, book]);
// }
export function usePrefetchNextChapter(refPos, book, top, bottom) {
  useEffect(() => {
    const run = () => {
      const next =
        refPos.chapter < book.chapters
          ? { n: book.n, c: refPos.chapter + 1 }
          : { n: Math.min(book.n + 1, 66), c: 1 };

      for (const code of [top, bottom]) {
        const opt = optionFor(code);

        if (!opt) continue;

        if (opt.kind === "bible") {
          loadBook(opt.code, next.n).catch(() => {});
        } else {
          loadNotes(opt.lang, next.n, next.c).catch(() => {});
        }
      }
    };

    // requestIdleCallback is not available in every browser,
    // especially Safari/iOS. Use it when available, otherwise
    // fall back to a short timeout.
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run);

      return () => {
        window.cancelIdleCallback?.(id);
      };
    }

    const id = window.setTimeout(run, 100);

    return () => {
      window.clearTimeout(id);
    };
  }, [refPos, top, bottom, book]);
}
