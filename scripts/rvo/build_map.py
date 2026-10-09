import json,os
W=os.path.expanduser('~/work/')
d=json.load(open(W+'names_split.json'))
EXCLUDE=set('''Israelitas Egipcios Asirios Moabitas Siros Amalecitas Asirio Madianitas Hase Siro Caldeos Cireneo Olivas Salinas Caminos Poco Tomadas
Imnaitas Ciprios Cyprio Cirenenses Macedonios Galaaditas Medo Kir-moab Bicath-aven Beth-baal Déos Yared Athanai Sami Aia Ava Ahíe Dadai Persas
Michêas Zarahi Lasarón Abiga-baón Jehudas Aía Egipcio Omnipotente Hus'''.split())
ALLOW_LOWSIM=set('''Salphaad Phul Ahaz Isaía Ragüel Phegiel Izreel Sephor Selmo Idida Nabajoth Epho Zip Rimmono Abiasath Tou Hurí Puá Maleleel
Accarón Axaph Hucuca Ailón Gibeón Cesión Put Lut Sarona'''.split())
m={}
for old,new,k,tot,sim in d['accept']:
  if old in EXCLUDE: continue
  if sim<0.75 and old not in ALLOW_LOWSIM: continue
  m[old]=new
# accepted from the ambiguous list (majority reading is a pure spelling update)
for old,new in [('Chîriath-jearim','Quiriat-jearim'),('Succoth','Sucot'),('Beth-aven','Bet-avén'),('Beeroth','Beerot'),('Jedaía','Jedaías'),
  ('Mathithías','Matatías'),('Jeus','Jeús'),('Jeremoth','Jeremot'),('Abiasaph','Ebiasaf'),('Zachâi','Zacai'),('Esar-hadón','Esar-hadón'),
  ('Michâía','Micaías'),('Reseph','Resef'),('Sephi','Sefo'),('Zethán','Zetán'),('Phut','Fut'),('Zithri','Zitri'),('Ariph','Harif'),
  # explicit requests / obvious ones the similarity filter rejected
  ('Jessé','Isaí'),('Bath-sheba','Betsabé'),('Axa','Acsa'),('Gaulón','Golán'),('Enech','Hanoc'),('Ehud','Aod'),('Michêas','Miqueas')]:
  if old!=new: m[old]=new
m['Beth-aven']='Betaven'
json.dump(m,open(W+'name_map.json','w'),ensure_ascii=False,indent=1,sort_keys=True)
print(len(m))
