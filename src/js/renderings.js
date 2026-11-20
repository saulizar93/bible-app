/** How a tagged word's text is reduced to its "rendering", shared by
 *  scripts/build-lexicon-search.mjs (which counts them into renderings.json) and
 *  the lexicon (which filters a word's verses by one of them), so both agree.
 *  "of the Church," -> "church"; "de la iglesia" -> "iglesia"; "LORD'S" -> "lord's". */

/** "Iglesia," -> "iglesia"; "(the church)" -> "the church". */
export const clean = (t) =>
  String(t)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[¶¿¡()«»“”"[\].,;:!?·]/g, " ")
    .replace(/(^|\s)'+|'+(?=\s|$)/g, " ") // quote marks, but keep "lord's"
    .replace(/\s+/g, " ")
    .trim();

// Articles, prepositions and possessives the tag often includes ("of the church",
// "de la iglesia") are dropped from the front, so the renderings group by the word
// itself ("church", "iglesia"). A token made only of such words is kept as it is.
export const LEAD = new Set(
  ("the a an of to unto in into on upon by for from with and or but that which who whom " +
    "his her its their my thy your our me him them us thee you " +
    "el la lo los las un una unos unas de del a al en y e o u que con por para sin sobre " +
    "su sus mi mis tu tus nuestro nuestra nuestros nuestras vuestro vuestra vuestros vuestras se le les")
    .split(" "),
);
export const core = (w) => {
  const parts = w.split(" ");
  let i = 0;
  while (i < parts.length - 1 && LEAD.has(parts[i])) i++;
  return parts.slice(i).join(" ");
};

export const renderingOf = (text) => core(clean(text));
