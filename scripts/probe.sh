#!/usr/bin/env bash
set -u
mkdir -p raw/senat && cd raw/senat
for u in https://www.senat.fr/scrutin-public/2025/scr2025-340.json https://www.senat.fr/scrutin-public/scr2025-340.json https://www.senat.fr/scrutin-public/2026/scr2026-1.json https://www.senat.fr/scrutin-public/2024/scr2024-200.json; do
  echo "== $u"; curl -sSL -m 60 -o "$(basename $u)" -w "%{http_code} %{content_type} %{size_download}\n" "$u"
done
curl -sSL -m 60 https://www.senat.fr/scrutin-public/2025/scr2025-340.html | grep -o '<script[^>]*src="[^"]*"' | head -20 > scripts_tags.txt
ls -la
