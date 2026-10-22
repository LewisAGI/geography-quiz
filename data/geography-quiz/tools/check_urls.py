#!/usr/bin/env python3
"""Fetch every source URL (and resolve DOIs on Crossref); write tools/url_check.json. Usage: check_urls.py <pack_dir>"""
import json,sys,os,subprocess,concurrent.futures as cf,datetime
p=sys.argv[1]; S=json.load(open(os.path.join(p,'sources.json')))
def chk(s):
    r={'id':s['id']}
    code=subprocess.run(['curl','-sL','-o','/dev/null','-w','%{http_code}','-A','Mozilla/5.0 (X11; Linux x86_64) research-check','--max-time','25',s['url']],capture_output=True,text=True).stdout
    r['url_status']=code
    if s.get('doi'):
        c=subprocess.run(['curl','-s','-o','/tmp/cr_'+s['id'],'-w','%{http_code}','--max-time','25','https://api.crossref.org/works/'+s['doi']],capture_output=True,text=True).stdout
        r['crossref_status']=c
        if c=='200':
            try: m=json.load(open('/tmp/cr_'+s['id']))['message']; r['crossref_title']=(m.get('title') or [''])[0]; r['crossref_year']=(m.get('issued',{}).get('date-parts') or [[None]])[0][0]
            except Exception as e: r['crossref_err']=str(e)
    return r
with cf.ThreadPoolExecutor(12) as ex: res=list(ex.map(chk,S))
out=dict(checked_at=datetime.datetime.now().astimezone().isoformat(timespec='minutes'),results=res)
json.dump(out,open(os.path.join(p,'tools','url_check.json'),'w'),indent=1,ensure_ascii=False)
bad=[r for r in res if r['url_status']!='200' or r.get('crossref_status') not in (None,'200')]
print(len(res),'checked;',len(bad),'not 200'); [print(' ',r) for r in bad]
