#!/usr/bin/env python3
"""Build the geography-quiz question bank from public datasets.
Inputs (cached in tools/cache/, fetched if missing):
  - CIA World Factbook JSON mirror (github.com/factbook/factbook.json, git clone)
  - GeoNames countryInfo.txt (ISO codes, FIPS->ISO map, continent)
  - Natural Earth 10m geography_regions_elevation_points (mountain map-click)
Deterministic: random.Random(42). Usage: python3 tools/build.py
"""
import json, re, os, random, html, subprocess, urllib.request, math
HERE=os.path.dirname(os.path.abspath(__file__)); PACK=os.path.dirname(HERE); C=os.path.join(HERE,'cache'); os.makedirs(C,exist_ok=True)
def get(url,fn):
    p=os.path.join(C,fn)
    if not os.path.exists(p): urllib.request.urlretrieve(url,p)
    return p
ci=get('https://download.geonames.org/export/dump/countryInfo.txt','countryInfo.txt')
ne=get('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_regions_elevation_points.geojson','ne_elev.geojson')
FB=os.path.join(C,'factbook.json')
if not os.path.exists(FB): subprocess.run(['git','clone','-q','--depth','1','https://github.com/factbook/factbook.json',FB],check=True)
FBCOMMIT=subprocess.run(['git','-C',FB,'log','-1','--format=%H %cI'],capture_output=True,text=True).stdout.strip()
R=random.Random(42)
def clean(t): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',t or ''))).strip()
def txt(d,*ks):
    for k in ks:
        if not isinstance(d,dict) or k not in d: return None
        d=d[k]
    return d.get('text') if isinstance(d,dict) else d
# GeoNames
gn={}
for line in open(ci,encoding='utf8'):
    if line.startswith('#'): continue
    f=line.rstrip('\n').split('\t')
    if len(f)<17: continue
    gn[f[3]]=dict(iso2=f[0],iso3=f[1],name=f[4],continent=f[8],gn_capital=f[5],neighbours=[x for x in f[17].split(',') if x])
# Disputed / special-status entities: neutral notes, and some question types skipped
NOTES={
 'TW':'Taiwan\'s political status is disputed; the People\'s Republic of China claims it. Listed here as a geographic entity, as in the CIA World Factbook and ISO 3166.',
 'XK':'Kosovo declared independence from Serbia in 2008; it is recognised by many but not all UN member states, and Serbia does not recognise it.',
 'EH':'Western Sahara\'s status is disputed (Morocco and the Polisario Front / Sahrawi Arab Democratic Republic both claim it); the UN lists it as a non-self-governing territory.',
 'PS':'ISO 3166 code PS covers the West Bank and Gaza Strip; their status and borders are disputed. The CIA World Factbook describes them as separate entries.',
 'IL':'The status of Jerusalem is disputed; many countries keep embassies in Tel Aviv. Capital questions for Israel are omitted.',
 'CY':'Since 1974 the north of the island has been administered by Turkish Cypriots (recognised only by Turkey); the Republic of Cyprus is the internationally recognised state for the whole island.',
 'BO':'Bolivia has two seats: La Paz (seat of government) and Sucre (constitutional capital).',
 'NL':'Amsterdam is the constitutional capital; the government sits in The Hague.',
 'ZA':'South Africa has three capitals: Pretoria (executive), Cape Town (legislative), Bloemfontein (judicial).',
 'GE':'Abkhazia and South Ossetia are internationally recognised as part of Georgia but are not controlled by its government.',
 'MD':'Transnistria is internationally recognised as part of Moldova but is not controlled by its government.',
 'UA':'Parts of Ukraine, including Crimea, are occupied by Russia; their annexation is not recognised by most UN member states.',
 'IN':'Some borders of India (Kashmir, Arunachal Pradesh/Aksai Chin) are disputed with Pakistan and/or China.',
 'PK':'The Kashmir region is disputed between India, Pakistan and China.',
 'CN':'Borders with India (Aksai Chin, Arunachal Pradesh) are disputed.',
 'MA':'Morocco administers most of Western Sahara, whose status is disputed.',
 'SO':'Somaliland declared independence in 1991 and is not widely recognised.',
 'SS':'The Abyei area is disputed between Sudan and South Sudan.','SD':'The Abyei area and the Hala\'ib Triangle are disputed (with South Sudan and Egypt respectively).',
}
SKIP_CAPITAL={'IL','PS','EH','BO','ZA','NL'}  # ambiguous/disputed capitals
SKIP_ALL={'AQ'}
countries=[]; srcs={}
srcs['cia-wfb']=dict(id='cia-wfb',title='The World Factbook',publisher='US Central Intelligence Agency',url='https://www.cia.gov/the-world-factbook/',type='dataset',note='Official site')
srcs['factbook-json']=dict(id='factbook-json',title='factbook.json: World Factbook country profiles in JSON',publisher='factbook project (open-data mirror of the CIA World Factbook)',url='https://github.com/factbook/factbook.json',type='dataset',note='Snapshot commit '+FBCOMMIT)
srcs['geonames-countryinfo']=dict(id='geonames-countryinfo',title='GeoNames countryInfo.txt',publisher='GeoNames',url='https://download.geonames.org/export/dump/countryInfo.txt',type='dataset',note='ISO 3166 codes, FIPS mapping, continent; CC BY 4.0')
srcs['ne-elev']=dict(id='ne-elev',title='Natural Earth 1:10m Geography regions - elevation points',publisher='Natural Earth',url='https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/',type='dataset',note='Public domain; GeoJSON from github.com/nvkelso/natural-earth-vector')
for reg in sorted(os.listdir(FB)):
    rp=os.path.join(FB,reg)
    if not os.path.isdir(rp) or reg.startswith('.') or reg in('world','oceans','meta','antarctica'): continue
    for fn in sorted(os.listdir(rp)):
        if not fn.endswith('.json'): continue
        fips=fn[:-5].upper(); g=gn.get(fips)
        if not g or g['iso2'] in SKIP_ALL: continue
        d=json.load(open(os.path.join(rp,fn)))
        gov=d.get('Government',{}); geo=d.get('Geography',{}); ps=d.get('People and Society',{})
        name=g['name']  # GeoNames English short name (consistent, ISO-aligned)
        sid='wfb-'+fn[:-5]
        srcs[sid]=dict(id=sid,title=f'World Factbook: {name}',publisher='US Central Intelligence Agency (via factbook.json)',url=f'https://github.com/factbook/factbook.json/blob/master/{reg}/{fn}',type='dataset',note='Fields: Government, Geography, People and Society')
        cap=clean(txt(gov,'Capital','name')); capc=clean(txt(gov,'Capital','geographic coordinates'))
        m=re.match(r'(\d+) (\d+) ([NS]), (\d+) (\d+) ([EW])',capc or '')
        latlon=None
        if m:
            la=int(m[1])+int(m[2])/60; lo=int(m[4])+int(m[5])/60
            latlon=(round(la*(1 if m[3]=='N' else -1),3),round(lo*(1 if m[6]=='E' else -1),3))
        flag=clean(txt(gov,'Flag'))
        fm=re.search(r'description:\s*(.*?)(?:\s*history:|$)',flag); flag=fm[1].strip() if fm else (flag or None)
        bord=clean(txt(geo,'Land boundaries','border countries'))
        pop=clean(txt(ps,'Population','total'))
        pm=re.match(r'([\d,]+)\s*\((\w*\s*\d{4}) est',pop or ''); popn=int(pm[1].replace(',','')) if pm else None; popy=pm[2] if pm else None
        hp=clean(txt(geo,'Elevation','highest point'))
        riv=clean(txt(geo,'Major rivers (by length in km)'))
        countries.append(dict(iso2=g['iso2'],iso3=g['iso3'],fips=fips,name=name,continent=g['continent'],capital=cap,capital_latlon=latlon,flag=flag,borders=bord,population=popn,pop_year=popy,highest=hp,rivers=riv,neighbours=g['neighbours'],src=sid))
byiso={c['iso2']:c for c in countries}
# only keep entities in ISO list with a capital and population (sovereign states + major territories)
def rivname(t):
    t=t.split(' - ')[0]
    m=re.match(r'^([^()]+?)\s*\(([A-Z][^()]*?)\)',t)  # 'Rhin (Rhine)' -> Rhine
    n=m[2] if m and not m[2].startswith('shared') else re.sub(r'\s*\(.*?\)\s*','',t)
    n=re.sub(r'\s*river (mouth|source).*$','',n.strip()).strip()
    return n
Q=[]; qid=0
def diff(c):
    ranks=sorted([x for x in countries if x['population']],key=lambda x:-x['population'])
    r=[x['iso2'] for x in ranks].index(c['iso2']) if c['population'] else 999
    return 'easy' if r<40 else 'medium' if r<120 else 'hard'
DIFF={c['iso2']:diff(c) for c in countries}
def add(type_,c,prompt,answer,distractors=None,extra=None,sources=None,difficulty=None):
    global qid; qid+=1
    q=dict(id=f'q{qid:05d}',type=type_,prompt=prompt,answer=answer,difficulty=difficulty or DIFF[c['iso2']],country_iso2=c['iso2'],sources=sources or [c['src']])
    if distractors: q['distractors']=distractors
    if extra: q.update(extra)
    if c['iso2'] in NOTES: q['note']=NOTES[c['iso2']]
    Q.append(q)
def pick(pool,k,excl):
    pool=[p for p in dict.fromkeys(pool) if p and p not in excl]; R.shuffle(pool); return pool[:k]
def okcap(c): return c['capital'] and c['capital'].lower() not in('none','no official capital') and c['iso2'] not in SKIP_CAPITAL and ';' not in c['capital'] and len(c['capital'])<40
caps=[c for c in countries if okcap(c)]
for c in caps:
    same=[x['capital'] for x in caps if x['continent']==c['continent']]
    add('capital',c,f"What is the capital of {c['name']}?",c['capital'],pick(same,3,{c['capital']}))
    samen=[x['name'] for x in caps if x['continent']==c['continent']]
    add('capital_reverse',c,f"{c['capital']} is the capital of which country or territory?",c['name'],pick(samen,3,{c['name']}))
    if c['capital_latlon']:
        t={'easy':300,'medium':200,'hard':150}[DIFF[c['iso2']]]
        add('map_click',c,f"Click on {c['capital']}, capital of {c['name']}.",c['capital'],extra=dict(lat=c['capital_latlon'][0],lon=c['capital_latlon'][1],tolerance_km=t))
for c in countries:
    if c['flag'] and len(c['flag'])>15 and not any(w.lower() in c['flag'].lower() for w in [c['name']]+c['name'].split()[:1] if len(w)>3):
        same=[x['name'] for x in countries if x['continent']==c['continent']]
        add('flag',c,f"Which country or territory has this flag: \"{c['flag']}\"?",c['name'],pick(same,3,{c['name']}),extra=dict(answer_iso2=c['iso2'],flag_image_hint=f"Render from ISO code {c['iso2']} with an open flag set, e.g. flag-icons (MIT)"))
nbset={}
for c in countries:
    if c['borders'] and c['borders'].lower()!='none':
        parts=[p.strip() for p in re.split(r';',c['borders']) if p.strip()]
        names=[re.sub(r'\s*[\d,.]+\s*km.*$','',p).strip() for p in parts]
        names=[n for n in names if n and len(n)<45]
        if not names: continue
        nbset[c['iso2']]=names
        if len(names)<=14: add('border_count',c,f"How many countries or territories share a land border with {c['name']}?",str(len(names)),extra=dict(explanation='Border countries: '+'; '.join(parts)))
        tgt=R.choice(names)
        others=[x['name'] for x in countries if x['continent']==c['continent'] and x['name'] not in names and x['iso2']!=c['iso2']]
        add('border',c,f"Which of these shares a land border with {c['name']}?",tgt,pick(others,3,{tgt}),extra=dict(explanation='Border countries: '+'; '.join(parts)))
    elif c['borders'] and c['borders'].lower()=='none':
        pass
popc=[c for c in countries if c['population'] and c['population']>50000]
for c in popc:
    others=[x for x in popc if x['continent']==c['continent'] and x['iso2']!=c['iso2']]
    if not others: continue
    o=R.choice(others); big=c if c['population']>o['population'] else o
    if abs(c['population']-o['population'])/max(c['population'],o['population'])<0.1: continue
    add('population_compare',c,f"Which has the larger population: {c['name']} or {o['name']}?",big['name'],[o['name'] if big is c else c['name']],extra=dict(explanation=f"{c['name']}: {c['population']:,} ({c['pop_year']} est.); {o['name']}: {o['population']:,} ({o['pop_year']} est.)",country2_iso2=o['iso2']),sources=[c['src'],o['src']])
for c in popc:
    p=c['population']; band=['under 1 million','1-10 million','10-50 million','50-100 million','over 100 million']
    b=0 if p<1e6 else 1 if p<1e7 else 2 if p<5e7 else 3 if p<1e8 else 4
    if c['population']>0: add('population_band',c,f"Roughly how many people live in {c['name']}?",band[b],[x for i,x in enumerate(band) if i!=b][:3],extra=dict(explanation=f"{p:,} ({c['pop_year']} est., CIA World Factbook)"))
for c in countries:
    hp=c['highest']
    if hp:
        m=re.match(r'(.+?)\s+(-?[\d,]+)\s*(m)?\s*$',hp)
        if m and len(m[1])<50:
            peak=m[1].strip(); el=int(m[2].replace(',',''))
            others=[re.match(r'(.+?)\s+-?[\d,]+',x['highest'])[1].strip() for x in countries if x['highest'] and x['continent']==c['continent'] and re.match(r'(.+?)\s+-?[\d,]+',x['highest'])]
            add('highest_point',c,f"What is the highest point in {c['name']}?",peak,pick(others,3,{peak}),extra=dict(explanation=f"{peak}, {el:,} m (CIA World Factbook)"))
for c in countries:
    rv=c['rivers']
    if rv and 'km' in rv:
        rv=rv.split(' note:')[0]
        items=[x.strip() for x in rv.split(';') if 'km' in x]
        first=items[0] if items else None
        if first:
            rname=rivname(first)
            m=re.search(r'([\d,]+)\s*km',first)
            if rname and m and len(rname)<40:
                pool=[]
                for x in countries:
                    if x['rivers'] and 'km' in x['rivers'] and x['continent']!=c['continent']:
                        n=rivname(x['rivers'].split(';')[0])
                        if n and len(n)<40 and n.lower() not in c['rivers'].lower(): pool.append(n)
                add('river',c,f"Which of these major rivers flows through {c['name']}?",rname,pick(pool,3,{rname}),extra=dict(explanation=f"Factbook 'Major rivers' (length is for the whole river): {first}"))
# Mountains map-click from Natural Earth
mt=[f['properties'] for f in json.load(open(ne))['features'] if f['properties']['featurecla']=='mountain' and f['properties'].get('elevation')]
mt=sorted(mt,key=lambda p:-p['elevation'])[:150]
for p in mt:
    qid+=1; nm=p.get('name_en') or p['name']
    Q.append(dict(id=f'q{qid:05d}',type='map_click',prompt=f"Click on {nm} ({p['elevation']:,} m, {p.get('region') or 'world'}).",answer=nm,lat=round(p['lat_y'],4),lon=round(p['long_x'],4),tolerance_km=150 if p['scalerank']<=4 else 100,difficulty='easy' if p['scalerank']<=2 else 'medium' if p['scalerank']<=5 else 'hard',sources=['ne-elev'],note='Elevation is as given by Natural Earth label data; national surveys may differ by a few metres.'))
used={s for q in Q for s in q['sources']}|{'geonames-countryinfo','factbook-json','cia-wfb'}
for q in Q:
    if q['type']!='map_click' or 'country_iso2' in q:
        if 'country_iso2' in q: q['sources']=q['sources']+['geonames-countryinfo'] if 'geonames-countryinfo' not in q['sources'] and q['type'] in('flag',) else q['sources']
for q in Q:
    if q['sources'][0].startswith('wfb-'): q['sources']=q['sources']+['cia-wfb','factbook-json']
S=[s for k,s in srcs.items() if k in used]
countries_out=[{k:c[k] for k in('iso2','iso3','name','continent','capital','capital_latlon','population','pop_year')}|dict(sources=[c['src'],'geonames-countryinfo'],**({'note':NOTES[c['iso2']]} if c['iso2'] in NOTES else {})) for c in countries]
out=dict(schema_version='1.0',generated_by='tools/build.py',factbook_snapshot=FBCOMMIT,counts={},entities=countries_out,questions=Q)
from collections import Counter
out['counts']=dict(total=len(Q),by_type=dict(Counter(q['type'] for q in Q)),by_difficulty=dict(Counter(q['difficulty'] for q in Q)),entities=len(countries_out))
json.dump(out,open(os.path.join(PACK,'content.json'),'w'),ensure_ascii=False,indent=1)
json.dump(S,open(os.path.join(PACK,'sources.json'),'w'),ensure_ascii=False,indent=1)
print(json.dumps(out['counts'],indent=1))
