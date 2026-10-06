/** Pages in the hamburger menu. Each page's text lives in
 *  public/data/pages/<id>.<lang>.md (lang = en | es) — edit those files to
 *  write the page; see InfoPanel.jsx for the supported formatting.
 *  To add a page: add an entry here and create its two .md files. */
export const INFO_PAGES = [
  {
    id: "translations",
    label: {
      en: "Bible Translations",
      es: "Acerca de las traducciones",
    },
  },
  {
    id: "manipulations",
    label: { en: "Bible Manipulations", es: "Manipulaciones bíblicas" },
  },
  {
    id: "deuterocanonical",
    label: { en: "Deuterocanonical Books", es: "Libros deuterocanónicos" },
  },
  { id: "bibliography", label: { en: "Bibliography", es: "Bibliografía" } },
  { id: "author", label: { en: "About the Author", es: "Acerca del autor" } },
  // Not a Markdown page: InfoPanel shows the ReportBugForm for this id.
  {
    id: "report",
    label: { en: "Report a bug", es: "Reportar un error" },
    form: true,
  },
  // Install + offline downloads (InfoPanel shows OfflinePanel for this id).
  {
    id: "offline",
    label: { en: "Download App", es: "Descargar la aplicación" },
    form: true,
  },
];
