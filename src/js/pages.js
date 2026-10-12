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
  {
    id: "who-gave-us-the-bible",
    label: { en: "Who gave us the Bible?", es: "¿Quién nos dio la Biblia?" },
  },
  {
    id: "one-true-church",
    label: { en: "The One True Church", es: "La única iglesia verdadera" },
  },
  {
    id: "first-bishops-of-rome",
    label: { en: "First Bishops of Rome", es: "Los primeros obispos de Roma" },
  },
  {
    id: "image-veneration",
    label: { en: "Image veneration", es: "Veneración de imágenes" },
  },
  {
    id: "matthew-16-18",
    label: { en: "Matthew 16:18", es: "Mateo 16:18" },
  },
  {
    id: "church-history",
    label: { en: "Church History", es: "Historia de la Iglesia" },
  },
  {
    id: "trinity-development",
    label: {
      en: "Development of the Trinity",
      es: "Desarrollo de la Trinidad",
    },
  },
  {
    id: "trinitarian-questions",
    label: {
      en: "Questions for Trinitarians",
      es: "Preguntas para trinitarios",
    },
  },
  {
    id: "baptism",
    label: { en: "Baptism", es: "El bautismo" },
  },
  {
    id: "evidence-creator",
    label: { en: "Evidence for a Creator", es: "Evidencia de un Creador" },
  },
  {
    id: "evidence-jesus",
    label: { en: "Evidence for Jesus", es: "Evidencia de Jesús" },
  },
  {
    id: "problems-with-catholicism",
    label: { en: "Problems with Catholicism", es: "Problemas con el catolicismo" },
  },
  {
    id: "problems-with-islam",
    label: { en: "Problems with Islam", es: "Problemas con el islam" },
  },
  {
    id: "problems-with-mormonism",
    label: { en: "Problems with Mormonism", es: "Problemas con el mormonismo" },
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
  // hidden: not listed in the hamburger menu; opened from Settings instead.
  {
    id: "offline",
    label: { en: "Download App", es: "Descargar la aplicación" },
    form: true,
    hidden: true,
  },
];
