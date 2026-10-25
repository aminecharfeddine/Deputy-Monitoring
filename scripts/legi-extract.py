#!/usr/bin/env python3
"""Extrait les articles en vigueur de quelques codes depuis l'open data LEGI (DILA).

Télécharge la dernière archive globale « Freemium », puis applique dans l'ordre
les archives incrémentales quotidiennes publiées depuis. Produit un fichier
legi_<code>.json.gz par code : id LEGIARTI, numéro, état, dates, texte.

Usage : python3 scripts/legi-extract.py OUT_DIR
"""
import gzip
import json
import os
import re
import sys
import tarfile
import urllib.request
import xml.etree.ElementTree as ET

BASE = "https://echanges.dila.gouv.fr/OPENDATA/LEGI/"
CODES = {
    "LEGITEXT000025503132": "csi",
    "LEGITEXT000006070719": "penal",
    "LEGITEXT000006070633": "cgct",
    "LEGITEXT000006071307": "defense",
    "LEGITEXT000006071154": "cpp",
    "LEGITEXT000006070721": "civil",
}
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(OUT, exist_ok=True)


def get(url, dest=None):
    req = urllib.request.Request(url, headers={"User-Agent": "Deputy-Monitoring open data"})
    with urllib.request.urlopen(req, timeout=600) as r:
        if dest is None:
            return r.read().decode("utf-8", "replace")
        with open(dest, "wb") as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)


listing = get(BASE)
globals_ = sorted(set(re.findall(r"Freemium_legi_global_(\d{8}-\d{6})\.tar\.gz", listing)))
stamp = globals_[-1]
incrementals = sorted(s for s in set(re.findall(r"LEGI_(\d{8}-\d{6})\.tar\.gz", listing)) if s > stamp)
print(f"global {stamp}, {len(incrementals)} incrémentales", flush=True)

articles = {}  # id -> dict


def scan(path):
    n = 0
    with tarfile.open(path, "r|gz") as tar:
        for m in tar:
            if not m.isfile() or "/article/" not in m.name:
                continue
            code = next((v for k, v in CODES.items() if f"/{k}/" in m.name), None)
            if not code:
                continue
            try:
                root = ET.fromstring(tar.extractfile(m).read())
            except ET.ParseError:
                continue
            g = lambda p: (root.findtext(p) or "").strip()
            bloc = root.find(".//BLOC_TEXTUEL/CONTENU")
            text = re.sub(r"\s+", " ", "".join(bloc.itertext())).strip() if bloc is not None else ""
            aid = g(".//META_COMMUN/ID")
            articles[aid] = {
                "code": code,
                "id": aid,
                "num": g(".//META_ARTICLE/NUM"),
                "etat": g(".//META_ARTICLE/ETAT"),
                "debut": g(".//META_ARTICLE/DATE_DEBUT"),
                "fin": g(".//META_ARTICLE/DATE_FIN"),
                "text": text,
            }
            n += 1
    return n


tmp = "/tmp/legi.tar.gz"
get(BASE + f"Freemium_legi_global_{stamp}.tar.gz", tmp)
print("global :", scan(tmp), "articles", flush=True)
last = stamp
for s in incrementals:
    try:
        get(BASE + f"LEGI_{s}.tar.gz", tmp)
        k = scan(tmp)
        last = s
        if k:
            print(f"{s} : {k} articles mis à jour", flush=True)
    except Exception as e:  # une archive manquante ne doit pas tout bloquer
        print(f"{s} : échec {e}", flush=True)

by_code = {}
for a in articles.values():
    if a["etat"] in ("VIGUEUR", "VIGUEUR_DIFF"):
        by_code.setdefault(a.pop("code"), []).append(a)
for code, arts in by_code.items():
    with gzip.open(os.path.join(OUT, f"legi_{code}.json.gz"), "wt") as f:
        json.dump(arts, f, ensure_ascii=False)
    print(code, len(arts))
with open(os.path.join(OUT, "legi_meta.json"), "w") as f:
    json.dump({"global": stamp, "last_incremental": last, "incrementals": len(incrementals)}, f)
