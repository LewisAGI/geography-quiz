#!/usr/bin/env python3
"""Validate a content pack: valid JSON, every sources[] id resolves, no unused sources, no duplicate ids,
every fact-bearing object (has 'sources' key) has >=1 source. Usage: validate.py <pack_dir>"""
import json,sys,os,collections
p=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C=json.load(open(os.path.join(p,'content.json'))); S=json.load(open(os.path.join(p,'sources.json')))
sids=[s['id'] for s in S]; err=[]
for k,v in collections.Counter(sids).items():
    if v>1: err.append(f'duplicate source id {k}')
for s in S:
    if not s.get('url'): err.append(f'source {s["id"]} has no url')
ids=[];refs=collections.Counter();n=0
def walk(o,path):
    global n
    if isinstance(o,dict):
        if 'id' in o and isinstance(o['id'],str): ids.append(o['id'])
        if 'sources' in o:
            n+=1
            if not o['sources']: err.append(f'empty sources at {path}')
            for r in o['sources']:
                refs[r]+=1
                if r not in sids: err.append(f'unresolved {r} at {path}')
        for k,v in o.items(): walk(v,path+'.'+k)
    elif isinstance(o,list):
        for i,v in enumerate(o): walk(v,f'{path}[{i}]')
walk(C,'$')
for k,v in collections.Counter(ids).items():
    if v>1: err.append(f'duplicate content id {k}')
for s in sids:
    if s not in refs: err.append(f'unused source {s}')
print(f'{p}: {n} sourced objects, {len(set(ids))} ids, {len(sids)} sources, {len(err)} errors')
for e in err[:50]: print(' -',e)
sys.exit(1 if err else 0)
