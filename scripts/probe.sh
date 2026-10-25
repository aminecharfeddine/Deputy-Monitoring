#!/usr/bin/env bash
set -u
mkdir -p raw && cd raw
O="Origin: https://deputy-monitoring.vercel.app"
check() { echo "=== $1"; curl -sS -m 30 -D - -o body.tmp -H "$O" -A "Mozilla/5.0 DeputyMonitoring" "$2" | grep -i -E "^HTTP|access-control-allow-origin|content-type"; head -c 700 body.tmp; echo; }
Q="maintien%20de%20l%27ordre"
check hal "https://api.archives-ouvertes.fr/search/?q=$Q&wt=json&rows=3&fl=title_s,uri_s,producedDateY_i,authFullName_s,docType_s"
check openalex "https://api.openalex.org/works?search=$Q&per-page=2&filter=language:fr"
check wiki-search "https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=$Q&format=json&origin=*&srlimit=3"
check wiki-summary "https://fr.wikipedia.org/api/rest_v1/page/summary/Maintien_de_l%27ordre"
check theses "https://theses.fr/api/v1/theses/recherche/?q=$Q&debut=0&nombre=2"
check datagouv "https://www.data.gouv.fr/api/1/datasets/?q=$Q&page_size=2"
check wikidata "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=maintien%20de%20l%27ordre&language=fr&format=json&origin=*"
check legifrance-page "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006390136"
check judilibre-search "https://www.courdecassation.fr/recherche-judilibre?search_api_fulltext=$Q"
check cc "https://www.conseil-constitutionnel.fr/decisions?search=$Q"
check eurlex "https://eur-lex.europa.eu/search.html?text=$Q&scope=EURLEX&type=quick&lang=fr"
check viepub "https://www.vie-publique.fr/recherche?search_api_fulltext=$Q"
check an-search "https://www2.assemblee-nationale.fr/recherche/resultats_recherche?q=$Q"
check senat-search "https://www.senat.fr/recherche/index.html?query=$Q"
check cairn "https://shs.cairn.info/resultats_recherche?searchTerm=$Q"
