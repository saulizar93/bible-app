import { useEffect, useState } from "react";
import {
  FONT_SCALES,
  FONTS,
  DEFAULT_SETTINGS,
  fontStack,
} from "../../js/settings.js";
// eslint-disable-next-line no-unused-vars -- PANE_OPTIONS is used by the commented-out "Default panes" section
import { PANE_OPTIONS, clearAllAppData } from "../../js/data.js";
import "./SettingsModal.css";

const T = {
  en: {
    language: "Language",
    darkMode: "Dark mode",
    panes: "Default panes",
    hideSecond: "Hide 2nd pane",
    hideSecondHint:
      "Turn on to read with one pane. Tap the + button at the bottom right of the screen to bring the 2nd pane back.",
    topPane: "Top pane",
    bottomPane: "Bottom pane",
    remember: "Remember last used",
    panesHint:
      "The app opens with these every time. Choose “Remember last used” to reopen whatever you had open.",
    groupEn: "English",
    groupEs: "Español",
    groupNotes: "Study notes",
    title: "Reading settings",
    size: "Text size",
    font: "Font",
    sample: "In the beginning God created the heaven and the earth.",
    reset: "Reset",
    done: "Done",
    storage: "Saved data",
    clearData: "Clear saved data",
    clearConfirm: "Yes, clear and reload",
    cancel: "Cancel",
    clearing: "Clearing…",
    clearHint:
      "Deletes the Bibles, notes and lexicon saved on this device, plus all your settings, then reloads so the app downloads only the latest versions. Use this whenever you notice the Data, Notes, or Lexicon versions change so you don't store old data.",
    clearWarn:
      "This also resets your language, text size, font, default panes and last-read position. Continue?",
    download: "Download App",
    downloadHint:
      "Install the app on this device and choose which Bibles and notes to keep for reading without an internet connection.",
  },
  es: {
    language: "Idioma",
    darkMode: "Modo oscuro",
    panes: "Paneles predeterminados",
    hideSecond: "Ocultar el 2.º panel",
    hideSecondHint:
      "Actívelo para leer con un solo panel. Toque el botón + en la esquina inferior derecha de la pantalla para volver a mostrar el 2.º panel.",
    topPane: "Panel superior",
    bottomPane: "Panel inferior",
    remember: "Recordar el último usado",
    panesHint:
      "La aplicación abrirá siempre con estos. Elija «Recordar el último usado» para volver a abrir lo que tenía abierto.",
    groupEn: "English",
    groupEs: "Español",
    groupNotes: "Notas de estudio",
    title: "Ajustes de lectura",
    size: "Tamaño del texto",
    font: "Tipo de letra",
    sample: "En el principio creó Dios los cielos y la tierra.",
    reset: "Restablecer",
    done: "Listo",
    storage: "Datos guardados",
    clearData: "Borrar datos guardados",
    clearConfirm: "Sí, borrar y recargar",
    cancel: "Cancelar",
    clearing: "Borrando…",
    clearHint:
      "Elimina las Biblias, notas y léxico guardados en este dispositivo, junto con todos sus ajustes, y recarga para que la aplicación descargue solo las versiones más recientes. Usa esto cuando notes que la version de Datos, Notas, o Léxico cambió para no almacenar datos antiguos.",
    clearWarn:
      "Esto también restablece su idioma, tamaño del texto, tipo de letra, paneles predeterminados y la última posición de lectura. ¿Continuar?",
    download: "Descargar la aplicación",
    downloadHint:
      "Instale la aplicación en este dispositivo y elija qué Biblias y notas guardar para leer sin conexión a internet.",
  },
};

/** Text size (percent) + font for the Bible and notes panes. Changes apply
 *  immediately (App saves them), so "Done" just closes. */
export default function SettingsModal({
  settings,
  onChange,
  onClose,
  lang = "en",
  onLangChange,
  theme = "dark",
  onThemeChange,
  // eslint-disable-next-line no-unused-vars -- used by the commented-out "Default panes" section
  defaultPanes = { top: "", bottom: "" },
  // eslint-disable-next-line no-unused-vars
  onDefaultPaneChange,
  bottomHidden = false,
  onBottomHiddenChange,
  onOpenDownload,
}) {
  const t = T[lang] || T.en;
  const [clearStep, setClearStep] = useState("idle"); // idle | confirm | busy

  const clearData = async () => {
    setClearStep("busy");
    await clearAllAppData();
    window.location.reload();
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} />
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
      >
        <header className="settings-head">
          <h2>{t.title}</h2>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <section>
          <h3>{t.language}</h3>
          <div className="settings-lang-row">
          <div
            className="settings-chips"
            role="radiogroup"
            aria-label={t.language}
          >
            {[
              ["en", "English"],
              ["es", "Español"],
            ].map(([code, name]) => (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={lang === code}
                className={
                  lang === code
                    ? "settings-chip settings-lang on"
                    : "settings-chip settings-lang"
                }
                onClick={() => onLangChange?.(code)}
              >
                {name}
              </button>
            ))}
          </div>
          {/* Light / dark theme switch, to the right of the language chips */}
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={t.darkMode}
            title={t.darkMode}
            className={theme === "dark" ? "settings-theme on" : "settings-theme"}
            onClick={() => onThemeChange?.(theme === "dark" ? "light" : "dark")}
          >
            <span className="settings-theme-icon" aria-hidden="true">☀</span>
            <span className="settings-theme-icon" aria-hidden="true">☾</span>
            <span className="settings-theme-knob" aria-hidden="true" />
          </button>
          </div>
        </section>

        <p
          className="settings-sample"
          style={{
            fontFamily: fontStack(settings.font),
            fontSize: `calc(17px * ${settings.scale / 100})`,
          }}
        >
          <span
            className="settings-sample-num"
            style={{
              fontSize: `max(8px, calc(12px * ${settings.scale / 100}))`,
            }}
          >
            1
          </span>
          {t.sample}
        </p>

        <section>
          <h3>{t.size}</h3>
          <div className="settings-chips" role="radiogroup" aria-label={t.size}>
            {FONT_SCALES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={settings.scale === s}
                className={
                  settings.scale === s ? "settings-chip on" : "settings-chip"
                }
                onClick={() => onChange({ ...settings, scale: s })}
              >
                {s}%
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>{t.font}</h3>
          <div className="settings-fonts" role="radiogroup" aria-label={t.font}>
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={settings.font === f.id}
                className={
                  settings.font === f.id ? "settings-font on" : "settings-font"
                }
                style={{ fontFamily: f.stack }}
                onClick={() => onChange({ ...settings, font: f.id })}
              >
                {f.label[lang] || f.label.en}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-bottom-toggle">
          <div className="settings-switch-row">
            <span>{t.hideSecond}</span>
            {/* On = 2nd pane hidden. The + button (App.jsx) shows it again, which turns this off. */}
            <button
              type="button"
              role="switch"
              aria-checked={bottomHidden}
              aria-label={t.hideSecond}
              className={bottomHidden ? "settings-switch on" : "settings-switch"}
              onClick={() => onBottomHiddenChange?.(!bottomHidden)}
            >
              <span className="settings-switch-knob" aria-hidden="true" />
            </button>
          </div>
          <p className="settings-hint">{t.hideSecondHint}</p>
        </section>

        {/* "Default panes" section — hidden for now (2026-10-28). To bring it back,
            remove this comment's first and last lines; the strings, props and
            App.jsx logic are all still in place.
        <section>
          <h3>{t.panes}</h3>
          {[
            ["top", t.topPane],
            ["bottom", t.bottomPane],
          ].map(([which, label]) => (
            <label key={which} className="settings-pane-row">
              <span>{label}</span>
              <select
                value={defaultPanes[which] || ""}
                onChange={(e) => onDefaultPaneChange?.(which, e.target.value)}
              >
                <option value="">{t.remember}</option>
                <optgroup label={t.groupEn}>
                  {PANE_OPTIONS.filter(
                    (o) => o.kind === "bible" && o.lang === "en",
                  ).map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t.groupEs}>
                  {PANE_OPTIONS.filter(
                    (o) => o.kind === "bible" && o.lang === "es",
                  ).map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t.groupNotes}>
                  {PANE_OPTIONS.filter((o) => o.kind === "notes").map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          ))}
          <p className="settings-hint">{t.panesHint}</p>
        </section>
        */}

        <section className="settings-storage">
          <h3>{t.storage}</h3>
          {clearStep === "idle" ? (
            <>
              <button
                type="button"
                className="settings-clear"
                onClick={() => setClearStep("confirm")}
              >
                {t.clearData}
              </button>
              <p className="settings-hint">{t.clearHint}</p>
            </>
          ) : (
            <div className="settings-clear-confirm" role="alert">
              <p>{t.clearWarn}</p>
              <div className="settings-clear-actions">
                <button
                  type="button"
                  className="settings-reset"
                  disabled={clearStep === "busy"}
                  onClick={() => setClearStep("idle")}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className="settings-clear danger"
                  disabled={clearStep === "busy"}
                  onClick={clearData}
                >
                  {clearStep === "busy" ? t.clearing : t.clearConfirm}
                </button>
              </div>
            </div>
          )}
          {onOpenDownload && (
            <div className="settings-download">
              <button
                type="button"
                className="settings-download-btn"
                onClick={onOpenDownload}
              >
                {t.download}
              </button>
              <p className="settings-hint">{t.downloadHint}</p>
            </div>
          )}
        </section>

        <footer className="settings-foot">
          <button
            type="button"
            className="settings-reset"
            onClick={() => onChange({ ...DEFAULT_SETTINGS })}
          >
            {t.reset}
          </button>
          <button type="button" className="settings-done" onClick={onClose}>
            {t.done}
          </button>
        </footer>
      </div>
    </>
  );
}
