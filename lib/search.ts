// Utilitaires de recherche partagés (navigateur).

const STOP = new Set(
  "le la les de des du un une et ou en au aux a à l d sur pour par dans avec sans que qui quoi est the of and in to for".split(" ")
);

export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, " ");

export const tokens = (s: string) =>
  normalize(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

/** Vrai si tous les mots significatifs de la requête figurent dans le texte (préfixes acceptés). */
export function matches(text: string, query: string) {
  const q = tokens(query);
  if (!q.length) return false;
  const words = tokens(text);
  return q.every((t) => words.some((w) => w.startsWith(t) || (t.length > 4 && w.startsWith(t.slice(0, -1)))));
}

export const enc = encodeURIComponent;

export interface DeepLink {
  label: string;
  url: string;
  hint: string;
}

/** Recherches préremplies dans les bases officielles qui n'ont pas d'API ouverte au navigateur. */
export function deepLinks(q: string): { group: string; links: DeepLink[] }[] {
  const e = enc(q);
  const lf = (tab: string) =>
    `https://www.legifrance.gouv.fr/search/${tab}?tab_selection=${tab}&searchField=ALL&query=${e}&page=1&init=true`;
  return [
    {
      group: "Droit applicable",
      links: [
        { label: "Codes en vigueur", url: lf("code"), hint: "Légifrance" },
        { label: "Lois et décrets (Journal officiel)", url: lf("jorf"), hint: "Légifrance" },
        { label: "Droit de l'Union européenne", url: `https://eur-lex.europa.eu/search.html?text=${e}&scope=EURLEX&type=quick&lang=fr`, hint: "EUR-Lex" },
      ],
    },
    {
      group: "Jurisprudence",
      links: [
        { label: "Conseil constitutionnel", url: lf("constit"), hint: "Légifrance" },
        { label: "Juridictions administratives", url: lf("cetat"), hint: "Légifrance" },
        { label: "Cour de cassation (Judilibre)", url: `https://www.courdecassation.fr/recherche-judilibre?search_api_fulltext=${e}`, hint: "courdecassation.fr" },
        {
          label: "Cour européenne des droits de l'homme",
          url: `https://hudoc.echr.coe.int/fre#${enc(JSON.stringify({ fulltext: [q] }))}`,
          hint: "HUDOC",
        },
      ],
    },
    {
      group: "Politiques publiques et Parlement",
      links: [
        { label: "Dossiers et rapports publics", url: `https://www.vie-publique.fr/recherche?search_api_fulltext=${e}`, hint: "vie-publique.fr" },
        { label: "Travaux de l'Assemblée nationale", url: `https://www2.assemblee-nationale.fr/recherche/resultats_recherche?q=${e}`, hint: "assemblee-nationale.fr" },
      ],
    },
    {
      group: "Doctrine et travaux universitaires",
      links: [
        { label: "Archive ouverte HAL", url: `https://hal.science/search/index/?q=${e}`, hint: "hal.science" },
        { label: "Thèses soutenues et en préparation", url: `https://theses.fr/resultats?q=${e}`, hint: "theses.fr" },
        { label: "Revues de sciences humaines", url: `https://shs.cairn.info/resultats_recherche?searchTerm=${e}`, hint: "Cairn (accès partiel)" },
        { label: "OpenEdition", url: `https://search.openedition.org/results?q=${e}`, hint: "openedition.org" },
      ],
    },
  ];
}
