"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { deepLinks, enc, matches, normalize } from "@/lib/search";
import { formatDate } from "@/lib/format";

interface IndexData {
  dossiers: { slug: string; title: string; subtitle: string; keywords: string[]; terms: string[] }[];
  votes: { c: "an" | "senat" | "pe"; id: string; d: string; t: string; r: string; u: string; k: string }[];
}

interface Work {
  title: string;
  authors: string;
  year?: number;
  venue?: string;
  url: string;
  source: "HAL" | "OpenAlex";
  kind?: string;
}

type Live<T> = { state: "idle" | "loading" | "done" | "error"; data: T };
type Result<T> = { q: string; state: "done" | "error"; data: T };

/** L'état « chargement » se déduit de la requête : un résultat ne vaut que pour la requête qui l'a produit. */
const live = <T,>(r: Result<T> | null, q: string, empty: T): Live<T> => (r && r.q === q ? r : { state: "loading", data: empty });

interface OpenAlexWork {
  display_name: string;
  publication_year?: number;
  authorships?: { author?: { display_name?: string } }[];
  primary_location?: { source?: { display_name?: string }; landing_page_url?: string };
  doi?: string;
  id: string;
  type?: string;
}

const CHAMBER_LABEL = { an: "Assemblée nationale", senat: "Sénat", pe: "Parlement européen" } as const;

async function fetchJson(url: string, signal: AbortSignal, ms = 8000) {
  const t = AbortSignal.timeout(ms);
  const res = await fetch(url, { signal: AbortSignal.any([signal, t]) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const EXAMPLES = ["maintien de l'ordre", "liberté de manifester", "légitime défense", "attroupement"];

export function Research() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = (params.get("q") ?? "").trim();
  const [draft, setDraft] = useState(q);
  const [index, setIndex] = useState<IndexData | null>(null);
  const [wikiR, setWiki] = useState<Result<{ title: string; extract: string; url: string } | null> | null>(null);
  const [halR, setHal] = useState<Result<Work[]> | null>(null);
  const [oaR, setOpenalex] = useState<Result<Work[]> | null>(null);
  const wiki = live(wikiR, q, null);
  const hal = live(halR, q, [] as Work[]);
  const openalex = live(oaR, q, [] as Work[]);

  useEffect(() => {
    fetch("/recherche/index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex({ dossiers: [], votes: [] }));
  }, []);

  // Sources ouvertes interrogées en direct depuis le navigateur
  useEffect(() => {
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const s = ctrl.signal;

    fetchJson(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${enc(q)}&format=json&origin=*&srlimit=1`, s)
      .then(async (r) => {
        const title = r?.query?.search?.[0]?.title;
        if (!title) return setWiki({ q, state: "done", data: null });
        const sum = await fetchJson(`https://fr.wikipedia.org/api/rest_v1/page/summary/${enc(title.replace(/ /g, "_"))}`, s);
        setWiki({ q, state: "done", data: { title: sum.title, extract: sum.extract, url: sum.content_urls?.desktop?.page ?? `https://fr.wikipedia.org/wiki/${enc(title)}` } });
      })
      .catch(() => {
        if (!s.aborted) setWiki({ q, state: "error", data: null });
      });

    fetchJson(
      `https://api.archives-ouvertes.fr/search/?q=${enc(`"${q}"`)}&wt=json&rows=6&fl=title_s,uri_s,producedDateY_i,authFullName_s,docType_s,journalTitle_s`,
      s
    )
      .then((r) =>
        setHal({
          q,
          state: "done",
          data: (r?.response?.docs ?? []).map((d: Record<string, unknown>) => ({
            title: ([] as string[]).concat((d.title_s as string[]) ?? "")[0],
            authors: ((d.authFullName_s as string[]) ?? []).slice(0, 3).join(", ") + (((d.authFullName_s as string[]) ?? []).length > 3 ? " et al." : ""),
            year: d.producedDateY_i as number,
            venue: d.journalTitle_s as string,
            url: d.uri_s as string,
            source: "HAL" as const,
            kind: d.docType_s as string,
          })),
        })
      )
      .catch(() => {
        if (!s.aborted) setHal({ q, state: "error", data: [] });
      });

    fetchJson(
      `https://api.openalex.org/works?search=${enc(q)}&filter=language:fr&per-page=6&select=display_name,publication_year,authorships,primary_location,doi,id,type`,
      s
    )
      .then((r) =>
        setOpenalex({
          q,
          state: "done",
          data: ((r?.results ?? []) as OpenAlexWork[]).map((w) => ({
            title: w.display_name,
            authors:
              (w.authorships ?? []).slice(0, 3).map((a) => a.author?.display_name).join(", ") + ((w.authorships ?? []).length > 3 ? " et al." : ""),
            year: w.publication_year,
            venue: w.primary_location?.source?.display_name,
            url: w.doi ?? w.primary_location?.landing_page_url ?? w.id,
            source: "OpenAlex" as const,
            kind: w.type,
          })),
        })
      )
      .catch(() => {
        if (!s.aborted) setOpenalex({ q, state: "error", data: [] });
      });

    return () => ctrl.abort();
  }, [q]);

  const dossierHits = useMemo(() => {
    if (!index || q.length < 2) return [];
    const nq = normalize(q);
    return index.dossiers.filter(
      (d) =>
        matches(d.title, q) ||
        d.keywords.some((k) => matches(k, q) || nq.includes(normalize(k))) ||
        d.terms.some((t) => matches(t, q))
    );
  }, [index, q]);

  const voteHits = useMemo(() => {
    if (!index || q.length < 2) return [];
    const extra = dossierHits.flatMap((d) => d.keywords);
    return index.votes
      .filter((v) => matches(v.t, q) || extra.some((k) => k.split(" ").length > 1 && matches(v.t, k)))
      .sort((a, b) => b.d.localeCompare(a.d))
      .slice(0, 24);
  }, [index, q, dossierHits]);

  const submit = (value: string) => {
    const v = value.trim();
    setDraft(v);
    router.replace(v ? `${pathname}?q=${enc(v)}` : pathname, { scroll: false });
  };

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        className="flex gap-2"
      >
        <label htmlFor="q" className="sr-only">
          Sujet, notion juridique ou mot-clé
        </label>
        <input
          id="q"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Un sujet, une notion, un texte : « maintien de l'ordre », « fin de vie »…"
          className="min-w-0 flex-1 rounded-xl border border-rule-strong bg-surface px-4 py-3.5 text-lg placeholder:text-ink-faint"
        />
        <button type="submit" className="rounded-xl bg-ink px-5 text-base font-semibold text-paper hover:opacity-90">
          Rechercher
        </button>
      </form>

      {q.length < 2 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Exemples :{" "}
          {EXAMPLES.map((ex, i) => (
            <span key={ex}>
              <button type="button" onClick={() => submit(ex)} className="underline underline-offset-4 hover:text-ink">
                {ex}
              </button>
              {i < EXAMPLES.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      ) : (
        <div className="mt-10 space-y-12">
          {/* Vue d'ensemble */}
          <section aria-labelledby="r-dossiers">
            <h2 id="r-dossiers" className="narrow text-2xl font-bold">
              Vue d&apos;ensemble
            </h2>
            {dossierHits.length > 0 ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {dossierHits.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/recherche/${d.slug}`} className="block h-full rounded-xl border-2 border-ink bg-surface p-5 hover:bg-paper">
                      <span className="narrow text-2xl font-bold">{d.title}</span>
                      <span className="mt-1 block text-sm text-ink-soft">{d.subtitle}</span>
                      <span className="mt-3 block text-sm font-semibold text-velvet">Ouvrir le dossier sourcé</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 max-w-[70ch] text-ink-soft">
                Pas encore de dossier rédigé sur « {q} ». Les résultats ci-dessous viennent des sources ouvertes, sans synthèse :
                vérifiez chaque document à sa source.
              </p>
            )}
          </section>

          {/* Parlement */}
          <section aria-labelledby="r-parlement">
            <h2 id="r-parlement" className="narrow text-2xl font-bold">
              Au Parlement
            </h2>
            <p className="mt-1 text-sm text-ink-faint">Scrutins clés dont l&apos;intitulé correspond à la recherche, avec le vote de chaque élu.</p>
            {!index ? (
              <p className="mt-3 text-sm text-ink-soft">Chargement des scrutins…</p>
            ) : voteHits.length ? (
              <ul className="mt-4 divide-y divide-rule border-y border-rule">
                {voteHits.map((v) => (
                  <li key={v.c + v.id} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
                    <span className="text-sm text-ink-faint">
                      {CHAMBER_LABEL[v.c]}
                      <br />
                      {formatDate(v.d)}
                    </span>
                    <span>
                      <a href={v.u} target="_blank" rel="noreferrer" className="leading-snug hover:underline hover:underline-offset-4">
                        {v.t}
                      </a>
                      <span className={`ml-2 text-sm ${v.r === "adopté" ? "text-[var(--vote-pour)]" : "text-[var(--vote-contre)]"}`}>{v.r}</span>
                    </span>
                    <Link href={`/hemicycles/${v.c}?vote=${enc(v.id)}`} className="self-center text-sm font-semibold text-velvet underline underline-offset-4">
                      Voir qui a voté quoi
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">Aucun scrutin clé ne correspond à cet intitulé.</p>
            )}
          </section>

          {/* Définition */}
          <section aria-labelledby="r-def">
            <h2 id="r-def" className="narrow text-2xl font-bold">
              Repère encyclopédique
            </h2>
            <LiveState state={wiki.state} empty={!wiki.data} what="Wikipédia">
              {wiki.data && (
                <div className="mt-4 max-w-[75ch] rounded-xl border border-rule bg-surface p-5">
                  <p className="font-semibold">{wiki.data.title}</p>
                  <p className="mt-2 leading-relaxed text-ink-soft">{wiki.data.extract}</p>
                  <p className="mt-3 text-xs text-ink-faint">
                    Wikipédia est une encyclopédie collaborative, pas une source juridique : elle aide à situer la notion, qui se vérifie
                    dans les textes.{" "}
                    <a href={wiki.data.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                      Lire l&apos;article
                    </a>
                  </p>
                </div>
              )}
            </LiveState>
          </section>

          {/* Travaux universitaires */}
          <section aria-labelledby="r-doctrine">
            <h2 id="r-doctrine" className="narrow text-2xl font-bold">
              Travaux universitaires
            </h2>
            <p className="mt-1 text-sm text-ink-faint">
              Publications en français indexées par HAL (archive ouverte française) et OpenAlex. Ce sont des analyses, pas du droit
              positif.
            </p>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <WorkList title="HAL — archive ouverte" live={hal} />
              <WorkList title="OpenAlex — index mondial" live={openalex} />
            </div>
          </section>

          {/* Sources officielles */}
          <section aria-labelledby="r-officiel">
            <h2 id="r-officiel" className="narrow text-2xl font-bold">
              Chercher dans les sources officielles
            </h2>
            <p className="mt-1 max-w-[75ch] text-sm text-ink-faint">
              Ces bases n&apos;ouvrent pas leur moteur aux sites tiers : chaque lien lance la même recherche directement chez elles.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {deepLinks(q).map((g) => (
                <div key={g.group} className="rounded-xl border border-rule bg-surface p-4">
                  <p className="font-semibold">{g.group}</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {g.links.map((l) => (
                      <li key={l.url}>
                        <a href={l.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-velvet">
                          {l.label}
                        </a>
                        <span className="block text-xs text-ink-faint">{l.hint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function LiveState({ state, empty, what, children }: { state: string; empty: boolean; what: string; children: React.ReactNode }) {
  if (state === "loading") return <p className="mt-3 text-sm text-ink-soft">Interrogation de {what}…</p>;
  if (state === "error") return <p className="mt-3 text-sm text-ink-soft">{what} n&apos;a pas répondu. Réessayez dans un instant.</p>;
  if (state === "done" && empty) return <p className="mt-3 text-sm text-ink-soft">Aucun résultat sur {what}.</p>;
  return <>{children}</>;
}

function WorkList({ title, live }: { title: string; live: Live<Work[]> }) {
  return (
    <div className="rounded-xl border border-rule bg-surface">
      <p className="border-b border-rule px-4 py-2.5 text-sm font-semibold">{title}</p>
      <div className="px-4 pb-3">
        <LiveState state={live.state} empty={!live.data.length} what={title.split(" ")[0]}>
          <ul className="divide-y divide-rule">
            {live.data.map((w) => (
              <li key={w.url} className="py-3">
                <a href={w.url} target="_blank" rel="noreferrer" className="leading-snug hover:underline hover:underline-offset-4">
                  {w.title}
                </a>
                <p className="mt-1 text-xs text-ink-faint">
                  {[w.authors, w.venue, w.year].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </LiveState>
      </div>
    </div>
  );
}
