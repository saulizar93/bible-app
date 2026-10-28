/** Reading settings (text size + font) for the Bible and notes panes.
 *  Saved in localStorage; applied as CSS variables on .app (see App.jsx,
 *  PaneSlot.css). */

export const FONT_SCALES = [75, 100, 125, 150, 175, 200]; // percent of the default 17px (verse numbers scale with it)

export const FONTS = [
  { id: "default", label: { en: "Default (Charter)", es: "Predeterminada (Charter)" },
    stack: 'Charter, Georgia, "Times New Roman", serif' },
  // Oswald and Comic Relief are stored in the app (src/assets/fonts, @font-face in
  // src/fonts.css), so they work offline; a file loads only when its font is used.
  { id: "oswald", label: { en: "Oswald", es: "Oswald" }, stack: 'Oswald, "Arial Narrow", sans-serif' },
  { id: "times", label: { en: "Times New Roman", es: "Times New Roman" }, stack: '"Times New Roman", Times, serif' },
  { id: "arial", label: { en: "Arial", es: "Arial" }, stack: "Arial, Helvetica, sans-serif" },
  { id: "verdana", label: { en: "Verdana", es: "Verdana" }, stack: "Verdana, Geneva, sans-serif" },
  { id: "comic", label: { en: "Comic Relief", es: "Comic Relief" }, stack: '"Comic Relief", "Comic Sans MS", cursive' },
];

export const SETTINGS_KEYS = { SCALE: "app_font_scale", FONT: "app_font_family" };
// One size for the text and its verse numbers (the separate verse-number size was removed 2026-10-28;
// the old "app_verse_num_scale" key is simply ignored).
export const DEFAULT_SETTINGS = { scale: 100, font: "default" };

export function loadSettings() {
  try {
    const scale = Number(localStorage.getItem(SETTINGS_KEYS.SCALE));
    const font = localStorage.getItem(SETTINGS_KEYS.FONT);
    return {
      scale: FONT_SCALES.includes(scale) ? scale : DEFAULT_SETTINGS.scale,
      font: FONTS.some((f) => f.id === font) ? font : DEFAULT_SETTINGS.font,
    };
  } catch {
    return { ...DEFAULT_SETTINGS }; // storage blocked
  }
}

export function saveSettings({ scale, font }) {
  try {
    localStorage.setItem(SETTINGS_KEYS.SCALE, String(scale));
    localStorage.setItem(SETTINGS_KEYS.FONT, font);
  } catch {
    /* storage blocked — settings still apply for this visit */
  }
}

export const fontStack = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).stack;

/* Color theme: "dark" (default on every device) or "light", chosen in Settings.
 * Applied as data-theme on <html>; CSS dark rules use :root[data-theme="dark"].
 * index.html applies the saved value before the app loads (no flash). */
export const THEME_KEY = "app_theme";
const THEME_BAR = { dark: "#14130f", light: "#fbfaf7" }; // browser/status bar color

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_BAR[theme]);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage blocked — theme still applies for this visit */
  }
}
