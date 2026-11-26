"""Septuagint pane (LXX) and its Greek interlinear, in KJV chapter/verse numbers.

    python3 scripts/lxx/build-lxx.py --eng "C:/Users/saulo/Downloads/eng-lxx2012_usfm" \
                                     --greek "C:/Users/saulo/Downloads/LXX"

Sources
  English: Brenton's Septuagint, updated (eBible.org LXX2012, Public Domain), USFM.
  Greek:   CrossWire SWORD module "LXX" (Rahlfs 1935, morphology from CCAT, Strong's
           numbers added by CrossWire; "Copyrighted; Free non-commercial distribution").

Writes
  public/data/bibles/lxx/<1-39>.json   the English text, KJV-numbered, with Strong's
                                       tokens (w) carried from the Greek
  public/data/strongs/lxx/<1-39>.json  the Greek, KJV-numbered, for the interlinear:
                                       {"b":1,"w":{"1":[[["ἐν","G1722","PREP",""],...],...]}}
  public/data/strongs/lxx/forms.json   every Greek form of each number in the LXX

How the verses are matched to the KJV's numbers (both texts follow the Septuagint's
own numbering: Psalms one behind, Jeremiah 25-51 in another order, Malachi 4 inside 3,
Exodus 36-39, 1 Kings 20/21, Psalm titles counted as verse 1 in the Greek, ...):
each Septuagint verse is compared with the KJV verses of the same book (English word
overlap for Brenton; for the Greek, the English meanings of its Strong's numbers) and a
best path is chosen that prefers consecutive verses but can jump where the order
differs (Viterbi). A verse is never split: when the Septuagint has more than the KJV,
two of its verses share one KJV number; a KJV verse the Septuagint lacks stays empty.

Strong's for the English: within each KJV verse, every English word is matched to a
Greek word of the same verse by the KJV meanings of its Strong's number (lexicon "kjv"
field and how the KJV New Testament renders it) and by how often the two occur together
in the whole Old Testament; small words (the, of, to ...) join the tagged word after
them, as in the KJV's tokens. Words Brenton supplied (italics) stay untagged.
"""
import argparse, glob, json, os, re, struct, zlib
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DATA = os.path.join(ROOT, "public", "data")
OSIS = ["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
        "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam",
        "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal"]
USFM = ("GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC "
        "SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL").split()

# ---------------------------------------------------------------- English (USFM)
def usfm_parse(src, bid):
    path = glob.glob(os.path.join(src, f"*-{bid}eng-lxx2012.usfm"))[0]
    s = open(path, encoding="utf-8-sig").read()
    s = re.sub(r"\\f .*?\\f\*", " ", s, flags=re.S)
    s = re.sub(r"\\x .*?\\x\*", " ", s, flags=re.S)
    s = re.sub(r"\\vp .*?\\vp\*", " ", s, flags=re.S)
    chs, titles = {}, {}
    cur = v = mode = None
    for t in re.split(r"(\\c \d+|\\v \d+[a-z]?|\\d )", s):
        m = re.match(r"\\c (\d+)", t)
        if m:
            cur, v, mode = int(m.group(1)), None, None
            chs[cur] = {}
            continue
        m = re.match(r"\\v (\d+)", t)
        if m:
            v, mode = int(m.group(1)), "v"
            chs[cur].setdefault(v, "")
            continue
        if t == "\\d ":
            mode = "d"
            continue
        if cur is None:
            continue
        if mode == "v":
            chs[cur][v] += " " + t
        elif mode == "d":
            # "(24) A Psalm for David": the Hebrew number in brackets is dropped
            titles[cur] = titles.get(cur, "") + re.sub(r"^\s*\(\d+\)\s*", "", t.split("\\")[0])
            mode = None
    return chs, titles


def usfm_words(raw):
    """USFM verse -> [[word, italic]]; \\add/\\it = words the translator supplied."""
    s = re.sub(r"\\\+?(add|it)\*", "\u0002", raw)
    s = re.sub(r"\\\+?(add|it) ", "\u0001", s)
    s = re.sub(r"\\[a-z0-9]+\*?", " ", s)
    words, on, cur, cur_it = [], False, "", False
    for ch in s:
        if ch == "\u0001":
            on = True
            continue
        if ch == "\u0002":
            on = False
            continue
        if ch.isspace():
            if cur:
                words.append([cur, cur_it])
                cur = ""
            continue
        if not cur:
            cur_it = on
        elif cur_it != on and ch.isalpha():
            cur_it = cur_it and on
        cur += ch
    if cur:
        words.append([cur, cur_it])
    out = []
    for w, it in words:
        if out and re.fullmatch(r"[,.;:?!)\]’”]+", w):
            out[-1][0] += w
        else:
            out.append([w, it and bool(re.search(r"\w", w))])
    return out


def english_units(src, n):
    chs, titles = usfm_parse(src, USFM[n - 1])
    units, refs = [], []
    for c in sorted(chs):
        if USFM[n - 1] == "PSA" and c == 151:
            continue
        for v in sorted(chs[c]):
            words = usfm_words(chs[c][v])
            if v == 1 and titles.get(c):
                words = usfm_words(titles[c]) + words
            if words:
                units.append(words)
                refs.append((c, v))
    return units, refs

# ---------------------------------------------------------------- Greek (SWORD zText, OSIS)
def greek_books(moddir):
    d = os.path.join(moddir, "modules", "texts", "ztext", "lxx")
    bzs = open(os.path.join(d, "ot.bzs"), "rb").read()
    bzz = open(os.path.join(d, "ot.bzz"), "rb").read()
    bzv = open(os.path.join(d, "ot.bzv"), "rb").read()
    cache = {}

    def blk(i):
        if i not in cache:
            off, size, _ = struct.unpack("<III", bzs[i * 12:i * 12 + 12])
            cache[i] = zlib.decompress(bzz[off:off + size])
        return cache[i]

    books, book, ch = {}, None, None
    for i in range(len(bzv) // 10):
        b, o, s = struct.unpack("<IIH", bzv[i * 10:i * 10 + 10])
        e = blk(b)[o:o + s].decode("utf-8") if s else ""
        m = re.search(r'<div osisID="([^"]+)"[^>]*type="book"', e)
        if m:
            book, ch = m.group(1), None
            books.setdefault(book, {})
            continue
        m = re.search(r'<chapter osisID="[^"]+\.(\d+)"', e)
        if m:
            ch = int(m.group(1))
            books[book].setdefault(ch, [])
            continue
        if book and ch:
            books[book][ch].append(e)
    return books


PERSON = {"G1473": "1", "G2249": "1", "G4771": "2", "G5210": "2"}


def robinson(p, code):
    """CCAT/Packard parsing -> the Robinson codes src/js/morph.js decodes."""
    if not p:
        return ""
    head, _, rest = p.partition("-")
    simple = {"C": "CONJ", "P": "PREP", "D": "ADV", "X": "PRT", "I": "INJ", "M": "A-NUI", "N": "N-PRI"}
    if head in simple and not rest:
        return simple[head]
    if head.startswith("V"):
        if len(rest) < 3:
            return "V"
        t, v, mo = rest[0], rest[1], rest[2]
        t = {"X": "R", "Y": "L"}.get(t, t)
        mo = {"D": "M"}.get(mo, mo)
        tail = rest[3:]
        if mo == "P":
            return f"V-{t}{v}P-{tail}"
        if mo == "N":
            return f"V-{t}{v}N"
        return f"V-{t}{v}{mo}-{tail}"
    cng = rest
    if head.startswith("N"):
        return f"N-{cng}" if cng else "N-PRI"
    if head.startswith("A"):
        return f"A-{cng}" if cng else "A-NUI"
    if head == "RA":
        return f"T-{cng}"
    if head == "RP":
        per = PERSON.get(code, "")
        return f"P-{per}{cng[:2]}" if per else f"P-{cng}"
    if head == "RD":
        return f"P-{cng}" if code == "G846" else f"D-{cng}"
    if head == "RR":
        return f"R-{cng}"
    if head == "RI":
        return f"{'X' if code == 'G5100' else 'I'}-{cng}"
    if head == "RX":
        return f"R-{cng}"
    return p


def greek_words(raw):
    if 'subType="x-2"' in raw:  # Daniel: Theodotion (as Brenton); Judges: B text (as Brenton)
        raw = re.sub(r'<seg subType="x-1" type="x-variant">.*?</seg>', "", raw, flags=re.S)
    out = []
    for a, w in re.findall(r"<w ([^>]*)>([^<]*)</w>", raw):
        m = re.search(r"strong:G0*(\d+)", a)
        code = f"G{m.group(1)}" if m else ""
        mm = re.search(r"packard:([^\"]+)", a)
        out.append([w.strip(), code, robinson(mm.group(1) if mm else "", code), ""])
    return out


def greek_units(books, n):
    g = books.get(OSIS[n - 1], {})
    units, refs = [], []
    for c in sorted(g):
        for i, raw in enumerate(g[c]):
            w = greek_words(raw)
            if w:
                units.append(w)
                refs.append((c, i + 1))
    return units, refs

# ---------------------------------------------------------------- English meanings of Greek numbers
STOP = set(("the a an of and to in that is was be he him his it they them their i me my you your we us our "
            "thou thee thy ye shall will not for with on by as from which who whom this these those all but or "
            "so then there when unto upon were are had have hath also o said say saying").split())


def stem(w):
    w = w.lower()
    for suf in ("eth", "est", "ing", "ed", "es", "s"):
        if len(w) > 4 and w.endswith(suf):
            return w[: -len(suf)]
    return w


def ewords(text):
    return [stem(w) for w in re.findall(r"[A-Za-z]+", text) if w.lower() not in STOP]


lex = {}
for f in glob.glob(os.path.join(DATA, "strongs", "greek", "*.json")):
    lex.update(json.load(open(f, encoding="utf-8")))
rend = json.load(open(os.path.join(DATA, "concord", "greek", "renderings.json"), encoding="utf-8"))
_gloss = {}


def gloss(code):
    if code not in _gloss:
        s = set()
        e = lex.get(code)
        if e and e.get("kjv"):
            for w in re.findall(r"[A-Za-z]+", re.sub(r"\([^)]*\)", "", e["kjv"])):
                if w.lower() not in STOP and w != "X":
                    s.add(stem(w))
        for w, _ in rend.get(code, [])[:12]:
            for x in re.findall(r"[A-Za-z]+", w):
                if x.lower() not in STOP:
                    s.add(stem(x))
        _gloss[code] = s
    return _gloss[code]


GSTOP = {"G3588", "G2532", "G1161", "G846", "G1063", "G3754", "G1722", "G1519", "G1537", "G575", "G1909",
         "G4314", "G3756", "G3361", "G5100", "G3739", "G3778", "G1473", "G4771", "G2249", "G5210", "G1510",
         "G2258", "G1520", "G3956"}

# ---------------------------------------------------------------- verse alignment
def viterbi(units, kjv_sets, score_fn, ident, topk=10):
    inv = defaultdict(set)
    for k, S in enumerate(kjv_sets):
        for w in S:
            inv[w].add(k)
    cands = []
    for i, u in enumerate(units):
        sc = score_fn(u, inv, kjv_sets)
        d = dict(sorted(sc.items(), key=lambda x: -x[1])[:topk])
        if ident[i] is not None and ident[i] not in d:
            d[ident[i]] = sc.get(ident[i], 0.0)
        cands.append(d)
    best, back = [], []
    for i, d in enumerate(cands):
        prev = best[i - 1] if i else None
        states = set(d) | (set(prev) if prev else set())
        cur, bk = {}, {}
        for k in states:
            s = d.get(k, 0.0) + (0.08 if ident[i] == k else 0)
            if not prev:
                cur[k], bk[k] = s, None
                continue
            bv, bkk = -1e9, None
            for pk, pv in prev.items():
                t = 0.35 if k == pk + 1 else 0.12 if k == pk else 0.05 if pk + 1 < k <= pk + 3 else -0.45
                if pv + t > bv:
                    bv, bkk = pv + t, pk
            cur[k], bk[k] = s + bv, bkk
        if len(cur) > 60:
            keep = sorted(cur.items(), key=lambda x: -x[1])[:60]
            cur = dict(keep)
            bk = {k: bk[k] for k, _ in keep}
        best.append(cur)
        back.append(bk)
    k = max(best[-1], key=best[-1].get)
    out = [None] * len(units)
    for i in range(len(units) - 1, -1, -1):
        out[i] = k
        k = back[i][k]
    return out


def overlap_score(feats_of):
    def fn(u, inv, ks):
        f = feats_of(u)
        cnt = defaultdict(int)
        for item in f:
            hit = set()
            for s in (item if isinstance(item, (set, frozenset)) else (item,)):
                hit |= inv.get(s, set())
            for k in hit:
                cnt[k] += 1
        return {k: v / ((len(f) + len(ks[k])) / 2) for k, v in cnt.items()}
    return fn


english_score = overlap_score(lambda u: set(ewords(" ".join(w for w, _ in u))))
greek_score = overlap_score(lambda u: [gloss(c) for _, c, _, _ in u if c and c not in GSTOP and gloss(c)])


def align(units, refs, kjv_v, score):
    krefs = [(int(c), i + 1) for c in sorted(kjv_v, key=int) for i in range(len(kjv_v[c]))]
    ks = [set(ewords(kjv_v[str(c)][v - 1])) for c, v in krefs]
    kpos = {r: i for i, r in enumerate(krefs)}
    asg = viterbi(units, ks, score, [kpos.get(r) for r in refs])
    return [krefs[a] for a in asg]

# ---------------------------------------------------------------- tagging the English
# words never tagged on their own (they join the next tagged word, or stay plain)
TAGSKIP = set("the a an of to in into unto upon on by with from for at shall will should would may might o".split())
LEADS = set(("the a an of to in into unto upon on by with from for at his her its their my thy your our "
             "and").split())


def tag_verse(ewords_, gwords, dice):
    """ewords_: [[word, italic]]; gwords: [[greek, code, morph, ""]] -> tokens."""
    ne, ng = len(ewords_), len(gwords)
    match = [None] * ne
    if ng:
        pairs = []
        for i, (w, it) in enumerate(ewords_):
            if it:
                continue
            core = re.sub(r"[^A-Za-z]", "", w).lower()
            if not core or core.lower() in TAGSKIP or core.lower() == "and":
                continue
            st = stem(core)
            for j, (g, c, m, _) in enumerate(gwords):
                # the article and "and" are matched only by their own words
                if not c or c == "G3588" or (c == "G2532" and core.lower() not in ("also", "even", "both")):
                    continue
                d = dice.get((st, c), 0.0)
                in_gloss = st in gloss(c)
                if not in_gloss and d < 0.15:
                    continue
                sc = d + (0.5 if in_gloss else 0.0)
                sc -= 0.4 * abs(i / max(ne - 1, 1) - j / max(ng - 1, 1))
                pairs.append((sc, i, j))
        used = set()
        for sc, i, j in sorted(pairs, reverse=True):
            if match[i] is None and j not in used and sc > 0.05:
                match[i] = j
                used.add(j)
        # "and" -> καί (G2532) by position
        kai = [j for j, g in enumerate(gwords) if g[1] == "G2532" and j not in used]
        for i, (w, it) in enumerate(ewords_):
            if match[i] is None and not it and re.sub(r"[^a-z]", "", w.lower()) == "and" and kai:
                j = min(kai, key=lambda j: abs(i / max(ne - 1, 1) - j / max(ng - 1, 1)))
                match[i] = j
                kai.remove(j)
    # small words join the tagged word right after them ("of the heaven")
    for i in range(ne - 2, -1, -1):
        w = re.sub(r"[^a-z]", "", ewords_[i][0].lower())
        if match[i] is None and not ewords_[i][1] and w in LEADS and match[i + 1] is not None \
                and not ewords_[i + 1][1] and not re.search(r"[,;:.?!]$", ewords_[i][0]):
            match[i] = match[i + 1]
    toks = []
    for i, (w, it) in enumerate(ewords_):
        j = match[i]
        if toks and j is not None and toks[-1].get("_j") == j and i > 0 and match[i - 1] == j:
            toks[-1]["t"] += " " + w
            continue
        t = {"t": w}
        if it:
            t["it"] = 1
        if j is not None:
            g, c, m, _ = gwords[j]
            t.update({"s": c, "m": m, "g": re.sub(r"[^\w]", "", g)} if m else {"s": c, "g": re.sub(r"[^\w]", "", g)})
            t["_j"] = j
        toks.append(t)
    for t in toks:
        t.pop("_j", None)
    return toks

# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--eng", default=os.path.expanduser("~/Downloads/eng-lxx2012_usfm"))
    ap.add_argument("--greek", default=os.path.expanduser("~/Downloads/LXX"))
    a = ap.parse_args()
    books = greek_books(a.greek)
    out_en = os.path.join(DATA, "bibles", "lxx")
    out_gr = os.path.join(DATA, "strongs", "lxx")
    os.makedirs(out_en, exist_ok=True)
    os.makedirs(out_gr, exist_ok=True)

    slots = {}  # n -> {(c,v): {"en": [[word,it]...], "gr": [...]}}
    for n in range(1, 40):
        kv = json.load(open(os.path.join(DATA, "bibles", "kjv-strong", f"{n}.json"), encoding="utf-8"))["v"]
        eu, er = english_units(a.eng, n)
        gu, gr = greek_units(books, n)
        S = defaultdict(lambda: {"en": [], "gr": []})
        for u, k in zip(eu, align(eu, er, kv, english_score)):
            S[k]["en"] += u
        if gu:
            for u, k in zip(gu, align(gu, gr, kv, greek_score)):
                S[k]["gr"] += u
        slots[n] = (kv, S)

    # how often an English word and a Greek number share a verse (whole OT)
    ce, cg, cp = Counter(), Counter(), Counter()
    for n, (kv, S) in slots.items():
        for s in S.values():
            es = {stem(re.sub(r"[^A-Za-z]", "", w).lower()) for w, it in s["en"] if not it} - {""}
            es = {e for e in es if e not in TAGSKIP}
            gs = {c for _, c, _, _ in s["gr"] if c}
            ce.update(es)
            cg.update(gs)
            for e in es:
                for g in gs:
                    cp[(e, g)] += 1
    dice = {k: 2 * v / (ce[k[0]] + cg[k[1]]) for k, v in cp.items() if v >= 2}

    forms = defaultdict(Counter)
    total = tagged = 0
    for n, (kv, S) in slots.items():
        en = {"b": n, "c": len(kv), "v": {}, "w": {}}
        gk = {"b": n, "w": {}}
        for c in sorted(kv, key=int):
            vs, ws, gs = [], [], []
            for v in range(1, len(kv[c]) + 1):
                s = S.get((int(c), v), {"en": [], "gr": []})
                toks = tag_verse(s["en"], s["gr"], dice) if s["en"] else []
                vs.append(" ".join(t["t"] for t in toks))
                ws.append(toks)
                gs.append(s["gr"])
                for t in toks:
                    k = len(t["t"].split())
                    total += k
                    tagged += k if t.get("s") else 0
                for w, code, _, _ in s["gr"]:
                    if code:
                        f = re.sub(r"[^\w]", "", w).lower() if w[:1].islower() else re.sub(r"[^\w]", "", w)
                        forms[code][f] += 1
            en["v"][c], en["w"][c], gk["w"][c] = vs, ws, gs
        json.dump(en, open(os.path.join(out_en, f"{n}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        body = ",\n".join(f"{json.dumps(c)}:[\n" + ",\n".join(json.dumps(x, ensure_ascii=False) for x in vv) + "\n]"
                          for c, vv in gk["w"].items())
        open(os.path.join(out_gr, f"{n}.json"), "w", encoding="utf-8").write(f'{{"b":{n},"w":{{\n{body}\n}}}}\n')
    fo = {k: sorted(v.items(), key=lambda x: -x[1]) for k, v in sorted(forms.items(), key=lambda x: int(x[0][1:]))}
    open(os.path.join(out_gr, "forms.json"), "w", encoding="utf-8").write(
        "{\n" + ",\n".join(f"{json.dumps(k)}:{json.dumps(v, ensure_ascii=False)}" for k, v in fo.items()) + "\n}\n")
    print(f"LXX: English words tagged {100 * tagged / max(total, 1):.1f}% of {total}; "
          f"{len(fo)} Greek numbers, {sum(len(v) for v in fo.values())} forms")


if __name__ == "__main__":
    main()
