import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CHAMBERS, loadChamber } from "@/lib/data";
import { loadDossier, loadDossiers, STATUS_LABEL, type Claim, type ClaimStatus } from "@/lib/dossiers";
import { formatDate } from "@/lib/format";
import { matches } from "@/lib/search";

export function generateStaticParams() {
  return loadDossiers().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = loadDossier(slug);
  return { title: d ? `${d.title} — dossier sourcé` : "Dossier", description: d?.subtitle };
}

const SOURCE_TYPE: Record<string, string> = {
  constitution: "Texte constitutionnel",
  loi: "Loi",
  code: "Code",
  decret: "Décret",
  decision: "Décision de justice",
  rapport: "Rapport public",
  doctrine: "Doctrine",
  institution: "Document institutionnel",
  presse: "Presse",
  convention: "Convention internationale",
};

export default async function DossierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = loadDossier(slug);
  if (!d) notFound();

  const num = new Map(d.sources.map((s, i) => [s.id, i + 1]));
  const votes = CHAMBERS.flatMap((c) =>
    (loadChamber(c.key)?.votes ?? [])
      .filter((v) => d.keywords.some((k) => k.split(" ").length > 1 && matches(v.title, k)))
      .map((v) => ({ ...v, chamber: c.key, chamberLabel: c.label }))
  )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  const toc = [
    { id: "synthese", label: "Synthèse" },
    { id: "definitions", label: "Définitions" },
    { id: "competences", label: "Qui fait quoi" },
    ...d.sections.map((s) => ({ id: s.id, label: s.title })),
    ...(d.comparisons?.length ? [{ id: "comparaisons", label: "Comparaisons" }] : []),
    ...(votes.length ? [{ id: "votes", label: "Votes au Parlement" }] : []),
    { id: "chronologie", label: "Chronologie" },
    { id: "limites", label: "Incertitudes et limites" },
    { id: "sources", label: `Sources (${d.sources.length})` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6">
      <nav aria-label="Fil d'Ariane" className="text-sm text-ink-soft">
        <Link href="/recherche" className="underline-offset-4 hover:text-ink hover:underline">
          Recherche
        </Link>
        <span className="mx-2 text-ink-faint">/</span>
        <span>{d.title}</span>
      </nav>

      <header className="mt-6 max-w-[60rem]">
        <h1 className="narrow text-5xl font-bold leading-[0.95] sm:text-6xl">{d.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{d.subtitle}</p>
        <p className="mt-4 text-sm text-ink-faint">
          Sources vérifiées le {formatDate(d.checkedAt)} · {d.sources.filter((s) => s.primary).length} sources primaires sur{" "}
          {d.sources.length}
        </p>
        <StatusLegend />
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Sommaire du dossier" className="hidden lg:block">
          <ol className="sticky top-6 space-y-1.5 border-l border-rule pl-4 text-sm">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-ink-soft hover:text-ink">
                  {t.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 max-w-[52rem] space-y-14">
          <Section id="synthese" title="Synthèse">
            <div className="space-y-4 text-[17px] leading-[1.7]">
              {d.summary.map((c, i) => (
                <p key={i}>
                  {c.text}
                  <Refs ids={c.sources} num={num} />
                </p>
              ))}
            </div>
          </Section>

          <Section id="definitions" title="Définitions">
            <dl className="divide-y divide-rule border-y border-rule">
              {d.definitions.map((x) => (
                <div key={x.term} className="grid gap-1 py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
                  <dt className="narrow text-lg font-bold">{x.term}</dt>
                  <dd className="leading-relaxed">
                    {x.text}
                    <Refs ids={x.sources} num={num} />
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="competences" title="Qui fait quoi">
            <div className="overflow-hidden rounded-xl border border-rule">
              <table className="w-full text-left text-[15px]">
                <thead className="bg-paper text-sm text-ink-faint">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Acteur
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Rôle et fondement
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule bg-surface">
                  {d.actors.map((a) => (
                    <tr key={a.name} className="align-top">
                      <th scope="row" className="w-1/3 px-4 py-3 font-semibold">
                        {a.name}
                      </th>
                      <td className="px-4 py-3 leading-relaxed">
                        {a.role}
                        <Refs ids={a.sources} num={num} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {d.sections.map((s) => (
            <Section key={s.id} id={s.id} title={s.title}>
              {s.intro && <p className="mb-4 leading-relaxed text-ink-soft">{s.intro}</p>}
              <ClaimList claims={s.claims} num={num} />
            </Section>
          ))}

          {d.comparisons?.map((cmp, i) => (
            <Section key={i} id={i === 0 ? "comparaisons" : `comparaison-${i}`} title={cmp.title}>
              <div className="overflow-x-auto rounded-xl border border-rule">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-paper text-ink-faint">
                    <tr>
                      <th className="px-4 py-2.5" />
                      {cmp.columns.map((c) => (
                        <th key={c} scope="col" className="px-4 py-2.5 font-semibold text-ink">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule bg-surface">
                    {cmp.rows.map((r) => (
                      <tr key={r.label} className="align-top">
                        <th scope="row" className="px-4 py-3 font-medium text-ink-soft">
                          {r.label}
                        </th>
                        {r.cells.map((c, j) => (
                          <td key={j} className="px-4 py-3 leading-relaxed">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-sm text-ink-faint">
                Sources
                <Refs ids={cmp.sources} num={num} />
              </p>
            </Section>
          ))}

          {votes.length > 0 && (
            <Section id="votes" title="Votes au Parlement">
              <p className="mb-4 leading-relaxed text-ink-soft">
                Scrutins clés liés au sujet, repérés automatiquement dans les données de l&apos;Assemblée, du Sénat et du Parlement
                européen. Chaque ligne ouvre l&apos;hémicycle coloré selon le vote de chaque élu.
              </p>
              <ul className="divide-y divide-rule border-y border-rule">
                {votes.map((v) => (
                  <li key={v.chamber + v.id} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)]">
                    <span className="text-sm text-ink-faint">
                      {v.chamberLabel}
                      <br />
                      {formatDate(v.date)}
                    </span>
                    <span>
                      <Link href={`/hemicycles/${v.chamber}?vote=${encodeURIComponent(v.id)}`} className="leading-snug hover:underline hover:underline-offset-4">
                        {v.title}
                      </Link>
                      <span className="mt-1 block text-sm text-ink-faint">
                        <span className={v.result === "adopté" ? "text-[var(--vote-pour)]" : "text-[var(--vote-contre)]"}>{v.result}</span> · {v.counts.P}{" "}
                        pour, {v.counts.C} contre, {v.counts.A} abstentions ·{" "}
                        <a href={v.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                          scrutin officiel
                        </a>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section id="chronologie" title="Chronologie">
            <ol className="relative space-y-5 border-l-2 border-rule pl-6">
              {d.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[31px] top-1.5 size-3 rounded-full border-2 border-paper" style={{ background: `var(--st-${t.status})` }} aria-hidden />
                  <p className="tabular text-sm font-semibold">{t.date}</p>
                  <p className="mt-0.5 leading-relaxed">
                    {t.event}
                    <Refs ids={t.sources} num={num} />
                  </p>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ol>
          </Section>

          <Section id="limites" title="Incertitudes et limites">
            <ul className="list-disc space-y-2 pl-5 leading-relaxed">
              {d.limits.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </Section>

          <Section id="sources" title="Sources">
            <ol className="space-y-3">
              {d.sources.map((s, i) => (
                <li key={s.id} id={`src-${s.id}`} className="grid scroll-mt-6 grid-cols-[2.5rem_minmax(0,1fr)] gap-2 target:bg-[var(--vote-absent)]">
                  <span className="tabular text-right text-sm text-ink-faint">[{i + 1}]</span>
                  <span className="text-[15px] leading-snug">
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-velvet">
                      {s.title}
                    </a>
                    <span className="block text-sm text-ink-faint">
                      {s.issuer} · {s.date.length === 10 ? formatDate(s.date) : s.date} · {SOURCE_TYPE[s.type] ?? s.type}
                      {s.primary ? " · source primaire" : ""}
                    </span>
                    {s.note && <span className="block text-sm text-ink-soft">{s.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6">
      <h2 id={`${id}-h`} className="narrow mb-5 text-3xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Refs({ ids, num }: { ids: string[]; num: Map<string, number> }) {
  if (!ids?.length) return null;
  return (
    <sup className="ml-0.5 whitespace-nowrap text-[0.7em] font-semibold">
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ","}
          <a href={`#src-${id}`} className="text-velvet hover:underline" aria-label={`Source ${num.get(id)}`}>
            {num.get(id) ?? "?"}
          </a>
        </span>
      ))}
    </sup>
  );
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: `var(--st-${status})` }}>
      <span className="size-2 rounded-full" style={{ background: `var(--st-${status})` }} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

function ClaimList({ claims, num }: { claims: Claim[]; num: Map<string, number> }) {
  return (
    <ul className="space-y-3">
      {claims.map((c, i) => (
        <li key={i} className="rounded-r-lg border-l-[3px] bg-surface py-3 pl-4 pr-4" style={{ borderColor: `var(--st-${c.status})` }}>
          <p className="leading-relaxed">
            {c.text}
            <Refs ids={c.sources} num={num} />
          </p>
          <StatusBadge status={c.status} />
          {c.uncertain && <p className="mt-2 text-sm text-ink-soft">Incertitude : {c.uncertain}</p>}
        </li>
      ))}
    </ul>
  );
}

function StatusLegend() {
  const items: ClaimStatus[] = ["vigueur", "historique", "reforme", "jurisprudence", "doctrine", "analyse", "debat"];
  return (
    <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm" aria-label="Légende des statuts">
      {items.map((s) => (
        <li key={s} className="flex items-center gap-1.5 text-ink-soft">
          <span className="size-2.5 rounded-full" style={{ background: `var(--st-${s})` }} aria-hidden />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ul>
  );
}

