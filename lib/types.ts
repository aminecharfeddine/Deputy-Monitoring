export type ChamberKey = "an" | "senat" | "pe";

export type Position = "P" | "C" | "A" | "N" | "-";

export interface Group {
  id: string;
  short: string;
  name: string;
  color: string;
  order: number;
  count: number;
}

export interface Member {
  id: string;
  name: string;
  sort: string;
  civ: string;
  group: string;
  area: string;
  region: string;
  country?: string;
  commission: string;
  seat: number | null;
  since?: string;
  profession: string;
  photo: string | null;
  url: string;
  links: { label: string; url: string }[];
}

export interface Vote {
  id: string;
  num: number;
  date: string;
  title: string;
  kind: "texte" | "censure";
  result: "adopté" | "rejeté" | "";
  counts: { P: number; C: number; A: number };
  url: string;
  officialUrl?: string | null;
  reference?: string;
  topics: string[];
}

export interface Topic {
  id: string;
  label: string;
}

export interface ChamberData {
  chamber: ChamberKey;
  label: string;
  memberLabel: string;
  legislature: string;
  generatedAt: string;
  groups: Group[];
  members: Member[];
  votes: Vote[];
  topics: Topic[];
  positions: Record<string, string>;
  groupPositions: Record<string, Position>[];
  sources: { label: string; url: string; licence: string }[];
}

/** Version allégée transmise au client pour dessiner l'hémicycle. */
export interface SeatMember {
  id: string;
  name: string;
  group: string;
  area: string;
  country?: string;
  photo: string | null;
}
