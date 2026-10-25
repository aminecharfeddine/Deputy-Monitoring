"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/hemicycles", label: "Hémicycles" },
  { href: "/recherche", label: "Recherche" },
];

export function MainNav() {
  const path = usePathname();
  return (
    <nav aria-label="Rubriques" className="flex items-center gap-1">
      {ITEMS.map((it) => {
        const active = path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`relative px-3 py-2 text-[15px] transition-colors ${
              active ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {it.label}
            {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 bg-velvet" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}
