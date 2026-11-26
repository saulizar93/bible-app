"""SUPERSEDED by scripts/lxx/build-lxx.py (KJV verse numbers, Strong's from Rahlfs' Greek,
Greek interlinear). Kept for reference; running it would overwrite those files.

Build the English Septuagint (Brenton, updated: eBible.org "LXX2012", Public Domain)
from its USFM files into public/data/bibles/lxx/<1-39>.json.

    python3 scripts/lxx/build-lxx2012.py "C:/Users/saulo/Downloads/eng-lxx2012_usfm"

Only the 39 books of the Old Testament are built (the apocrypha files are skipped);
the New Testament of this pane is the KJV's (data.js: ntFrom: "kjv-strong").

- Footnotes (\\f) and cross references (\\x) are dropped.
- \\add ... \\add* (words the translator supplied) and \\it are kept as italics:
  "w" holds one token per word, {"t": "is", "it": 1} for supplied words.
- Psalm titles (\\d) start verse 1, as in the LSV and YLT (without the edition's
  "(24)" Hebrew number, the psalms being renumbered to it).
- Psalms are renumbered to the Hebrew/KJV chapters the rest of the app uses
  (this edition numbers them as the Septuagint: its 9 = KJV 9-10, its 10-145 =
  KJV 11-146, its 146-147 = KJV 147); Psalm 151 is left out.
- Everything else keeps the Septuagint's own chapter and verse numbers, which differ
  from the KJV in a few places (Jeremiah 25-51 is in the Septuagint's order,
  Exodus 36-39, 1 Kings 20-21, Job 39-41, and verse breaks here and there).
- The edition marks plural "you" with ⌃ (you⌃); it is kept.
"""
import glob, json, os, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/eng-lxx2012_usfm")
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "data", "bibles", "lxx")
IDS = ("GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC "
       "SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL").split()


def parse(bid):
    path = glob.glob(os.path.join(SRC, f"*-{bid}eng-lxx2012.usfm"))[0]
    s = open(path, encoding="utf-8-sig").read()
    s = re.sub(r"\\f .*?\\f\*", " ", s, flags=re.S)
    s = re.sub(r"\\x .*?\\x\*", " ", s, flags=re.S)
    s = re.sub(r"\\vp .*?\\vp\*", " ", s, flags=re.S)  # printed verse numbers (1 Kings)
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
            # "(24) A Psalm for David": the Hebrew number in brackets goes, the psalms
            # being renumbered to it anyway
            titles[cur] = titles.get(cur, "") + re.sub(r"^\s*\(\d+\)\s*", "", t.split("\\")[0])
            mode = None
    return chs, titles


def tokens(raw):
    """USFM verse text -> (plain text, [{t, it?}]) with supplied words in italics."""
    s = raw
    s = re.sub(r"\\\+?(add|it)\*", "\u0002", s)  # end italics
    s = re.sub(r"\\\+?(add|it) ", "\u0001", s)  # start italics
    s = re.sub(r"\\[a-z0-9]+\*?", " ", s)  # every other marker (\p, \q1, \sc, \tr ...)
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
            # italics change inside a word: count the word as italic only if all of it is
            cur_it = cur_it and on
        cur += ch
    if cur:
        words.append([cur, cur_it])
    # punctuation standing alone joins the word before it
    out = []
    for w, it in words:
        if out and re.fullmatch(r"[,.;:?!)\]’”]+", w):
            out[-1][0] += w
        else:
            out.append([w, it])
    toks = [{"t": w, "it": 1} if it and re.search(r"\w", w) else {"t": w} for w, it in out]
    return " ".join(t["t"] for t in toks), toks


def psalm_map(n):
    """Septuagint psalm (as numbered in this edition) -> KJV psalm(s)."""
    if n <= 8 or n >= 148:
        return n
    if n == 9:
        return "9/10"  # split at verse 21
    if 10 <= n <= 145:
        return n + 1
    if n in (146, 147):
        return 147
    return None  # 151


def build():
    os.makedirs(OUT, exist_ok=True)
    for num, bid in enumerate(IDS, 1):
        chs, titles = parse(bid)
        verses = {}  # kjv chapter -> {verse: (text, toks)}

        def put(c, v, raw, title=None):
            text, toks = tokens(raw)
            if title:
                ttext, ttoks = tokens(title)
                text, toks = (ttext + " " + text).strip(), ttoks + toks
            verses.setdefault(c, {})[v] = (text, toks)

        for c in sorted(chs):
            for v in sorted(chs[c]):
                title = titles.get(c) if v == 1 else None
                if bid != "PSA":
                    put(c, v, chs[c][v], title)
                    continue
                m = psalm_map(c)
                if m is None:
                    continue
                if m == "9/10":
                    put(9, v, chs[c][v], title) if v <= 20 else put(10, v - 20, chs[c][v])
                elif c == 147:
                    put(147, v + 11, chs[c][v])  # LXX 147:1-9 = KJV 147:12-20
                else:
                    put(m, v, chs[c][v], title)
        last = max(verses)
        d = {"b": num, "c": last, "v": {}, "w": {}}
        for c in range(1, last + 1):
            vs = verses.get(c, {})
            top = max(vs) if vs else 0
            d["v"][str(c)] = [vs.get(v, ("", []))[0] for v in range(1, top + 1)]
            d["w"][str(c)] = [vs.get(v, ("", []))[1] for v in range(1, top + 1)]
        with open(os.path.join(OUT, f"{num}.json"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {len(IDS)} books to {OUT}")


if __name__ == "__main__":
    build()
