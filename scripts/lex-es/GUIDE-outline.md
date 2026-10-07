# Translating the Hebrew lexicon "Meanings (outline)" into Spanish

Input lines look like:  `H1254#1<TAB>1a) (Qal) to shape, fashion, create (always with God as subject)`
Output one line per input line, same key, Spanish text:  `H1254#1<TAB>1a) (Qal) formar, dar forma, crear (siempre con Dios como sujeto)`

These are sense outlines from a Strong's Hebrew dictionary (Brown-Driver-Briggs style), shown in a Bible study app to Spanish-speaking readers (Reina-Valera tradition).

## Hard rules
1. Exactly one output line per input line, same key (`H<n>#<i>`), a single TAB, then the Spanish. Never skip, merge, split or reorder lines. No blank lines, no comments, no extra text.
2. Keep the numbering prefix exactly as given (`1)`, `1a)`, `1a1b)`, `2c)` …), including when there is none.
3. Keep unchanged: Hebrew/Aramaic letters, transliterations, Strong's references (`H0136`, `H3068`), Bible references (`Gen 1:1`, `1Sa 30:1`, `Ps 22:1` — keep the English book abbreviations as written), numbers, and abbreviations of reference works (`BDB`, `TWOT`, `LXX`, `AV`, `CLBL`, `NT`, `OT`).
4. Keep verb stem names as they are, in parentheses: (Qal) (Niphal) (Piel) (Pual) (Hiphil) (Hophal) (Hithpael) (Polel) (Polal) (Pilpel) (Hithpolel) (Poel) (Poal) (Pilel) (Pulal) and Aramaic (P'al) (Peal) (Pael) (Peil) (Aphel) (Haphel) (Hithpeel) (Ithpaal) (Hithpaal) (Shaphel) etc.
5. Do not translate a line that is only a name or code: a bare `(Qal)` stays `(Qal)`.
6. Never leave English words in the Spanish (except the items in rule 3). If a line is already not English (a lone Hebrew word, a reference), copy it unchanged.

## Style
- English infinitive "to X" → Spanish infinitive: "to create" → "crear", "to be created" → "ser creado", "to cause to fall" → "hacer caer", "to make oneself known" → "darse a conocer".
- Keep the list character: comma-separated glosses stay comma-separated, short, no added articles unless natural ("a sowing" → "una siembra", "seed" → "semilla").
- Religious vocabulary as in the Reina-Valera: LORD → SEÑOR, God → Dios, Lord → Señor, holy → santo, sin → pecado, iniquity → iniquidad, righteousness → justicia, atonement → expiación, covenant → pacto, offering → ofrenda, sacrifice → sacrificio, priest → sacerdote, prophet → profeta, temple → templo, tabernacle → tabernáculo, ark → arca, altar → altar, Gentiles → gentiles, Messiah → Mesías.
- Proper names: "Jehovah" → "Jehová"; well-known names use their Reina-Valera form (Moses → Moisés, Abraham → Abraham, Isaac → Isaac, Jacob → Jacob, Joseph → José, David → David, Solomon → Salomón, Jerusalem → Jerusalén, Egypt → Egipto, Babylon → Babilonia, Israel → Israel, Judah → Judá). Other names: keep them as written. Name lines look like `Immanuel = "God with us"` → `Immanuel = «Dios con nosotros»` — keep the name, translate the meaning, and use « » for the quoted meaning.
- Grammar shorthand, expand into plain Spanish:
  - `n pr m` → `nombre propio masculino` · `n pr f` → `nombre propio femenino` · `n pr loc` → `nombre propio de lugar`
  - `n m` → `sustantivo masculino` · `n f` → `sustantivo femenino` · `n` → `sustantivo` · `adj` → `adjetivo` · `adv` → `adverbio` · `v` → `verbo` · `subst` → `sustantivo` · `prep` → `preposición` · `conj` → `conjunción` · `interj` → `interjección` · `part` → `partícula` · `pron` → `pronombre`
  - `pron 3p s` → `pron. 3.ª pers. sing.` ; `demons pron` → `pron. demostrativo`
  - `(fig.)` → `(fig.)` · `(by meton)` → `(por metonimia)` · `(pl.)` → `(pl.)` · `(sing.)` → `(sing.)` · `(coll.)` → `(colectivo)` · `i.e.` → `es decir` · `e.g.` → `p. ej.` · `meaning dubious` → `significado dudoso` · `meaning uncertain` → `significado incierto` · `(participle)` → `(participio)` · `(infinitive)` → `(infinitivo)` · `subj` → `sujeto` · `(Aramaic)` → `(arameo)`
- Gender/number words that refer to Hebrew grammar: masculine → masculino, feminine → femenino, plural → plural, singular → singular, construct → constructo, absolute → absoluto.
- Keep punctuation, parentheses and brackets as in the original. Use straight quotes `"` only where the original quotes a gloss inside a sentence; for `Name = "meaning"` lines use « ».

## Examples
```
H1254#0	1) to create, shape, form
→ H1254#0	1) crear, formar, dar forma
H1254#5	1b) (Niphal) to be created
→ H1254#5	1b) (Niphal) ser creado
H1254#10	1c) (Piel)
→ H1254#10	1c) (Piel)
H430#1	1a) rulers, judges
→ H430#1	1a) gobernantes, jueces
H430#5	2) (plural intensive-singular meaning)
→ H430#5	2) (plural intensivo con sentido singular)
H3068#0	Jehovah = "the existing One"
→ H3068#0	Jehová = «el que existe»
H3068#2	1a) unpronounced except with the vowel pointings of H0136
→ H3068#2	1a) no se pronuncia sino con las vocales de H0136
H1931#0	pron 3p s
→ H1931#0	pron. 3.ª pers. sing.
H2233#6	1f) sowing time (by meton)
→ H2233#6	1f) tiempo de siembra (por metonimia)
H1121#6	1f) sons (as characterisation, i.e. sons of injustice [for un- righteous men] or sons of God [for angels]
→ H1121#6	1f) hijos (como caracterización, es decir, hijos de injusticia [por hombres injustos] o hijos de Dios [por ángeles]
H6005#0	Immanuel = "God with us" or "with us is God"
→ H6005#0	Immanuel = «Dios con nosotros» o «con nosotros está Dios»
H3045#11	1a3) to know (a person carnally)
→ H3045#11	1a3) conocer (a una persona carnalmente)
```
