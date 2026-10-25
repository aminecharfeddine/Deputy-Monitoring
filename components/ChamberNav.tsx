"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { key: "an", label: "Assemblée nationale", short: "Assemblée" },
  { key: "senat", label: "Sénat", short: "Sénat" },
  { key: "pe", label: "Parlement européen", short: "Europe" },
];

export function ChamberNav() {
  const current = usePathname().split("/")[1];
  return (
    <nav aria-label="Institution" className="flex rounded-full border border-rule bg-paper p-1">
      {ITEMS.map((it) => {
        const active = current === it.key;
        return (
          <Link
            key={it.key}
            href={`/${it.key}`}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              active ? "bg-ink font-semibold text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            <span className="sm:hidden">{it.short}</span>
            <span className="hidden sm:inline">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
