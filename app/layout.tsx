import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ChamberNav } from "@/components/ChamberNav";

export const metadata: Metadata = {
  title: { default: "Deputy Monitoring", template: "%s · Deputy Monitoring" },
  description:
    "Hémicycles interactifs de l'Assemblée nationale, du Sénat et du Parlement européen, et votes de chaque élu par thème, sourcés à partir de l'open data officiel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-rule bg-surface">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6">
            <Link href="/" className="narrow text-xl font-bold tracking-tight text-ink">
              Deputy Monitoring
            </Link>
            <ChamberNav />
            <Link href="/methodologie" className="ml-auto text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
              Sources et méthode
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-rule">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-ink-faint sm:px-6">
            Données issues de l&apos;open data de l&apos;Assemblée nationale, du Sénat et du Parlement européen (via
            HowTheyVote.eu), mises à jour chaque semaine. Chaque vote renvoie vers sa source officielle.{" "}
            <Link href="/methodologie" className="underline underline-offset-4 hover:text-ink">
              Méthode et limites
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
