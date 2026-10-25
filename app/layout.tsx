import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { MainNav } from "@/components/MainNav";

export const metadata: Metadata = {
  title: { default: "Deputy Monitoring", template: "%s · Deputy Monitoring" },
  description:
    "Hémicycles interactifs et votes des élus de l'Assemblée nationale, du Sénat et du Parlement européen, et recherche juridique et institutionnelle sourcée.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-rule bg-surface">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 sm:px-6">
            <Link href="/" className="narrow text-xl font-bold tracking-tight text-ink">
              Deputy Monitoring
            </Link>
            <MainNav />
            <Link href="/methodologie" className="ml-auto text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
              Sources et méthode
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-rule">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-ink-faint sm:px-6">
            Données publiques officielles (Assemblée nationale, Sénat, Parlement européen via HowTheyVote.eu, Légifrance,
            juridictions), mises à jour chaque semaine. Chaque affirmation renvoie vers sa source.{" "}
            <Link href="/methodologie" className="underline underline-offset-4 hover:text-ink">
              Méthode et limites
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
