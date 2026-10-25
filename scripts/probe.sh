#!/usr/bin/env bash
set -u
mkdir -p raw && cd raw
curl -sSL -m 60 https://echanges.dila.gouv.fr/OPENDATA/LEGI/ | grep -o 'Freemium_legi_global_[0-9_-]*\.tar\.gz' | sort -u | tail -3 > legi_listing.txt
cat legi_listing.txt
F=$(tail -1 legi_listing.txt)
curl -sSL -m 1200 -o /tmp/legi.tar.gz "https://echanges.dila.gouv.fr/OPENDATA/LEGI/$F"
ls -la /tmp/legi.tar.gz
python3 - <<'PY'
import tarfile, re, json, gzip, collections
import xml.etree.ElementTree as ET
WANT = {"LEGITEXT000025503132":"csi","LEGITEXT000006070719":"penal","LEGITEXT000006070633":"cgct","LEGITEXT000006071307":"defense","LEGITEXT000006071154":"cpp","LEGITEXT000006071194":"constitution","LEGITEXT000006070721":"civil"}
out = collections.defaultdict(list)
paths=0
with tarfile.open("/tmp/legi.tar.gz","r|gz") as tar:
    for m in tar:
        paths+=1
        if paths<5: print(m.name)
        if not m.isfile() or "/article/" not in m.name: continue
        hit = next((k for k in WANT if "/"+k+"/" in m.name), None)
        if not hit: continue
        x = tar.extractfile(m).read()
        try: r = ET.fromstring(x)
        except Exception: continue
        g = lambda p: (r.findtext(p) or "").strip()
        etat = g(".//META_ARTICLE/ETAT")
        if etat not in ("VIGUEUR","VIGUEUR_DIFF","ABROGE_DIFF"): continue
        bloc = r.find(".//BLOC_TEXTUEL/CONTENU")
        text = re.sub(r"\s+"," ", "".join(bloc.itertext())).strip() if bloc is not None else ""
        out[WANT[hit]].append({"id":g(".//META_COMMUN/ID"),"num":g(".//META_ARTICLE/NUM"),"etat":etat,"debut":g(".//META_ARTICLE/DATE_DEBUT"),"fin":g(".//META_ARTICLE/DATE_FIN"),"text":text})
print("members scanned", paths)
for k,v in out.items():
    print(k, len(v))
    with gzip.open(f"legi_{k}.json.gz","wt") as f: json.dump(v,f,ensure_ascii=False)
PY
ls -la
