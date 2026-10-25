import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { ChamberData, ChamberKey } from "./types";

export const CHAMBERS: { key: ChamberKey; label: string; short: string }[] = [
  { key: "an", label: "Assemblée nationale", short: "Assemblée" },
  { key: "senat", label: "Sénat", short: "Sénat" },
  { key: "pe", label: "Parlement européen", short: "Parlement européen" },
];

export const isChamber = (k: string): k is ChamberKey => CHAMBERS.some((c) => c.key === k);

const cache = new Map<ChamberKey, ChamberData | null>();

export function loadChamber(key: ChamberKey): ChamberData | null {
  if (cache.has(key)) return cache.get(key)!;
  const file = path.join(process.cwd(), "public", "data", `${key}.json`);
  const data = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as ChamberData) : null;
  cache.set(key, data);
  return data;
}
