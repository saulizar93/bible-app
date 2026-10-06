/**
 * Plain-language explanations of the grammar terms shown in the Strong's
 * panel's "Parsing" block (src/morph.js decodes the codes; this file explains
 * them). Used by the ⓘ button in StrongsPanel's MorphBlock.
 *
 * explainMorph(code, lang) -> { segments: [{ code, label }], terms: [{ term, text }] }
 *   segments = the code split into its letters with what each one stands for
 *   terms    = definitions of every term that appears, in order
 * allTerms(lang) -> every glossary entry, grouped, for "Show all terms".
 */

// ---------- glossary ----------
// Keys: "<group>:<code>" — group = pos, case, number, gender, person, tense,
// voice, mood, suffix, stem, form, misc.
const G = {
  en: {
    // parts of speech
    "pos:N": ["Noun", "A word that names a person, place, thing or idea: λόγος (word), Ἰησοῦς (Jesus)."],
    "pos:V": ["Verb", "A word that expresses an action or a state: λέγω (I say), εἰμί (I am). Greek verbs carry tense, voice, mood, person and number all in one word."],
    "pos:A": ["Adjective", "A word that describes a noun. In Greek it matches its noun in case, number and gender: ὁ λόγος ὁ ἀληθινός (the true word)."],
    "pos:T": ["Article", "The Greek word for “the” (ὁ, ἡ, τό). Greek has no word for “a/an”. The article changes form to match its noun, and its presence or absence can affect meaning (compare John 1:1)."],
    "pos:P": ["Personal pronoun", "I, you, he, she, it, we, they: ἐγώ, σύ, αὐτός. Because the verb ending already shows the subject, a pronoun added as subject is often emphatic (“I myself”)."],
    "pos:R": ["Relative pronoun", "“Who, which, that” — introduces a clause that describes a noun: ὅς, ἥ, ὅ."],
    "pos:D": ["Demonstrative pronoun", "“This, that, these, those” — points to something: οὗτος (this), ἐκεῖνος (that)."],
    "pos:I": ["Interrogative pronoun", "“Who? What? Which?” — asks a question: τίς, τί."],
    "pos:X": ["Indefinite pronoun", "“Someone, something, anyone”: τις, τι."],
    "pos:F": ["Reflexive pronoun", "“Myself, yourself, himself” — the action turns back on the subject: ἑαυτόν."],
    "pos:S": ["Possessive pronoun", "“My, your, our” used as an adjective: ἐμός (my), σός (your)."],
    "pos:C": ["Reciprocal pronoun", "“One another”: ἀλλήλων."],
    "pos:K": ["Correlative pronoun", "Words like “as great as, such as” that correspond to another word in the sentence: ὅσος, τοιοῦτος."],
    "pos:Q": ["Correlative / interrogative pronoun", "“Of what kind? How great?” — questions about quality or quantity: ποῖος, πόσος."],
    "pos:ADV": ["Adverb", "A word that describes a verb, adjective or another adverb: οὕτως (thus, so), νῦν (now)."],
    "pos:CONJ": ["Conjunction", "A word that joins words or clauses: καί (and), δέ (but, and), γάρ (for), ὅτι (that, because)."],
    "pos:COND": ["Conditional", "A word that introduces a condition: εἰ, ἐάν (if)."],
    "pos:PRT": ["Particle", "A small word that adds nuance or negation: μή, οὐ (not), ἄν (would)."],
    "pos:PREP": ["Preposition", "A word that shows relationship (place, time, means): ἐν (in), εἰς (into), ἐκ (out of). The case of the noun after it changes its meaning: διά + genitive = “through”, διά + accusative = “because of”."],
    "pos:INJ": ["Interjection", "An exclamation: ἰδού (behold!), οὐαί (woe!)."],
    "pos:ARAM": ["Aramaic word", "A word kept in Aramaic, the everyday language of Jesus' time: ταλιθα κουμ (Mark 5:41), ἀββα (Abba)."],
    "pos:HEB": ["Hebrew word", "A Hebrew word written in Greek letters: ἀμήν (amen), ἁλληλουϊά (hallelujah)."],
    // case
    "case:N": ["Nominative", "The case of the subject — who or what does the action. In “God loved the world,” God is nominative. Also used for a predicate noun after “to be” (“the Word was God”)."],
    "case:G": ["Genitive", "Usually translated with “of”: possession, origin or description — “the Son of God,” “the love of Christ.” After some prepositions it means “from” or “through.”"],
    "case:D": ["Dative", "Usually translated “to” or “for” (the indirect object), and also “in,” “with” or “by” (place, means): “he gave it to them,” “baptized with water.”"],
    "case:A": ["Accusative", "The case of the direct object — who or what receives the action. In “God loved the world,” world is accusative. Also used after prepositions of motion (εἰς, “into”)."],
    "case:V": ["Vocative", "The case of direct address — calling someone by name: “Lord!” (Κύριε), “Father!” (Πάτερ)."],
    // number
    "number:S": ["Singular", "One person or thing."],
    "number:P": ["Plural", "More than one."],
    // gender
    "gender:M": ["Masculine", "Grammatical gender. Every Greek noun is masculine, feminine or neuter; it is a feature of the word, not always of the thing (λόγος, “word,” is masculine). Articles, adjectives and pronouns match the gender of the noun they go with."],
    "gender:F": ["Feminine", "Grammatical gender. Every Greek noun has a gender that words describing it must match; ἀγάπη (love) is feminine, though love itself has no sex."],
    "gender:N": ["Neuter", "Grammatical gender — “neither” masculine nor feminine. πνεῦμα (spirit) is neuter, which is why pronouns referring back to it can be “it” in Greek."],
    // person
    "person:1": ["1st person", "The speaker: I, we."],
    "person:2": ["2nd person", "The one spoken to: you."],
    "person:3": ["3rd person", "The one spoken about: he, she, it, they."],
    // tense
    "tense:P": ["Present", "In Greek the tense shows mainly the kind of action, not only its time. The present usually presents the action as ongoing or repeated: “is believing,” “keeps on asking.” In the indicative it is present time."],
    "tense:I": ["Imperfect", "Ongoing or repeated action in the past: “was teaching,” “used to go.” Only in the indicative mood."],
    "tense:F": ["Future", "Action that will happen: “he will save.”"],
    "tense:A": ["Aorist", "The most common Greek past tense. It views the action as a whole, a simple event, without describing whether it was ongoing: “he loved,” “he gave.” In the indicative it is usually past time; in other moods (subjunctive, imperative, infinitive, participle) it shows the kind of action, not the time."],
    "tense:2": ["2nd (second) …", "“Second aorist,” “second perfect,” etc. are not different tenses; they are the same tense formed with a different (older, irregular) pattern of endings, like English “sang” instead of “singed.” The meaning is the same as the regular form."],
    "tense:R": ["Perfect", "A completed action whose result still continues: γέγραπται, “it has been written (and still stands written)”; τετέλεσται, “it is finished.”"],
    "tense:L": ["Pluperfect", "A completed action whose result continued at some point in the past: “he had come.”"],
    // voice
    "voice:A": ["Active", "The subject does the action: “God loved.”"],
    "voice:M": ["Middle", "The subject acts on or for itself, or is involved in the result: “he washed himself,” “he chose (for himself).” English has no exact equivalent."],
    "voice:P": ["Passive", "The subject receives the action: “he was raised,” “you are saved.”"],
    "voice:E": ["Middle or passive", "The form could be middle or passive; context decides."],
    "voice:D": ["Middle deponent", "A verb that has middle forms but an active meaning: ἔρχομαι, “I come.” Translate it as active."],
    "voice:O": ["Passive deponent", "A verb that has passive forms but an active meaning: ἀπεκρίθη, “he answered.” Translate it as active."],
    "voice:N": ["Middle or passive deponent", "A deponent verb whose form could be middle or passive; the meaning is active."],
    "voice:Q": ["Impersonal active", "An active form used impersonally: “it is necessary,” “it is lawful.”"],
    "voice:X": ["No voice stated", "The parsing gives no voice for this form."],
    // mood
    "mood:I": ["Indicative", "The mood of statements and questions about reality: “he came,” “did he come?” It is the only mood in which the tense clearly shows time."],
    "mood:S": ["Subjunctive", "The mood of possibility and purpose: “that he might believe,” “if anyone should sin,” “let us go.” Often after ἵνα (in order that) and ἐάν (if)."],
    "mood:O": ["Optative", "The mood of wishes and remote possibility: μὴ γένοιτο, “may it never be!” (Romans 6:2). Rare in the NT."],
    "mood:M": ["Imperative", "The mood of commands and requests: “repent!” “believe!” An aorist imperative usually commands a specific action; a present imperative, a continuing one."],
    "mood:N": ["Infinitive", "The verb used as a noun, “to …”: “to save,” “to believe.”"],
    "mood:P": ["Participle", "The verb used as an adjective, “…ing” or “who …”: ὁ πιστεύων, “the one believing / whoever believes.” It has case, number and gender like an adjective."],
    "mood:R": ["Imperative participle", "A participle that carries the force of a command (Romans 12:9-19)."],
    // suffixes
    "suffix:PRI": ["Proper name, indeclinable", "A name (usually from Hebrew) whose spelling never changes, whatever its role in the sentence: Ἀβραάμ, Δαυίδ, Φαρές. Its case must be worked out from context."],
    "suffix:NUI": ["Numeral, indeclinable", "A number word whose form never changes: δώδεκα (twelve)."],
    "suffix:LI": ["Letter, indeclinable", "A letter of the alphabet used as a word: Ἄλφα, Ὦ (Revelation 1:8)."],
    "suffix:OI": ["Indeclinable", "A word whose form never changes for case, number or gender."],
    "suffix:C": ["Comparative", "“More …, …er”: μείζων, “greater.”"],
    "suffix:S": ["Superlative", "“Most …, …est”: ἐλάχιστος, “least.”"],
    "suffix:N": ["Negative", "A negative form: “not,” “no one.”"],
    "suffix:I": ["Interrogative", "Used to ask a question."],
    "suffix:K": ["Crasis", "Two words merged into one: κἀγώ = καί + ἐγώ, “and I.”"],
    "suffix:ATT": ["Attic form", "A spelling from the older Attic Greek dialect."],
    "suffix:ABB": ["Abbreviated", "A shortened form of the word."],
    "suffix:P": ["With particle", "The word is joined with an attached particle."],
    "suffix:M": ["Middle significance", "The form has a middle-voice sense."],
    // Hebrew
    "stem:Qal": ["Qal", "The basic, simple stem of a Hebrew verb, active meaning: שָׁבַר, “he broke.” About two thirds of Hebrew verbs in the OT are Qal."],
    "stem:Niphal": ["Niphal", "Usually the passive or reflexive of the Qal: “he was broken,” “he hid himself.”"],
    "stem:Piel": ["Piel", "The intensive or causative-factitive stem, active: שִׁבֵּר, “he shattered” (broke in pieces)."],
    "stem:Pual": ["Pual", "The passive of the Piel: “it was shattered.”"],
    "stem:Hiphil": ["Hiphil", "The causative stem, active: “he caused to …” — הִמְלִיךְ, “he made (someone) king.”"],
    "stem:Hophal": ["Hophal", "The passive of the Hiphil: “he was made king.”"],
    "stem:Hithpael": ["Hithpael", "Reflexive or reciprocal action: “he sanctified himself,” “they walked about.”"],
    "stem:other": ["Other stems", "Polel, Pilpel, Hithpolel and similar are variant forms of the Piel / Hithpael families used by certain verb types. Aramaic stems (in Daniel and Ezra) have their own names: Peal ≈ Qal, Pael ≈ Piel, Aphel/Haphel ≈ Hiphil, Ithpeel/Ithpaal ≈ passive or reflexive."],
    "form:Pf": ["Perfect", "A Hebrew verb form that views the action as complete — usually translated with the English past (“he created”), sometimes as certain future (“prophetic perfect”)."],
    "form:Impf": ["Imperfect", "A Hebrew verb form that views the action as incomplete — usually future or ongoing (“he will go,” “he used to go”). With “and” (wayyiqtol) it is the normal past tense of narrative: “and God said.”"],
    "form:Imv": ["Imperative", "A command: “go!” “hear!”"],
    "form:Inf": ["Infinitive", "The verb as a noun, “to …”; Hebrew also uses an “infinitive absolute” for emphasis: “you shall surely die” (Genesis 2:17)."],
    "form:Ptc": ["Participle", "The verb as an adjective or noun, “…ing” or “the one who …”: “the one creating” = Creator."],
    "misc:kethiv": ["Kethiv / Qere", "“Written / read.” Where the scribes believed the consonantal text should be read differently, they left the written form (kethiv) untouched and marked the word to be read (qere) in the margin."],
    "misc:TR": ["Textus Receptus", "The “Received Text”: the printed Greek New Testament of Erasmus, Stephanus and Beza behind the KJV and the Reina-Valera. The Greek word shown is the exact form that stands in that text."],
    "misc:strongs": ["Strong's number", "James Strong's 1890 numbering of every Hebrew (H) and Greek (G) dictionary word in the Bible. It identifies the dictionary form, not the exact form in the verse — that is what the parsing shows."],
  },
};

G.es = {
  "pos:N": ["Sustantivo", "Palabra que nombra a una persona, lugar, cosa o idea: λόγος (palabra), Ἰησοῦς (Jesús)."],
  "pos:V": ["Verbo", "Palabra que expresa una acción o un estado: λέγω (digo), εἰμί (soy). El verbo griego lleva en una sola palabra el tiempo, la voz, el modo, la persona y el número."],
  "pos:A": ["Adjetivo", "Palabra que describe a un sustantivo. En griego concuerda con él en caso, número y género: ὁ λόγος ὁ ἀληθινός (la palabra verdadera)."],
  "pos:T": ["Artículo", "La palabra griega para «el, la, lo» (ὁ, ἡ, τό). El griego no tiene artículo indefinido («un, una»). El artículo cambia de forma según su sustantivo, y su presencia o ausencia puede afectar el sentido (compare Juan 1:1)."],
  "pos:P": ["Pronombre personal", "Yo, tú, él, ella, nosotros, ellos: ἐγώ, σύ, αὐτός. Como la terminación del verbo ya indica el sujeto, un pronombre sujeto añadido suele ser enfático («yo mismo»)."],
  "pos:R": ["Pronombre relativo", "«Que, quien, el cual»: introduce una oración que describe a un sustantivo: ὅς, ἥ, ὅ."],
  "pos:D": ["Pronombre demostrativo", "«Este, ese, aquel»: señala algo: οὗτος (este), ἐκεῖνος (aquel)."],
  "pos:I": ["Pronombre interrogativo", "«¿Quién? ¿Qué? ¿Cuál?»: hace una pregunta: τίς, τί."],
  "pos:X": ["Pronombre indefinido", "«Alguien, algo, alguno»: τις, τι."],
  "pos:F": ["Pronombre reflexivo", "«A mí mismo, a sí mismo»: la acción recae sobre el sujeto: ἑαυτόν."],
  "pos:S": ["Pronombre posesivo", "«Mi, tu, nuestro» usado como adjetivo: ἐμός (mi), σός (tu)."],
  "pos:C": ["Pronombre recíproco", "«Unos a otros»: ἀλλήλων."],
  "pos:K": ["Pronombre correlativo", "Palabras como «tan grande como, tal como» que corresponden a otra en la oración: ὅσος, τοιοῦτος."],
  "pos:Q": ["Pronombre correlativo / interrogativo", "«¿De qué clase? ¿Cuán grande?»: preguntas sobre cualidad o cantidad: ποῖος, πόσος."],
  "pos:ADV": ["Adverbio", "Palabra que modifica a un verbo, adjetivo u otro adverbio: οὕτως (así), νῦν (ahora)."],
  "pos:CONJ": ["Conjunción", "Palabra que une palabras u oraciones: καί (y), δέ (pero, y), γάρ (porque), ὅτι (que, porque)."],
  "pos:COND": ["Condicional", "Palabra que introduce una condición: εἰ, ἐάν (si)."],
  "pos:PRT": ["Partícula", "Palabra pequeña que añade un matiz o una negación: μή, οὐ (no), ἄν."],
  "pos:PREP": ["Preposición", "Palabra que indica relación (lugar, tiempo, medio): ἐν (en), εἰς (hacia, a), ἐκ (de, desde). El caso del sustantivo que la sigue cambia su sentido: διά + genitivo = «por medio de», διά + acusativo = «a causa de»."],
  "pos:INJ": ["Interjección", "Una exclamación: ἰδού (¡he aquí!), οὐαί (¡ay!)."],
  "pos:ARAM": ["Palabra aramea", "Palabra conservada en arameo, la lengua cotidiana en tiempos de Jesús: ταλιθα κουμ (Marcos 5:41), ἀββα (Abba)."],
  "pos:HEB": ["Palabra hebrea", "Palabra hebrea escrita con letras griegas: ἀμήν (amén), ἁλληλουϊά (aleluya)."],
  "case:N": ["Nominativo", "El caso del sujeto: quién o qué realiza la acción. En «De tal manera amó Dios al mundo», Dios está en nominativo. También se usa para el predicado después de «ser» («el Verbo era Dios»)."],
  "case:G": ["Genitivo", "Suele traducirse con «de»: posesión, origen o descripción: «el Hijo de Dios», «el amor de Cristo». Con algunas preposiciones significa «desde» o «por medio de»."],
  "case:D": ["Dativo", "Suele traducirse «a» o «para» (complemento indirecto), y también «en», «con» o «por» (lugar, medio): «se lo dio a ellos», «bautizados con agua»."],
  "case:A": ["Acusativo", "El caso del complemento directo: quién o qué recibe la acción. En «amó Dios al mundo», mundo está en acusativo. También se usa con preposiciones de movimiento (εἰς, «hacia»)."],
  "case:V": ["Vocativo", "El caso de quien es llamado directamente: «¡Señor!» (Κύριε), «¡Padre!» (Πάτερ)."],
  "number:S": ["Singular", "Una sola persona o cosa."],
  "number:P": ["Plural", "Más de una."],
  "gender:M": ["Masculino", "Género gramatical. Todo sustantivo griego es masculino, femenino o neutro; es un rasgo de la palabra, no siempre de la cosa (λόγος, «palabra», es masculino). Los artículos, adjetivos y pronombres concuerdan con el género de su sustantivo."],
  "gender:F": ["Femenino", "Género gramatical. Todo sustantivo griego tiene un género con el que deben concordar las palabras que lo describen; ἀγάπη (amor) es femenino."],
  "gender:N": ["Neutro", "Género gramatical: ni masculino ni femenino. πνεῦμα (espíritu) es neutro, por eso los pronombres que lo retoman pueden ser neutros en griego."],
  "person:1": ["1.ª persona", "Quien habla: yo, nosotros."],
  "person:2": ["2.ª persona", "A quien se habla: tú, vosotros, ustedes."],
  "person:3": ["3.ª persona", "De quien se habla: él, ella, ellos."],
  "tense:P": ["Presente", "En griego el tiempo indica sobre todo la clase de acción, no solo el momento. El presente suele presentar la acción como continua o repetida: «está creyendo», «sigue pidiendo». En el indicativo es tiempo presente."],
  "tense:I": ["Imperfecto", "Acción continua o repetida en el pasado: «enseñaba», «solía ir». Solo existe en el modo indicativo."],
  "tense:F": ["Futuro", "Acción que sucederá: «salvará»."],
  "tense:A": ["Aoristo", "El tiempo pasado más común del griego. Presenta la acción como un todo, un hecho simple, sin indicar si fue continua: «amó», «dio». En el indicativo suele ser pasado; en los demás modos (subjuntivo, imperativo, infinitivo, participio) indica la clase de acción, no el tiempo."],
  "tense:2": ["2.º (segundo) …", "El «segundo aoristo», «segundo perfecto», etc., no son tiempos distintos: es el mismo tiempo formado con otro patrón de terminaciones (más antiguo, irregular), como «puse» frente al regular «amé». El sentido es el mismo que el de la forma regular."],
  "tense:R": ["Perfecto", "Una acción completada cuyo resultado sigue vigente: γέγραπται, «escrito está (y sigue escrito)»; τετέλεσται, «consumado es»."],
  "tense:L": ["Pluscuamperfecto", "Una acción completada cuyo resultado seguía vigente en algún momento del pasado: «había venido»."],
  "voice:A": ["Activa", "El sujeto realiza la acción: «Dios amó»."],
  "voice:M": ["Media", "El sujeto actúa sobre sí mismo o para sí, o participa del resultado: «se lavó», «escogió (para sí)». El español la expresa a menudo con «se»."],
  "voice:P": ["Pasiva", "El sujeto recibe la acción: «fue resucitado», «sois salvos»."],
  "voice:E": ["Media o pasiva", "La forma puede ser media o pasiva; el contexto lo decide."],
  "voice:D": ["Media deponente", "Verbo con forma media pero sentido activo: ἔρχομαι, «vengo». Se traduce como activo."],
  "voice:O": ["Pasiva deponente", "Verbo con forma pasiva pero sentido activo: ἀπεκρίθη, «respondió». Se traduce como activo."],
  "voice:N": ["Media o pasiva deponente", "Verbo deponente cuya forma puede ser media o pasiva; el sentido es activo."],
  "voice:Q": ["Activa impersonal", "Forma activa usada de modo impersonal: «es necesario», «es lícito»."],
  "voice:X": ["Sin voz indicada", "El análisis no indica voz para esta forma."],
  "mood:I": ["Indicativo", "El modo de las afirmaciones y preguntas sobre la realidad: «vino», «¿vino?». Es el único modo en que el tiempo indica claramente el momento."],
  "mood:S": ["Subjuntivo", "El modo de la posibilidad y el propósito: «para que crea», «si alguno pecare», «vamos». Aparece a menudo después de ἵνα (para que) y ἐάν (si)."],
  "mood:O": ["Optativo", "El modo de los deseos y de la posibilidad remota: μὴ γένοιτο, «¡en ninguna manera!» (Romanos 6:2). Es raro en el NT."],
  "mood:M": ["Imperativo", "El modo de las órdenes y peticiones: «¡arrepentíos!», «¡creed!». El imperativo aoristo suele mandar una acción concreta; el presente, una acción continua."],
  "mood:N": ["Infinitivo", "El verbo usado como sustantivo, «…ar, …er, …ir»: «salvar», «creer»."],
  "mood:P": ["Participio", "El verbo usado como adjetivo, «…ando, …iendo» o «el que …»: ὁ πιστεύων, «el que cree». Tiene caso, número y género como un adjetivo."],
  "mood:R": ["Participio imperativo", "Un participio con fuerza de mandato (Romanos 12:9-19)."],
  "suffix:PRI": ["Nombre propio indeclinable", "Un nombre (casi siempre hebreo) cuya forma nunca cambia, sea cual sea su función en la oración: Ἀβραάμ, Δαυίδ, Φαρές. Su caso se deduce del contexto."],
  "suffix:NUI": ["Numeral indeclinable", "Un número cuya forma nunca cambia: δώδεκα (doce)."],
  "suffix:LI": ["Letra indeclinable", "Una letra del alfabeto usada como palabra: Ἄλφα, Ὦ (Apocalipsis 1:8)."],
  "suffix:OI": ["Indeclinable", "Palabra cuya forma no cambia por caso, número ni género."],
  "suffix:C": ["Comparativo", "«Más …»: μείζων, «mayor»."],
  "suffix:S": ["Superlativo", "«El más …, …ísimo»: ἐλάχιστος, «el más pequeño»."],
  "suffix:N": ["Negativo", "Una forma negativa: «no», «nadie»."],
  "suffix:I": ["Interrogativo", "Se usa para preguntar."],
  "suffix:K": ["Crasis", "Dos palabras fundidas en una: κἀγώ = καί + ἐγώ, «y yo»."],
  "suffix:ATT": ["Forma ática", "Una ortografía del antiguo dialecto ático."],
  "suffix:ABB": ["Abreviado", "Una forma abreviada de la palabra."],
  "suffix:P": ["Con partícula", "La palabra va unida a una partícula."],
  "suffix:M": ["Sentido medio", "La forma tiene sentido de voz media."],
  "stem:Qal": ["Qal", "La raíz básica y simple del verbo hebreo, de sentido activo: שָׁבַר, «quebró». Cerca de dos tercios de los verbos del AT están en Qal."],
  "stem:Niphal": ["Nifal", "Generalmente la pasiva o reflexiva del Qal: «fue quebrado», «se escondió»."],
  "stem:Piel": ["Piel", "La raíz intensiva o factitiva, activa: שִׁבֵּר, «hizo pedazos»."],
  "stem:Pual": ["Pual", "La pasiva del Piel: «fue hecho pedazos»."],
  "stem:Hiphil": ["Hifil", "La raíz causativa, activa: «hizo que …» — הִמְלִיךְ, «hizo rey (a alguien)»."],
  "stem:Hophal": ["Hofal", "La pasiva del Hifil: «fue hecho rey»."],
  "stem:Hithpael": ["Hitpael", "Acción reflexiva o recíproca: «se santificó», «andaban de un lado a otro»."],
  "stem:other": ["Otras raíces", "Polel, Pilpel, Hitpolel y similares son variantes de las familias del Piel / Hitpael que usan ciertos tipos de verbos. Las raíces arameas (en Daniel y Esdras) tienen nombres propios: Peal ≈ Qal, Pael ≈ Piel, Afel/Hafel ≈ Hifil, Itpeel/Itpaal ≈ pasiva o reflexiva."],
  "form:Pf": ["Perfecto", "Forma verbal hebrea que ve la acción como completa; suele traducirse en pasado («creó») y a veces como un futuro seguro («perfecto profético»)."],
  "form:Impf": ["Imperfecto", "Forma verbal hebrea que ve la acción como incompleta; suele ser futuro o acción habitual («irá», «solía ir»). Con «y» (wayyiqtol) es el pasado normal de la narración: «y dijo Dios»."],
  "form:Imv": ["Imperativo", "Una orden: «¡ve!», «¡oye!»."],
  "form:Inf": ["Infinitivo", "El verbo como sustantivo; el hebreo también usa un «infinitivo absoluto» para dar énfasis: «ciertamente morirás» (Génesis 2:17)."],
  "form:Ptc": ["Participio", "El verbo como adjetivo o sustantivo, «el que …»: «el que crea» = el Creador."],
  "misc:kethiv": ["Ketiv / Qere", "«Escrito / leído». Donde los escribas creían que el texto consonántico debía leerse de otro modo, dejaron intacta la forma escrita (ketiv) y señalaron al margen la palabra que debe leerse (qere)."],
  "misc:TR": ["Texto Recibido", "El Textus Receptus: el Nuevo Testamento griego impreso de Erasmo, Estienne y Beza, base de la Reina-Valera y de la KJV. La palabra griega que se muestra es la forma exacta que aparece en ese texto."],
  "misc:strongs": ["Número de Strong", "La numeración de James Strong (1890) de cada palabra hebrea (H) y griega (G) del diccionario bíblico. Identifica la forma de diccionario, no la forma exacta del versículo; eso es lo que muestra el análisis."],
};

const MAIN_STEMS = ["Qal", "Niphal", "Piel", "Pual", "Hiphil", "Hophal", "Hithpael"];

const term = (lang, key) => {
  const e = (G[lang] || G.en)[key] || G.en[key];
  return e ? { key, term: e[0], text: e[1] } : null;
};

// ---------- code breakdown ----------
const CNG = /^([NGDAV])([SP])([MFN])?$/;
const P_CNG = /^([123])([NGDAV])([SP])([MFN])?$/;
const POSS = /^([123])([SP])([NGDAV])([SP])([MFN])$/;
const PN = /^([123])([SP])$/;
const TVMOOD = /^(2?)([PIFARL])([AMPEDONQX])([ISOMNPR])$/;

/** Split a Robinson code into [{ code, key }] (key = glossary key). */
function greekSegments(code) {
  const segs = [];
  const parts = code.split("-");
  const push = (c, key) => segs.push({ code: c, key });
  push(parts[0], `pos:${parts[0]}`);
  for (const p of parts.slice(1)) {
    let m;
    if (parts[0] === "V" && (m = p.match(TVMOOD))) {
      if (m[1]) push("2", "tense:2");
      push(m[2], `tense:${m[2]}`);
      push(m[3], `voice:${m[3]}`);
      push(m[4], `mood:${m[4]}`);
    } else if ((m = p.match(PN))) {
      push(m[1], `person:${m[1]}`);
      push(m[2], `number:${m[2]}`);
    } else if ((m = p.match(CNG))) {
      push(m[1], `case:${m[1]}`);
      push(m[2], `number:${m[2]}`);
      if (m[3]) push(m[3], `gender:${m[3]}`);
    } else if ((m = p.match(P_CNG))) {
      push(m[1], `person:${m[1]}`);
      push(m[2], `case:${m[2]}`);
      push(m[3], `number:${m[3]}`);
      if (m[4]) push(m[4], `gender:${m[4]}`);
    } else if ((m = p.match(POSS))) {
      push(m[1], `person:${m[1]}`);
      push(m[2], `number:${m[2]}`);
      push(m[3], `case:${m[3]}`);
      push(m[4], `number:${m[4]}`);
      push(m[5], `gender:${m[5]}`);
    } else {
      push(p, `suffix:${p}`);
    }
  }
  return segs;
}

/**
 * @param code   Robinson ("V-2AAI-3S") or Strong's TVM ("TH8804") code, may be empty
 * @param decoded the object from morph.js decodeMorph / the Hebrew pos fallback
 * @param hasForm a Textus Receptus form is shown
 */
export function explainMorph(code, decoded, lang = "en", hasForm = false) {
  const segments = [];
  const keys = [];
  if (code && /^TH?\d+$/i.test(code)) {
    const n = code.replace(/^TH?/i, "");
    segments.push({ code: "T", label: lang === "es" ? "código de tiempo/raíz (TVM)" : "tense/stem code (TVM)" });
    segments.push({ code: "H", label: lang === "es" ? "hebreo" : "Hebrew" });
    segments.push({ code: n, label: decoded?.summary || "" });
    const stem = decoded?.fields?.find((f) => f.k === "stem")?.v;
    const form = decoded?.fields?.find((f) => f.k === "form");
    if (stem) keys.push(MAIN_STEMS.includes(stem) ? `stem:${stem}` : "stem:other");
    if (form) {
      const fk = Object.entries({ Pf: /Perf/, Impf: /Imperf/, Imv: /Imperat/, Inf: /Infin/, Ptc: /Partic/ }).find(([, re]) =>
        re.test(form.v),
      );
      if (fk) keys.push(`form:${fk[0]}`);
    }
    if (/kethiv|qere|ketiv/i.test(decoded?.pos || "")) keys.push("misc:kethiv");
  } else if (code) {
    for (const s of greekSegments(code)) {
      const t = term(lang, s.key);
      segments.push({ code: s.code, label: t ? t.term : s.code });
      keys.push(s.key);
    }
  } else if (decoded) {
    // Hebrew dictionary part of speech (no parsing code)
    const map = { Noun: "pos:N", Sustantivo: "pos:N", Verb: "pos:V", Verbo: "pos:V", Adjective: "pos:A", Adjetivo: "pos:A",
      Adverb: "pos:ADV", Adverbio: "pos:ADV", Preposition: "pos:PREP", Preposición: "pos:PREP", Conjunction: "pos:CONJ",
      Conjunción: "pos:CONJ", Interjection: "pos:INJ", Interjección: "pos:INJ", Particle: "pos:PRT", Partícula: "pos:PRT",
      Masculine: "gender:M", Masculino: "gender:M", Feminine: "gender:F", Femenino: "gender:F" };
    for (const v of [decoded.pos, ...(decoded.fields || []).map((f) => f.v)]) if (map[v]) keys.push(map[v]);
  }
  if (hasForm) keys.push("misc:TR");
  keys.push("misc:strongs");
  const seen = new Set();
  const terms = keys.filter((k) => !seen.has(k) && seen.add(k)).map((k) => term(lang, k)).filter(Boolean);
  return { segments, terms };
}

/** Every glossary entry grouped for "Show all terms". */
export function allTerms(lang = "en") {
  const t = G[lang] || G.en;
  const groups = lang === "es"
    ? [["Clases de palabras", "pos"], ["Caso", "case"], ["Número, género y persona", /^(number|gender|person)$/],
       ["Tiempo", "tense"], ["Voz", "voice"], ["Modo", "mood"], ["Otras indicaciones", "suffix"],
       ["Hebreo", /^(stem|form)$/], ["General", "misc"]]
    : [["Parts of speech", "pos"], ["Case", "case"], ["Number, gender and person", /^(number|gender|person)$/],
       ["Tense", "tense"], ["Voice", "voice"], ["Mood", "mood"], ["Other labels", "suffix"],
       ["Hebrew", /^(stem|form)$/], ["General", "misc"]];
  return groups.map(([title, g]) => ({
    title,
    terms: Object.keys(t)
      .filter((k) => {
        const grp = k.split(":")[0];
        return typeof g === "string" ? grp === g : g.test(grp);
      })
      .map((k) => term(lang, k)),
  }));
}
