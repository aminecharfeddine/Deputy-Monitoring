// Classement thématique des scrutins par mots-clés (intitulés français)
// et par codes de sujets OEIL (Parlement européen).

export const TOPICS = [
  { id: "gouvernement", label: "Censure & confiance" },
  { id: "budget", label: "Budget & fiscalité" },
  { id: "travail", label: "Travail, retraites & social" },
  { id: "sante", label: "Santé" },
  { id: "immigration", label: "Immigration & asile" },
  { id: "securite", label: "Sécurité & justice" },
  { id: "ecologie", label: "Écologie & énergie" },
  { id: "agriculture", label: "Agriculture & alimentation" },
  { id: "economie", label: "Économie, industrie & numérique" },
  { id: "logement", label: "Logement & transports" },
  { id: "societe", label: "Société, éducation & droits" },
  { id: "institutions", label: "Institutions & territoires" },
  { id: "international", label: "Europe, défense & international" },
  { id: "autres", label: "Autres textes" },
];

export const normalize = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "'");

const FR_RULES = {
  gouvernement: /motion de censure|politique generale|declaration du gouvernement/,
  budget: /loi de finances|financement de la securite sociale|fin de gestion|budget|fiscal|impot|taxe|finances publiques|resultats de la gestion|dette publique/,
  travail: /retraite|travail|emploi|chomage|salari|protection sociale|handicap|pauvrete|solidarite|apprentissage|professionnalisation|agents publics|fonction publique|minima sociaux|aides publiques/,
  sante: /sante|medec|medic|hopital|hospital|soignant|soins|patient|maladie|cancer|fin de vie|aide a mourir|palliatif|pharmac|infirm|psychiatr|vapotage|tabac|mortalite|sclerose|chemsex|orthophon|medico-social|kinesither|dentist/,
  immigration: /immigration|etranger|asile|nationalite|retention|integration|titres? de sejour|frontiere|schengen|droit du sol|migrat/,
  securite: /securite|surete|police|gendarm|forces de l'ordre|justice|judiciaire|penal|peine|prison|detenu|privation de liberte|terroris|narcotrafic|stupefiant|delinquan|ordre public|attentat|legitime defense|juridiction|magistrat|criminel|fraude|avoirs saisis|procureur|nullites|criminalit|pedocriminal|homicide|violence routiere|sapeurs-pompiers/,
  ecologie: /climat|energie|energetique|nucleaire|hydroelectri|renouvelable|environnement|ecolog|biodiversite|pollution|plastique|\beau\b|perfluoro|pfas|dechet|carbone|eolien|frelon/,
  agriculture: /agricul|agricol|paysan|elevage|alimentation|alimentaire|denree|peche|foret|apicole|pesticide|montagne/,
  economie: /entreprise|economi|industri|commerce|commercant|consommat|bancaire|nationalisation|simplification|numerique|intelligence artificielle|concurrence|investissement|postal|tourisme|demarchage|operateurs de l'etat|succession|indivision|creances|titre-restaurant|droits voisins|expertise comptable|debits de boissons|artisan/,
  logement: /logement|locati|loyer|habitat|immobili|transport|ferroviaire|mobilite|ascenseur|urbanisme/,
  societe: /egalite|discrimination|antisemitisme|racisme|femmes|violences|sexis|enfant|mineur|famille|ecole|education|enseignement|pedagogique|universit|etudiant|laicite|culture|sport|olympiques|reseaux sociaux|tiktok|interruption volontaire|avortement|homosexu|memoire|reconnaissance de la nation|prejudice|rapatries|victimes|conjugal|code noir|esclavage|dreyfus|patrimoine|presse/,
  institutions: /constitution|organique|election|electoral|mode de scrutin|municipal|referendum|reglement de l'assemblee|reglement du senat|collectivit|communes|territori|outre-mer|mayotte|corse|nouvelle-caledonie|martinique|guadeloupe|la reunion|guyane|polynesie|decentralisation|millefeuille|commission d'enquete|\belus?\b|elu local|mandat d'elu|controle du parlement/,
  international: /ukraine|russie|israel|palestin|gaza|europeen|union europeenne|defense|militaire|armees|autorisant la ratification|autorisant l'approbation|traite|international|otan|azerbaidjan|armen|haiti|frères musulmans|freres musulmans/,
};

export function classifyFr(title) {
  const t = normalize(title);
  const out = Object.entries(FR_RULES).filter(([, re]) => re.test(t)).map(([id]) => id);
  return out.length ? out : ["autres"];
}

// Codes de sujets OEIL (Observatoire législatif du PE) -> thèmes
const OEIL_PREFIX = [
  ["2.70", "budget"], ["8.70", "budget"], ["5", "economie"],
  ["1", "societe"], ["2", "economie"],
  ["3.10", "agriculture"], ["3.15", "agriculture"], ["3.20", "logement"],
  ["3.30", "economie"], ["3.40", "economie"], ["3.50", "economie"],
  ["3.60", "ecologie"], ["3.70", "ecologie"],
  ["4.10", "travail"], ["4.15", "travail"], ["4.20", "sante"],
  ["4.40", "societe"], ["4.45", "societe"], ["4.60", "economie"], ["4.70", "institutions"],
  ["6", "international"], ["7.10", "immigration"], ["7.30", "securite"],
  ["7.40", "securite"], ["7.90", "securite"], ["8", "institutions"],
];

const EN_RULES = {
  budget: /budget|taxation|\btax\b|discharge/,
  travail: /employment|worker|social|pension|labour/,
  sante: /health|medicin|pharmac|disease|cancer/,
  immigration: /migration|asylum|border|return of|schengen/,
  securite: /security|police|terror|crime|judicial|justice|rule of law/,
  ecologie: /climate|energy|environment|emission|methane|carbon|pollution|nature|biodiversity|chemical/,
  agriculture: /agricultur|farm|food|fisher|animal|genetically modified|pesticide/,
  economie: /market|industr|trade|digital|competition|bank|financ|raw materials|consumer|artificial intelligence/,
  logement: /housing|transport|rail|aviation|vehicle/,
  societe: /education|culture|erasmus|gender|equality|women|child|media freedom|sport/,
  institutions: /parliament|rules of procedure|elections|institution|treaty change/,
  international: /ukraine|russia|israel|gaza|china|defence|foreign|security policy|agreement with|situation in|human rights/,
};

export function classifyEp(title, oeilCodes = []) {
  const set = new Set();
  for (const code of oeilCodes) {
    const hit = OEIL_PREFIX.find(([p]) => code === p || code.startsWith(p + "."));
    if (hit) set.add(hit[1]);
  }
  const t = title.toLowerCase();
  if (!set.size) for (const [id, re] of Object.entries(EN_RULES)) if (re.test(t)) set.add(id);
  return set.size ? [...set] : ["autres"];
}
