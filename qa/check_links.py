#!/usr/bin/env python3
import re, urllib.request, urllib.parse
from html.parser import HTMLParser

BASES = [
    "https://vexaro-website.vexaro241.workers.dev/",
    "https://vexaro-members.vexaro241.workers.dev/",
    "https://vexaro-admin.vexaro241.workers.dev/",
]
SEEDS = [
    "https://vexaro-website.vexaro241.workers.dev/",
    "https://vexaro-members.vexaro241.workers.dev/",
    "https://vexaro-members.vexaro241.workers.dev/community.html",
    "https://vexaro-members.vexaro241.workers.dev/settings.html",
    "https://vexaro-members.vexaro241.workers.dev/notifications.html",
    "https://vexaro-admin.vexaro241.workers.dev/",
]
class P(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]
    def handle_starttag(self, tag, attrs):
        if tag.lower()=="a":
            d=dict(attrs); h=d.get("href")
            if h: self.links.append(h)
seen=set(SEEDS); queue=list(SEEDS); broken=[]
while queue:
    u=queue.pop(0)
    try:
        req=urllib.request.Request(u,headers={"User-Agent":"VEXARO-Link-Monitor/1.0"})
        with urllib.request.urlopen(req,timeout=12) as r:
            if r.status >= 400: broken.append((u,r.status)); continue
            ctype=r.headers.get("content-type","")
            if "text/html" not in ctype: continue
            body=r.read(400000).decode("utf-8","ignore")
    except Exception as e:
        broken.append((u,str(e))); continue
    p=P(); p.feed(body)
    for h in p.links:
        x=urllib.parse.urljoin(u,h).split("#",1)[0]
        q=urllib.parse.urlparse(x)
        if q.scheme not in ("http","https"): continue
        if q.netloc not in [urllib.parse.urlparse(b).netloc for b in BASES]: continue
        if x not in seen and len(seen)<250:
            seen.add(x); queue.append(x)
if broken:
    print("\n".join(f"BROKEN {u} -> {e}" for u,e in broken))
    raise SystemExit(1)
print(f"Checked {len(seen)} VEXARO URLs: no broken links detected.")
