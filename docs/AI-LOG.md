# AI Decision & Architecture Log

## 2026-10-03: Header Navigation & Search Popup Refactor

### User Request

- Set `BookPicker` as the primary verse navigation control, centered in the top bar and labeled with the current book and chapter.
- Replace permanent jump bar input with a search icon that opens a search popup dialog for quick verse jumping.

### Decisions & Changes

1. **Top Navigation Bar (`JumpBar.jsx`, `JumpBar.css`)**:
   - Reorganized header layout to: `‹` (previous chapter) | `[ Book Chapter ▾ ]` (centered BookPicker button) | `[ 🔍 ]` `[ Gk ]` `[ › ]` (actions group).
   - Replaced the full-width input field with a search trigger button (`🔍`).
   - Removed the redundant emoji button (`📖`) since the center button now opens `BookPicker`.
2. **Search Popup Modal (`JumpBar.jsx`, `JumpBar.css`)**:
   - Modal dialog with semi-transparent backdrop, auto-focused search input, clear button (`×`), cancel button, and suggestion list dropdown.
   - Closed via Cancel button, backdrop click, Escape key, or when a reference is selected/submitted.
3. **BookPicker Enhancements (`BookPicker.jsx`, `BookPicker.css`)**:
   - Accepts `currentBook` to highlight the currently active book in the grid with `.picker-cell.current`.
   - Added Escape key listener to close modal.
4. **App Wiring (`App.jsx`)**:
   - Passed `book` and `chapter` to `JumpBar`.
   - Updated `submit` handler to return a boolean indicating whether a reference was successfully parsed.

## 2026-10-03: Active Panes Word & Verse Search

### User Request

- Search for words or verses across the available panes (their respective Bible translations or notes) for the entire Bible (all 66 books).
- Show results in a list with contextual text snippets and the searched word bolded.

### Decisions & Architecture

1. **Search Engine (`src/search.js`)**:
   - Implemented `searchAvailablePanes` to query only the translations and notes active in the current panes (`top` and `bottom`).
   - Prioritizes the currently active book first so results appear instantly (<20ms), streaming the remaining 65 books asynchronously.
   - Built accent-insensitive matching (e.g., `jesus` matches `Jesús`) and case-insensitive matching.
   - Extracts contextual snippets (`createSnippet`) clipped around the target word, snapping to word boundaries.
   - Pure JS `splitSnippet` tokenizes matching phrases so UI can highlight them without `dangerouslySetInnerHTML`.
2. **Search Dialog UI (`JumpBar.jsx`, `JumpBar.css`)**:
   - Shows active sources header indicator: `In: [Source 1] & [Source 2]`.
   - If a verse reference is detected (e.g. `Jn 3:16`), renders a dedicated Quick Jump card at top.
   - Displays match items with reference, source badge (`bible` vs `notes`), and snippet with bold highlights (`.search-highlight`).
   - Clicking a match navigates to the passage, highlights the verse in both panes, and closes the modal.
   - Fully accessible with keyboard navigation, cancellation via `AbortController`, and `Escape` support.
