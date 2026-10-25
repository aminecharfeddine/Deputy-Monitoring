import type { Position } from "./types";

export const formatDate = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "Europe/Paris" }).format(new Date(iso)) : "";

export const POSITION_LABEL: Record<Position, string> = {
  P: "Pour",
  C: "Contre",
  A: "Abstention",
  N: "N'a pas pris part au vote",
  "-": "Absent ou hors mandat",
};

export const POSITION_COLOR: Record<Position, string> = {
  P: "var(--vote-pour)",
  C: "var(--vote-contre)",
  A: "var(--vote-abst)",
  N: "var(--vote-nv)",
  "-": "var(--vote-absent)",
};

export const plural = (n: number, one: string, many = one + "s") => `${n.toLocaleString("fr-FR")} ${n > 1 ? many : one}`;
