#!/usr/bin/env bash
# Sonde les sources open data et affiche leur structure (diagnostic).
set -u
mkdir -p probe && cd probe

head_url() { echo "=== $1"; curl -sSL -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" -m 60 "$1"; }

for leg in 17 18; do
  head_url "https://data.assemblee-nationale.fr/static/openData/repository/$leg/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip"
  head_url "https://data.assemblee-nationale.fr/static/openData/repository/$leg/loi/scrutins/Scrutins.json.zip"
done

echo "##### AN AMO10 (17)"
curl -sSL -m 120 -o amo.zip "https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip"
unzip -q -o amo.zip -d amo && find amo -maxdepth 3 -type d | head; find amo -type f | wc -l
A=$(find amo -path '*acteur*' -name '*.json' | head -1); echo "-- $A"; head -c 6000 "$A"; echo
O=$(find amo -path '*organe*' -name '*.json' | head -1); echo "-- $O"; head -c 2500 "$O"; echo
echo "-- organe codeType counts"; cat $(find amo -path '*organe*' -name '*.json') | grep -o '"codeType": *"[A-Z_]*"' | sort | uniq -c

echo "##### AN Scrutins (17)"
curl -sSL -m 300 -o scr.zip "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip"
ls -la scr.zip; unzip -q -o scr.zip -d scr && find scr -type f | wc -l
S=$(find scr -name '*.json' | sort | tail -1); echo "-- $S"; head -c 7000 "$S"; echo
echo "-- sample titles"; for f in $(find scr -name '*.json' | sort | tail -40); do grep -o '"titre": *"[^"]*"' "$f" | head -1; done

echo "##### NosDeputes / NosSenateurs"
curl -sSL -m 60 "https://www.nosdeputes.fr/deputes/enmandat/json" | head -c 1500; echo
curl -sSL -m 60 "https://www.nossenateurs.fr/senateurs/enmandat/json" | head -c 2500; echo

echo "##### Senat"
for u in \
  "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv" \
  "https://data.senat.fr/data/senateurs/ODSEN_CUR_GROUPES.csv" \
  "https://data.senat.fr/data/senateurs/ODSEN_ELUSEN.csv" \
  "https://www.senat.fr/scrutin-public/scr2025.html" \
  "https://www.senat.fr/scrutin-public/2025/scr2025-1.html" \
  "https://data.senat.fr/data/dosleg/dosleg.zip" \
  "https://data.senat.fr/scrutins/" ; do head_url "$u"; done
curl -sSL -m 60 "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv" | iconv -f latin1 -t utf-8 | head -5
curl -sSL -m 60 "https://data.senat.fr/data/senateurs/ODSEN_CUR_GROUPES.csv" | iconv -f latin1 -t utf-8 | head -5
curl -sSL -m 60 "https://www.senat.fr/scrutin-public/scr2025.html" | grep -o 'href="[^"]*scr2025[^"]*"' | head -10
curl -sSL -m 60 "https://data.senat.fr/" | grep -io 'href="[^"]*"' | grep -i -E 'scrutin|vote' | head

echo "##### Parlement europeen"
curl -sSL -m 60 "https://data.europarl.europa.eu/api/v2/meps/show-current?format=application%2Fld%2Bjson&offset=0&limit=2" | head -c 3000; echo
curl -sSL -m 60 -H "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/HowTheyVote/data/releases/latest" | grep -E '"(tag_name|name|browser_download_url|size)"' | head -30
