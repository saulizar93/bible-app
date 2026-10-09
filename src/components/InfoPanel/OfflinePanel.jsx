import { useEffect, useState } from "react";
import { PANE_OPTIONS } from "../../js/data.js";
import {
  STARTER,
  approxSize,
  canPromptInstall,
  cancelDownload,
  downloadAll,
  downloadPack,
  getState,
  isIOS,
  isStandalone,
  promptInstall,
  storageEstimate,
} from "../../js/offline.js";
import useOfflineStatus from "../../hooks/useOfflineStatus.js";

const T = {
  en: {
    installTitle: "Install on your device",
    installIntro: "Install the app to open it from your home screen like any other app and read without an internet connection.",
    install: "Install app",
    installed: "✓ The app is installed on this device.",
    ios: "On iPhone or iPad: tap the Share button in Safari, then “Add to Home Screen”.",
    other: "Open your browser's menu and choose “Install app” or “Add to Home Screen”. (On iPhone, use Safari.)",
    starter: (a, b) => `When installed, ${a} and ${b} are downloaded first so they work offline right away.`,
    offlineTitle: "Available offline",
    offlineIntro: "Download any translation or set of notes to read it without a connection. Downloaded items are marked ⬇︎ in the pane menus.",
    groupEn: "English",
    groupEs: "Español",
    groupNotes: "Study notes",
    ready: "✓ Ready offline",
    outdated: "Update available",
    none: "Not downloaded",
    download: "Download",
    update: "Update",
    cancel: "Cancel",
    all: "Download everything",
    used: (mb) => `Stored on this device: ${mb} MB`,
    lexicon: "includes Greek/Hebrew lexicon",
    failed: "Download failed — check your connection and try again.",
  },
  es: {
    installTitle: "Instalar en su dispositivo",
    installIntro: "Instale la aplicación para abrirla desde la pantalla de inicio como cualquier otra aplicación y leer sin conexión a internet.",
    install: "Instalar aplicación",
    installed: "✓ La aplicación está instalada en este dispositivo.",
    ios: "En iPhone o iPad: toque el botón Compartir en Safari y luego «Agregar a pantalla de inicio».",
    other: "Abra el menú de su navegador y elija «Instalar aplicación» o «Agregar a pantalla de inicio». (En iPhone, use Safari.)",
    starter: (a, b) => `Al instalarla, se descargan primero ${a} y ${b} para que funcionen sin conexión de inmediato.`,
    offlineTitle: "Disponible sin conexión",
    offlineIntro: "Descargue cualquier traducción o juego de notas para leerlo sin conexión. Lo descargado aparece marcado con ⬇︎ en los menús de los paneles.",
    groupEn: "English",
    groupEs: "Español",
    groupNotes: "Notas de estudio",
    ready: "✓ Lista sin conexión",
    outdated: "Actualización disponible",
    none: "Sin descargar",
    download: "Descargar",
    update: "Actualizar",
    cancel: "Cancelar",
    all: "Descargar todo",
    used: (mb) => `Guardado en este dispositivo: ${mb} MB`,
    lexicon: "incluye léxico griego/hebreo",
    failed: "La descarga falló; revise su conexión e inténtelo de nuevo.",
  },
};

export default function OfflinePanel({ lang = "en" }) {
  const t = T[lang] || T.en;
  const tick = useOfflineStatus();
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    storageEstimate().then((e) => setUsage(e?.usage ?? null));
  }, [tick]);

  const starter = (STARTER[lang] || STARTER.en).map((c) => PANE_OPTIONS.find((o) => o.code === c)?.label);
  const groups = [
    [t.groupEn, PANE_OPTIONS.filter((o) => o.kind === "bible" && o.lang === "en")],
    [t.groupEs, PANE_OPTIONS.filter((o) => o.kind === "bible" && o.lang === "es")],
    [t.groupNotes, PANE_OPTIONS.filter((o) => o.kind === "notes")],
  ];
  const allReady = PANE_OPTIONS.every((o) => getState(o.code).state === "ready");
  const anyBusy = PANE_OPTIONS.some((o) => getState(o.code).state === "downloading");

  return (
    <div className="offline-panel">
      <section>
        <h3>{t.installTitle}</h3>
        {isStandalone() ? (
          <p className="offline-ok">{t.installed}</p>
        ) : (
          <>
            <p>{t.installIntro}</p>
            {canPromptInstall() ? (
              <button type="button" className="report-send" onClick={promptInstall}>
                {t.install}
              </button>
            ) : (
              <p className="offline-howto">{isIOS() ? t.ios : t.other}</p>
            )}
            <p className="report-hint">{t.starter(starter[0], starter[1])}</p>
          </>
        )}
      </section>

      <section>
        <h3>{t.offlineTitle}</h3>
        <p>{t.offlineIntro}</p>
        {groups.map(([title, opts]) => (
          <div key={title} className="offline-group">
            <h4>{title}</h4>
            <ul>
              {opts.map((o) => {
                const s = getState(o.code);
                return (
                  <li key={o.code} className={`offline-row ${s.state}`}>
                    <div className="offline-name">
                      <span>{o.label}</span>
                      <small>
                        ≈ {approxSize(o)} MB{o.strongs ? ` · ${t.lexicon}` : ""}
                      </small>
                    </div>
                    <div className="offline-action">
                      {s.state === "downloading" ? (
                        <>
                          <span className="offline-bar" aria-label={`${Math.round(s.progress * 100)}%`}>
                            <span style={{ width: `${Math.round(s.progress * 100)}%` }} />
                          </span>
                          <span className="offline-pct">{Math.round(s.progress * 100)}%</span>
                          <button type="button" className="offline-btn ghost" onClick={() => cancelDownload(o.code)}>
                            {t.cancel}
                          </button>
                        </>
                      ) : s.state === "ready" ? (
                        <span className="offline-status ready">{t.ready}</span>
                      ) : (
                        <>
                          <span className="offline-status">{s.error ? t.failed : s.state === "outdated" ? t.outdated : t.none}</span>
                          <button type="button" className="offline-btn" onClick={() => downloadPack(o.code)}>
                            {s.state === "outdated" ? t.update : t.download}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {!allReady && (
          <button type="button" className="report-send" disabled={anyBusy} onClick={downloadAll}>
            {t.all}
          </button>
        )}
        {usage != null && <p className="report-hint">{t.used((usage / 1048576).toFixed(1))}</p>}
      </section>
    </div>
  );
}
