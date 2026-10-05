/** Pages in the hamburger menu. Each page's text lives in
 *  public/data/pages/<id>.<lang>.md (lang = en | es) — edit those files to
 *  write the page; see InfoPanel.jsx for the supported formatting.
 *  To add a page: add an entry here and create its two .md files. */
export const INFO_PAGES = [
  { id: "author", label: { en: "About the Author", es: "Acerca del autor" } },
  { id: "translations", label: { en: "About the Bible Translations", es: "Acerca de las traducciones" } },
  { id: "manipulations", label: { en: "Bible Manipulations", es: "Manipulaciones bíblicas" } },
  { id: "bibliography", label: { en: "Bibliography", es: "Bibliografía" } },
];
