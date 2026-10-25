#!/usr/bin/env bash
# Récupère des échantillons bruts des sources dans ./raw (diagnostic / dev).
set -u
mkdir -p raw/senat raw/pe && cd raw
AN=https://data.assemblee-nationale.fr/static/openData/repository/17
curl -sSL -m 300 -o an_amo.json.zip "$AN/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip"
curl -sSL -m 300 -o an_scrutins.json.zip "$AN/loi/scrutins/Scrutins.json.zip"

cd senat
for f in ODSEN_GENERAL ODSEN_ELUSEN ODSEN_HISTOGROUPES ODSEN_CUR_COMS ODSEN_COMS; do
  curl -sSL -m 60 -o "$f.csv" -w "$f %{http_code}\n" "https://data.senat.fr/data/senateurs/$f.csv"
done
curl -sSL -m 60 -o data_senat_home.html "https://data.senat.fr/"
curl -sSL -m 60 -o data_senat_senateurs.html "https://data.senat.fr/les-senateurs/"
for y in 2024 2025 2026; do curl -sSL -m 60 -o "scr$y.html" "https://www.senat.fr/scrutin-public/scr$y.html"; done
curl -sSL -m 60 -o scr2025-340.html "https://www.senat.fr/scrutin-public/2025/scr2025-340.html"
curl -sSL -m 60 -o scr2025-1.html "https://www.senat.fr/scrutin-public/2025/scr2025-1.html"
curl -sSL -m 300 -o /tmp/dosleg.zip "https://data.senat.fr/data/dosleg/dosleg.zip" && unzip -l /tmp/dosleg.zip > dosleg_listing.txt
cd ..

cd pe
curl -sSL -m 60 -o meps_current.json "https://data.europarl.europa.eu/api/v2/meps/show-current?format=application%2Fld%2Bjson&offset=0&limit=1000"
curl -sSL -m 60 -H "Authorization: Bearer $GITHUB_TOKEN" -o htv_release.json "https://api.github.com/repos/HowTheyVote/data/releases/latest"
python3 - <<'EOF'
import json, subprocess
r = json.load(open("htv_release.json"))
with open("htv_assets.txt","w") as f:
    for a in r["assets"]:
        f.write(f'{a["name"]} {a["size"]}\n')
        if a["name"].endswith(".csv.gz") and a["size"] < 60_000_000:
            subprocess.run(["curl","-sSL","-m","300","-o",a["name"],a["browser_download_url"]])
EOF
for f in *.csv.gz; do echo "== $f"; zcat "$f" | head -3; done > htv_heads.txt
cd ..
du -sh * */* | sort -h | tail -40 > sizes.txt
