import Link from "next/link";
import { CHAMBERS, loadChamber } from "@/lib/data";
import { loadDossiers } from "@/lib/dossiers";
import { layoutSeats } from "@/lib/hemicycle";

/** Mini hémicycle statique pour l'accueil. */
function MiniHemicycle({ chamber }: { chamber: "an" | "senat" | "pe" }) {
  const d = loadChamber(chamber);
  if (!d) return null;
  const order = new Map(d.groups.map((g) => [g.id, g.order]));
  const color = new Map(d.groups.map((g) => [g.id, g.color]));
  const members = [...d.members].sort((a, b) => (order.get(a.group) ?? 99) - (order.get(b.group) ?? 99));
  const { seats, dot } = layoutSeats(members.length);
  return (
    <svg viewBox="-1.05 -1.05 2.1 1.1" className="w-full" aria-hidden>
      {members.map((m, i) => (seats[i] ? <circle key={m.id} cx={seats[i].x} cy={seats[i].y} r={dot} fill={color.get(m.group)} /> : null))}
    </svg>
  );
}

export default function Home() {
  const dossiers = loadDossiers();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6">
      <h1 className="narrow max-w-[16ch] text-5xl font-bold leading-[0.95] sm:text-7xl">Veille parlementaire, sources à l&apos;appui</h1>
      <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
        Les votes des élus de l&apos;Assemblée nationale, du Sénat et du Parlement européen, et des dossiers juridiques où chaque
        affirmation renvoie à sa source.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8" aria-labelledby="h-hemi">
          <h2 id="h-hemi" className="narrow text-3xl font-bold">
            <Link href="/hemicycles/an" className="hover:underline hover:underline-offset-4">
              Hémicycles
            </Link>
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Chaque siège ouvre la fiche de l&apos;élu : ses votes sur les grands textes, classés par thème.
          </p>
          <ul className="mt-6 grid grid-cols-3 gap-4">
            {CHAMBERS.map((c) => (
              <li key={c.key}>
                <Link href={`/hemicycles/${c.key}`} className="group block">
                  <MiniHemicycle chamber={c.key} />
                  <span className="mt-2 block text-center text-sm font-semibold group-hover:underline group-hover:underline-offset-4">
                    {c.label}
                  </span>
                  <span className="block text-center text-xs text-ink-faint">{loadChamber(c.key)?.members.length ?? "—"} élus</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8" aria-labelledby="h-rech">
          <h2 id="h-rech" className="narrow text-3xl font-bold">
            <Link href="/recherche" className="hover:underline hover:underline-offset-4">
              Recherche
            </Link>
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Un sujet expliqué sous tous ses angles : droit en vigueur, compétences, jurisprudence, réformes, doctrine et votes.
          </p>
          <form action="/recherche" className="mt-6 flex gap-2">
            <label htmlFor="home-q" className="sr-only">
              Sujet à explorer
            </label>
            <input
              id="home-q"
              name="q"
              type="search"
              placeholder="Ex. : maintien de l'ordre"
              className="min-w-0 flex-1 rounded-lg border border-rule-strong bg-paper px-3 py-2.5"
            />
            <button className="rounded-lg bg-ink px-4 font-semibold text-paper">Rechercher</button>
          </form>
          {dossiers.length > 0 && (
            <ul className="mt-6 space-y-2 text-sm">
              {dossiers.slice(0, 4).map((d) => (
                <li key={d.slug}>
                  <Link href={`/recherche/${d.slug}`} className="font-semibold underline underline-offset-4 hover:text-velvet">
                    {d.title}
                  </Link>
                  <span className="text-ink-faint"> — dossier sourcé</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
