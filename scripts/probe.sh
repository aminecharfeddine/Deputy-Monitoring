#!/usr/bin/env bash
set -u
mkdir -p raw/senat && cd raw/senat
for y in 2024 2025 2026; do curl -sSL -m 60 -o "scr$y.html" "https://www.senat.fr/scrutin-public/scr$y.html"; done
for f in ODSEN_GENERAL ODSEN_CUR_COMS; do curl -sSL -m 60 -o "$f.csv" "https://data.senat.fr/data/senateurs/$f.csv"; done
curl -sSL -m 60 -o scr2025-340.json https://www.senat.fr/scrutin-public/2025/scr2025-340.json
curl -sSL -m 60 -o senateur_page.html "https://www.senat.fr/senateur/aeschlimann_marie_do21071f.html"
curl -sSL -m 60 -o liste.html "https://www.senat.fr/senateurs/senatl.html"
ls -la
