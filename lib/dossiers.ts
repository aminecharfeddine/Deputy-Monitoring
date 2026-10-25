import "server-only";
import fs from "node:fs";
import path from "node:path";

/** Statut d'une affirmation : distingue le droit positif, l'histoire, les projets et les analyses. */
export type ClaimStatus =
  | "vigueur" // droit en vigueur
  | "historique" // droit abrogé ou modifié
  | "reforme" // projet, proposition, réforme en cours ou récente
  | "jurisprudence"
  | "doctrine" // commentaire doctrinal, travaux universitaires
  | "debat" // positions politiques, controverses
  | "analyse"; // constat institutionnel (rapport, autorité administrative)

export type SourceType = "constitution" | "loi" | "code" | "decret" | "decision" | "rapport" | "doctrine" | "institution" | "presse" | "convention";

export interface Source {
  id: string;
  title: string;
  issuer: string;
  date: string; // AAAA-MM-JJ ou AAAA
  url: string;
  type: SourceType;
  primary: boolean;
  note?: string;
}

export interface Claim {
  text: string;
  status: ClaimStatus;
  sources: string[];
  uncertain?: string; // précision sur une incertitude
}

export interface Dossier {
  slug: string;
  title: string;
  subtitle: string;
  keywords: string[]; // pour la recherche et le rapprochement avec les scrutins
  checkedAt: string; // date de dernière vérification des sources
  summary: Claim[];
  definitions: { term: string; text: string; sources: string[] }[];
  actors: { name: string; role: string; sources: string[] }[];
  sections: { id: string; title: string; intro?: string; claims: Claim[] }[];
  timeline: { date: string; event: string; status: ClaimStatus; sources: string[] }[];
  comparisons?: { title: string; columns: string[]; rows: { label: string; cells: string[] }[]; sources: string[] }[];
  limits: string[];
  related?: string[];
  sources: Source[];
}

const DIR = path.join(process.cwd(), "content", "dossiers");

let cache: Dossier[] | null = null;

export function loadDossiers(): Dossier[] {
  if (cache) return cache;
  cache = fs.existsSync(DIR)
    ? fs
        .readdirSync(DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Dossier)
        .sort((a, b) => a.title.localeCompare(b.title, "fr"))
    : [];
  return cache;
}

export const loadDossier = (slug: string) => loadDossiers().find((d) => d.slug === slug) ?? null;

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  vigueur: "Droit en vigueur",
  historique: "Droit historique",
  reforme: "Réforme ou projet",
  jurisprudence: "Jurisprudence",
  doctrine: "Doctrine",
  debat: "Débat politique",
  analyse: "Analyse institutionnelle",
};
