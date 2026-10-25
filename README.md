# Deputy Monitoring

Hémicycles interactifs de l'**Assemblée nationale**, du **Sénat** et du **Parlement européen**. Chaque siège ouvre la
fiche de l'élu, avec ses votes sur les grands textes classés par thème et un lien vers chaque scrutin officiel.

- Site 100 % statique (Next.js), sans base de données, hébergeable gratuitement sur Vercel.
- Données publiques officielles, mises à jour chaque lundi par une GitHub Action.
- Aucune position n'est générée par IA : seuls des votes nominatifs sourcés sont affichés.

## Sources

| Institution | Élus | Votes |
|---|---|---|
| Assemblée nationale | [data.assemblee-nationale.fr](https://data.assemblee-nationale.fr) (AMO10) | Scrutins publics, 17e législature |
| Sénat | [data.senat.fr](https://data.senat.fr) (ODSEN) | JSON des scrutins publics de senat.fr |
| Parlement européen | [HowTheyVote.eu](https://howtheyvote.eu) (ODbL) | Votes par appel nominal, 10e législature |

Sont retenus les votes d'ensemble : textes, articles uniques, résolutions, déclarations du Gouvernement et motions de
censure. Les amendements sont exclus. Détails sur la page « Sources et méthode » du site.

## Fonctionnement

```
scripts/build-data.mjs   collecte + transformation  ->  public/data/{an,senat,pe}.json
scripts/topics.mjs       classement thématique par mots-clés (et sujets OEIL pour le PE)
.github/workflows/update-data.yml   chaque lundi : régénère les JSON et les committe
```

Vercel redéploie automatiquement à chaque commit, donc à chaque mise à jour des données.

## Développement

```bash
npm install
node scripts/build-data.mjs        # ou : node scripts/build-data.mjs an senat
npm run dev                        # http://localhost:3000
```

## Déploiement sur Vercel

1. Sur vercel.com, **Add New → Project**, importer le dépôt GitHub `Deputy-Monitoring`.
2. Laisser les réglages par défaut (Next.js détecté), puis **Deploy**.

Aucune variable d'environnement n'est nécessaire. Pour forcer une mise à jour des données : onglet **Actions** du dépôt,
workflow « Mise à jour des données », bouton **Run workflow**.
