"""Add notes defining archaic KJV words to scripts/correcciones/correcciones.json
(kjv-strong -> notes), one book at a time. Then run aplicar.py.

    python3 scripts/correcciones/arcaismos_kjv.py Matthew
    python3 scripts/correcciones/aplicar.py

To drop a word, delete its line from GLOSSARY (or OVERRIDE) and run both again:
this script takes its earlier notes off that book first, so removed words lose
their notes.

GLOSSARY: words noted wherever they occur. CONTEXT: words noted only in the verses
listed in OVERRIDE (their meaning there is archaic, elsewhere it is modern), or
with a different definition in that verse. Common grammar forms (thee, thou, ye,
thy, hath, doth, -eth/-est verbs, unto) are not noted.
Each verse gets one note per token; several words in one token share it. Notes
written by hand (not in the "word: definition." form) are kept when re-running.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

GLOSSARY = {
    # time, place, manner
    'afar': 'far away ("afar off" = at a distance)',
    'alway': 'always',
    'anon': 'at once, immediately',
    'forthwith': 'immediately',
    'straightway': 'immediately',
    'presently': 'immediately, at once (not "soon")',
    'hence': 'from here', 'henceforth': 'from now on', 'henceforward': 'from now on',
    'thenceforth': 'from that time on',
    'hither': 'here, to this place', 'thither': 'there, to that place',
    'thence': 'from there', 'whence': 'from where',
    'nigh': 'near',
    'morrow': 'the next day, tomorrow',
    'twain': 'two', 'thrice': 'three times',
    'asunder': 'apart',
    'whiles': 'while',
    'whithersoever': 'wherever', 'wheresoever': 'wherever',
    'whoso': 'whoever',
    'wherein': 'in which',
    'whereunto': 'to what ("whereunto shall I liken" = to what shall I compare)',
    'whereupon': 'upon which, after which',
    'wherewith': 'with what', 'wherewithal': 'with what',
    'thereat': 'by it, through it', 'therein': 'in it', 'thereof': 'of it',
    'thereon': 'on it', 'hereof': 'of this',
    'forasmuch': 'since, because ("forasmuch as" = since)',
    'inasmuch': 'to the extent that ("inasmuch as" = in so far as)',
    'insomuch': 'so much so (that)',
    'howbeit': 'however, nevertheless',
    'lest': 'so that … not; for fear that',
    'selfsame': 'very same',
    'throughly': 'thoroughly, completely',
    'privily': 'secretly, privately',
    'straitly': 'strictly, sternly',
    'strait': 'narrow',
    'exceeding': 'extremely, very great',
    'sore': 'greatly, severely',
    'despitefully': 'with malice, spitefully',
    'spitefully': 'shamefully, with insult',
    'grievous': 'heavy, burdensome; severe',
    'grievously': 'severely, terribly',
    'verily': 'truly (Greek amēn)',
    'nay': 'no', 'yea': 'yes; indeed',
    'lo': 'look! see!', 'behold': 'look! see!',
    # verbs (old forms)
    'spake': 'spoke', 'brake': 'broke', 'bade': 'told, commanded; invited',
    'bare': 'carried, bore',
    'forbad': 'forbade, hindered', 'slew': 'killed',
    'smote': 'struck', 'smite': 'strike', 'wrought': 'worked, did, performed',
    'durst': 'dared', 'crew': 'crowed',
    'shew': 'show', 'shewed': 'showed', 'sheweth': 'shows',
    'besought': 'begged, pleaded with', 'beseeching': 'begging, pleading with',
    'wax': 'grow, become', 'waxed': 'grew, became',
    'tarry': 'stay, remain; wait', 'tarried': 'delayed; stayed',
    'rend': 'tear', 'rent': 'tore, torn',
    'abode': 'stayed, remained',
    'dureth': 'lasts, endures',
    'listed': 'wanted ("as they listed" = as they pleased)',
    'wont': 'accustomed, in the habit',
    'minded': 'intended, planned',
    'marvelled': 'were amazed',
    'liken': 'compare', 'likened': 'compared',
    'mete': 'measure out',
    'sever': 'separate',
    'salute': 'greet',
    'cleave': 'cling, hold fast',
    'upbraid': 'reproach, rebuke',
    'adjure': 'charge under oath, solemnly command',
    'forswear': 'swear falsely, break an oath',
    'covenanted': 'agreed, bargained',
    'bewrayeth': 'betrays, gives away',
    'buffeted': 'struck with the fists',
    'entreated': 'treated (here, mistreated)',
    'constrained': 'made, compelled',
    'arrayed': 'clothed, dressed',
    'befallen': 'happened (to)',
    'compass': 'travel around, go over',
    'sue': 'take to court',
    'tithe': 'give a tenth',
    'garnish': 'decorate, adorn', 'garnished': 'decorated, put in order',
    'hedged': 'fenced in, surrounded with a hedge',
    'hewn': 'cut (down, or out of rock)',
    'platted': 'braided, woven',
    'strawed': 'scattered, spread',
    'piped': 'played the flute',
    'trimmed': 'prepared (trimmed the wicks of)',
    'sanctifieth': 'makes holy, sets apart',
    'hungred': 'hungry ("an hungred" = hungry)',
    'hungered': 'was hungry',
    'athirst': 'thirsty',
    'offend': 'cause to stumble, cause to sin (Greek skandalizō)',
    'offended': 'caused to stumble; took offence (would not accept him)',
    'offence': 'cause of stumbling, snare', 'offences': 'causes of stumbling, snares',
    'heed': 'attention ("take heed" = be careful, watch out)',
    'cheer': 'courage ("be of good cheer" = take courage)',
    # people
    'brethren': 'brothers (also: fellow believers)',
    'damsel': 'girl, young woman; servant girl',
    'espoused': 'engaged, betrothed (legally pledged in marriage)',
    'goodman': 'master (of the house)',
    'husbandmen': 'farmers; here, tenant farmers working a vineyard',
    'publican': 'tax collector (for Rome)', 'publicans': 'tax collectors (for Rome)',
    'heathen': 'Gentiles, pagans (non-Jews)',
    'proselyte': 'a convert (to Judaism)',
    'tetrarch': 'ruler of part of a province (originally a fourth part)',
    'minstrels': 'musicians (here, flute players hired for mourning)',
    'exchangers': 'bankers, moneychangers',
    'winebibber': 'drunkard, heavy drinker of wine',
    'sucklings': 'nursing infants',
    'dumb': 'unable to speak, mute',
    'halt': 'lame, crippled',
    'lunatick': 'epileptic (Greek selēniazomai, "moon-struck")',
    'palsy': 'paralysis ("sick of the palsy" = paralyzed)',
    'devils': 'demons, evil spirits (Greek daimonia), not "the devil" (diabolos)',
    'ghost': 'spirit ("Holy Ghost" = Holy Spirit; "gave/yielded up the ghost" = died)',
    # things
    'raiment': 'clothing', 'vesture': 'clothing, garment',
    'cloke': 'cloak, outer robe', 'girdle': 'belt (of leather or cloth)',
    'hem': 'edge, fringe (the tassel of the garment)',
    'scrip': "traveller's bag", 'staves': 'staffs, clubs',
    'charger': 'large platter', 'bottles': 'wineskins (leather bags)',
    'candle': 'oil lamp', 'candlestick': 'lampstand',
    'bushel': 'a basket or bowl for measuring grain',
    'closet': 'inner, private room',
    'draught': 'latrine, sewer',
    'garner': 'granary, barn',
    'fan': 'winnowing fork, for tossing grain so the wind blows the chaff away',
    'mote': 'speck, tiny splinter', 'beam': 'plank, log',
    'cubit': 'about 18 inches (45 cm), the length of a forearm',
    'jot': 'yod, the smallest letter of the Hebrew alphabet',
    'tittle': 'a tiny stroke that tells one Hebrew letter from another',
    'raca': 'Aramaic insult: "empty-head", "good-for-nothing"',
    'mammon': 'wealth, riches (Aramaic)',
    'tares': 'darnel, a weed that looks like wheat while it grows',
    'anise': 'dill', 'cummin': 'a small aromatic seed used as spice',
    'phylacteries': 'small leather boxes holding Scripture verses, worn on the forehead and arm',
    'usury': 'interest (on money lent)',
    'fatlings': 'fattened animals', 'victuals': 'food, provisions',
    'meat': 'food of any kind ("sat at meat" = reclined at a meal)',
    'meal': 'flour, ground grain',
    'corn': 'grain (wheat or barley), not maize',
    'leaven': 'yeast',
    'fowls': 'birds',
    'ass': 'donkey', 'swine': 'pigs', 'cock': 'rooster',
    'eagles': 'probably vultures (Greek aetos), which gather over a carcass',
    'whale': 'a great sea creature, a huge fish (Greek kētos)',
    'ship': 'boat',
    'coasts': 'borders, region, territory (not necessarily by the sea)',
    'fame': 'report, news (about him)',
    'sepulchre': 'tomb', 'sepulchres': 'tombs', 'whited': 'whitewashed',
    'carcase': 'dead body',
    'penny': 'denarius, a Roman silver coin, a day’s wage for a labourer',
    'pence': 'denarii (plural of penny), Roman silver coins, each a day’s wage',
    'farthing': 'the smallest copper coin',
    'talent': 'a very large sum (about 6,000 denarii, some 20 years’ wages)',
    'talents': 'very large sums (each about 6,000 denarii, some 20 years’ wages)',
    'tribute': 'tax (paid to a ruler)',
    'custom': 'toll, tax',
    'receipt': 'place of receiving ("receipt of custom" = tax booth)',
    'alms': 'gifts to the poor, charity',
    'sackcloth': 'coarse cloth worn in mourning or repentance',
    'tabernacles': 'tents, shelters',
    'shewbread': 'showbread: the consecrated bread set before God in the tabernacle and temple',
    'hosanna': '"Save, we pray" (Hebrew), a cry of praise',
    'superscription': 'inscription',
    'divorcement': 'divorce',
    'remission': 'forgiveness, release',
    'regeneration': 'the renewal of all things (the new creation)',
    'pestilences': 'plagues, epidemics',
    'subtilty': 'cunning, trickery',
    'countenance': 'face, expression',
    'communication': 'speech, what you say',
    'variance': 'conflict ("set at variance" = turn against)',
    'hire': 'wages, pay', 'spoil': 'plunder',
    'deepness': 'depth', 'lowring': 'overcast, dark and threatening',
    'divers': 'various, of different kinds',
    'plenteous': 'plentiful',
    'laden': 'loaded, weighed down', 'leathern': 'made of leather',
    'unwashen': 'unwashed',
    'goodly': 'fine, beautiful, valuable',
    'gross': 'dull, insensitive (literally "thick, fat")',
    'hallowed': 'held holy, honoured as holy',
    'harmless': 'innocent, pure',
    'ravening': 'ravenous, greedy for prey',
    'savour': 'flavour, taste',
    'savourest': 'set your mind on ("thou savourest not" = you are not thinking of)',
    'uppermost': 'highest, most honoured',
    'uttermost': 'very last',
    'vexed': 'tormented, afflicted',
    'suck': 'nurse, breast-feed ("give suck")',
}

# Words noted only where OVERRIDE lists them. 'devil' is "the devil" (diabolos)
# except where the Greek is daimonion (a demon).
CONTEXT = {'meet', 'borders', 'suffer', 'suffered', 'thought', 'watch', 'room', 'rooms',
           'ear', 'ears', 'idle', 'debtor', 'ought', 'let', 'generation', 'palace', 'hall',
           'band', 'fellows', 'evil', 'repented', 'canaanite', 'issue', 'flax', 'strain',
           'council', 'corrupt', 'prevented', 'single', 'away', 'devil'}

ALLOW = 'allow, permit'
NO_THOUGHT = '"take no thought" = do not be anxious, do not worry'
DEMON = 'demon, evil spirit (Greek daimonion)'
DIVORCE = '"put away" = divorce'
OVERRIDE = {
    'Matthew': {
        (1, 1): {'generation': 'family history, record of ancestry'},
        (1, 19): {'away': DIVORCE},
        (2, 22): {'room': '"in the room of" = in place of'},
        (3, 7): {'generation': 'brood, offspring'},
        (3, 8): {'meet': 'fitting, proper'},
        (3, 15): {'suffer': ALLOW, 'suffered': 'allowed'},
        (5, 22): {'council': 'the Sanhedrin, the Jewish high court'},
        (5, 23): {'ought': 'anything (= aught)'},
        (5, 31): {'away': DIVORCE},
        (5, 32): {'away': DIVORCE},
        (6, 19): {'corrupt': 'destroy, consume'},
        (6, 20): {'corrupt': 'destroy, consume'},
        (6, 22): {'single': 'healthy, clear (an eye that sees well); undivided'},
        (6, 25): {'thought': NO_THOUGHT},
        (6, 27): {'thought': 'anxious thought, worry'},
        (6, 28): {'thought': '"take thought" = be anxious, worry'},
        (6, 31): {'thought': NO_THOUGHT},
        (6, 34): {'thought': NO_THOUGHT},
        (7, 17): {'corrupt': 'rotten, bad'},
        (7, 18): {'corrupt': 'rotten, bad'},
        (8, 21): {'suffer': ALLOW},
        (8, 31): {'suffer': ALLOW},
        (9, 20): {'issue': 'flow; "issue of blood" = bleeding, hemorrhage'},
        (9, 32): {'devil': DEMON},
        (9, 33): {'devil': DEMON},
        (10, 4): {'canaanite': 'Zealot (from Aramaic qanʼan, "zealous"), not a native of Canaan'},
        (10, 19): {'thought': NO_THOUGHT},
        (11, 16): {'fellows': 'companions, playmates'},
        (11, 18): {'devil': DEMON},
        (12, 1): {'ears': 'heads (of grain)'},
        (12, 14): {'council': '"held a council" = plotted together'},
        (12, 20): {'flax': '"smoking flax" = a smouldering lamp wick'},
        (12, 22): {'devil': DEMON},
        (12, 33): {'corrupt': 'rotten, bad'},
        (12, 34): {'generation': 'brood, offspring'},
        (12, 36): {'idle': 'careless, useless'},
        (14, 25): {'watch': 'a division of the night; the fourth watch = about 3 to 6 a.m.'},
        (15, 22): {'devil': DEMON},
        (15, 26): {'meet': 'fitting, proper'},
        (17, 17): {'suffer': 'bear with, put up with'},
        (17, 18): {'devil': DEMON},
        (17, 25): {'prevented': 'spoke first to, anticipated'},
        (19, 3): {'away': DIVORCE},
        (19, 7): {'away': DIVORCE},
        (19, 8): {'suffered': 'allowed', 'away': DIVORCE},
        (19, 9): {'away': DIVORCE},
        (19, 14): {'suffer': ALLOW},
        (20, 15): {'evil': '"is thine eye evil" = are you envious, begrudging'},
        (21, 3): {'ought': 'anything (= aught)'},
        (21, 29): {'repented': 'changed his mind, regretted it'},
        (21, 32): {'repented': 'changed your minds'},
        (21, 33): {'let': '"let it out" = rented it out, leased it'},
        (21, 41): {'let': '"let out" = rent out, lease'},
        (22, 25): {'issue': 'offspring, children'},
        (23, 5): {'borders': 'tassels, fringes (on the corners of the garment)'},
        (23, 6): {'rooms': 'places, seats (of honour)'},
        (23, 13): {'suffer': ALLOW},
        (23, 16): {'debtor': 'bound (by his oath)'},
        (23, 24): {'strain': '"strain at a gnat" = strain out a gnat (filter it from a drink)'},
        (23, 33): {'generation': 'brood, offspring'},
        (24, 43): {'watch': 'a division of the night', 'suffered': 'allowed'},
        (26, 3): {'palace': 'courtyard, residence'},
        (26, 58): {'palace': 'courtyard, residence'},
        (26, 59): {'council': 'the Sanhedrin, the Jewish high court'},
        (26, 69): {'palace': 'courtyard'},
        (27, 3): {'repented': '"repented himself" = was seized with remorse, regretted it'},
        (27, 27): {'hall': '"common hall" = the praetorium, the governor’s headquarters',
                   'band': 'cohort, a unit of Roman soldiers (up to 600 men)'},
        (27, 49): {'let': '"let be" = leave him alone, wait'},
        (27, 65): {'watch': 'guard (of soldiers)'},
        (27, 66): {'watch': 'guard (of soldiers)'},
        (28, 11): {'watch': 'guard (of soldiers)'},
    },
}

PUNCT = '.,;:?!()“”"‘’\'—-'

def norm(w):
    w = re.sub(r"[’']s$", '', w.strip(PUNCT))
    return w.lower()

def wherefore_def(text, at):
    end = re.search(r'[.?!:;]', text[at:])
    return 'why' if end and end.group(0) == '?' else 'therefore, for this reason'

def notes_for_book(book):
    books = open(os.path.join(ROOT, 'src', 'js', 'books.js'), encoding='utf-8').read()
    lines = re.search(r'PACKED = `(.*?)`', books, re.S).group(1).strip().splitlines()
    no = next(i for i, l in enumerate(lines, 1)
              if book.lower() in (l.split('|')[1].lower(), l.split('|')[2].lower()))
    en = lines[no - 1].split('|')[1]
    d = json.load(open(os.path.join(ROOT, 'public', 'data', 'bibles', 'kjv-strong', f'{no}.json'),
                       encoding='utf-8'))
    over = OVERRIDE.get(en, {})
    out = {}
    for ch, vv in d['w'].items():
        for i, toks in enumerate(vv):
            text = d['v'][ch][i]
            ov = over.get((int(ch), i + 1), {})
            seen, notes, pos = set(), {}, 0
            for t in toks:
                key, parts = None, []
                for raw in t['t'].split(' '):
                    w = norm(raw)
                    at = text.find(raw, pos)
                    if at >= 0:
                        pos = at + len(raw)
                    if not w or w in seen:
                        continue
                    if w in ov:
                        df = ov[w]
                    elif w == 'wherefore':
                        df = wherefore_def(text, max(at, 0))
                    elif w in CONTEXT:
                        continue
                    else:
                        df = GLOSSARY.get(w)
                    if not df:
                        continue
                    seen.add(w)
                    key = key or raw
                    parts.append(f'{w}: {df}.')
                if parts:
                    notes[key] = ' '.join(parts)
            if notes:
                out[f'{en} {ch}:{i + 1}'] = notes
    return en, out

def main():
    if len(sys.argv) < 2:
        sys.exit('usage: arcaismos_kjv.py <Book>')
    en, new = notes_for_book(' '.join(sys.argv[1:]))
    path = os.path.join(HERE, 'correcciones.json')
    cfg = json.load(open(path, encoding='utf-8'))
    notes = cfg.setdefault('kjv-strong', {}).setdefault('notes', {})
    # drop this script's earlier notes for the book (hand-written ones stay)
    for ref in [r for r in notes if r.startswith(en + ' ')]:
        notes[ref] = {k: v for k, v in notes[ref].items() if not re.match(r'^[a-z]+: ', v)}
        if not notes[ref]:
            del notes[ref]
    for ref, items in new.items():
        notes.setdefault(ref, {}).update(items)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
        f.write('\n')
    # aplicar.py only adds notes, so take this script's old notes off the Bible's
    # words first; aplicar.py then puts back the ones still in the list.
    sys.path.insert(0, HERE)
    sys.dont_write_bytecode = True
    from aplicar import dump_like, BOOK_NO
    bp = os.path.join(ROOT, 'public', 'data', 'bibles', 'kjv-strong', f'{BOOK_NO[en.lower()]}.json')
    raw = open(bp, encoding='utf-8', newline='').read()
    d = json.loads(raw)
    removed = 0
    for vv in d['w'].values():
        for toks in vv:
            for t in toks:
                if re.match(r'^[a-z]+: ', t.get('n', '')):
                    del t['n']
                    removed += 1
    if removed:
        open(bp, 'w', encoding='utf-8', newline='').write(dump_like(d, raw))
        print(f'{removed} old notes taken off kjv-strong; now run aplicar.py')
    print(f'{en}: {sum(len(v) for v in new.values())} notes in {len(new)} verses')

if __name__ == '__main__':
    main()
