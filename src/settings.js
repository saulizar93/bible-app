/** Reading settings (text size + font) for the Bible and notes panes.
 *  Saved in localStorage; applied as CSS variables on .app (see App.jsx,
 *  PaneSlot.css). */

export const FONT_SCALES = [50, 75, 100, 125, 150, 175, 200]; // percent of the default 17px

export const FONTS = [
  { id: "default", label: { en: "Default (Charter)", es: "Predeterminada (Charter)" },
    stack: 'Charter, Georgia, "Times New Roman", serif' },
  { id: "georgia", label: { en: "Georgia", es: "Georgia" }, stack: 'Georgia, "Times New Roman", serif' },
  { id: "times", label: { en: "Times New Roman", es: "Times New Roman" }, stack: '"Times New Roman", Times, serif' },
  { id: "arial", label: { en: "Arial", es: "Arial" }, stack: "Arial, Helvetica, sans-serif" },
  { id: "verdana", label: { en: "Verdana", es: "Verdana" }, stack: "Verdana, Geneva, sans-serif" },
  { id: "helvetica", label: { en: "Helvetica", es: "Helvetica" }, stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
];

export const SETTINGS_KEYS = { SCALE: "app_font_scale", FONT: "app_font_family", NUM_SCALE: "app_verse_num_scale" };
// numScale = verse-number size, percent of the default 12px (independent of text size)
export const DEFAULT_SETTINGS = { scale: 100, font: "default", numScale: 100 };

export function loadSettings() {
  try {
    const scale = Number(localStorage.getItem(SETTINGS_KEYS.SCALE));
    const font = localStorage.getItem(SETTINGS_KEYS.FONT);
    const numScale = Number(localStorage.getItem(SETTINGS_KEYS.NUM_SCALE));
    return {
      scale: FONT_SCALES.includes(scale) ? scale : DEFAULT_SETTINGS.scale,
      font: FONTS.some((f) => f.id === font) ? font : DEFAULT_SETTINGS.font,
      numScale: FONT_SCALES.includes(numScale) ? numScale : DEFAULT_SETTINGS.numScale,
    };
  } catch {
    return { ...DEFAULT_SETTINGS }; // storage blocked
  }
}

export function saveSettings({ scale, font, numScale }) {
  try {
    localStorage.setItem(SETTINGS_KEYS.SCALE, String(scale));
    localStorage.setItem(SETTINGS_KEYS.FONT, font);
    localStorage.setItem(SETTINGS_KEYS.NUM_SCALE, String(numScale));
  } catch {
    /* storage blocked — settings still apply for this visit */
  }
}

export const fontStack = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).stack;
