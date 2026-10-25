import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Research } from "@/components/Research";
import { loadDossiers } from "@/lib/dossiers";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Recherche juridique et institutionnelle" };

export default function RecherchePage() {
  const dossiers = loadDossiers();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
      <h1 className="narrow max-w-[18ch] text-5xl font-bold leading-[0.95] sm:text-6xl">Explorer un sujet sous tous ses angles</h1>
      <p className="mt-4 max-w-[68ch] text-lg leading-relaxed text-ink-soft">
        Droit applicable, compétences, jurisprudence, travaux universitaires et votes au Parlement, regroupés par catégorie.
        Les dossiers sont rédigés et sourcés à l&apos;avance ; le reste est interrogé en direct dans les bases ouvertes.
      </p>

      <div className="mt-8">
        <Suspense fallback={<div className="h-[60px] rounded-xl border border-rule-strong bg-surface" />}>
          <Research />
        </Suspense>
      </div>

      <section className="mt-16 border-t border-rule pt-8" aria-labelledby="dossiers">
        <h2 id="dossiers" className="narrow text-3xl font-bold">
          Dossiers sourcés
        </h2>
        <p className="mt-1 max-w-[68ch] text-ink-soft">
          Une vue d&apos;ensemble par sujet : chaque affirmation est rattachée à sa source primaire, datée, et classée selon
          qu&apos;elle relève du droit en vigueur, du droit historique, d&apos;une réforme, de la jurisprudence ou de la doctrine.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dossiers.map((d) => (
            <li key={d.slug}>
              <Link href={`/recherche/${d.slug}`} className="flex h-full flex-col rounded-xl border border-rule bg-surface p-5 hover:border-ink">
                <span className="narrow text-2xl font-bold leading-tight">{d.title}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{d.subtitle}</span>
                <span className="mt-4 text-xs text-ink-faint">
                  {d.sources.length} sources · vérifié le {formatDate(d.checkedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
