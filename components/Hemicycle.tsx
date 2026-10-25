"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Photo } from "./Photo";
import { layoutSeats } from "@/lib/hemicycle";
import { POSITION_COLOR, POSITION_LABEL, formatDate, plural } from "@/lib/format";
import type { ChamberKey, Group, Position, SeatMember, Topic, Vote } from "@/lib/types";

interface VoteData {
  votes: Vote[];
  positions: Record<string, string>;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const W = 1000;
const H = 540;
const toX = (x: number) => W / 2 + x * (W / 2 - 14);
const toY = (y: number) => H - 22 + y * (H - 40);

export function Hemicycle({
  chamber,
  memberLabel,
  groups,
  members,
  topics,
  countries,
}: {
  chamber: ChamberKey;
  memberLabel: string;
  groups: Group[];
  members: SeatMember[];
  topics: Topic[];
  countries: [string, string][];
}) {
  const router = useRouter();
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const { seats, dot } = useMemo(() => layoutSeats(members.length), [members.length]);

  const [mode, setMode] = useState<"groupe" | "vote">("groupe");
  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [topic, setTopic] = useState<string>("");
  const [voteId, setVoteId] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("");
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "vote" || voteData) return;
    fetch(`/data/${chamber}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: VoteData) => {
        setVoteData({ votes: d.votes, positions: d.positions });
        setVoteId((v) => v || d.votes[0]?.id || "");
      })
      .catch(() => setLoadError(true));
  }, [mode, voteData, chamber]);

  const filteredVotes = useMemo(
    () => (voteData ? voteData.votes.filter((v) => !topic || v.topics.includes(topic)) : []),
    [voteData, topic]
  );
  const voteIndex = voteData ? voteData.votes.findIndex((v) => v.id === voteId) : -1;
  const vote = voteIndex >= 0 ? voteData!.votes[voteIndex] : null;
  const positionOf = (id: string): Position =>
    vote ? ((voteData!.positions[id]?.[voteIndex] as Position) ?? "-") : "-";

  const q = norm(query.trim());
  const matches = q.length >= 2 ? members.filter((m) => norm(m.name).includes(q)).slice(0, 8) : [];
  const matchIds = new Set(matches.map((m) => m.id));

  const isDimmed = (m: SeatMember) =>
    (groupFilter !== null && m.group !== groupFilter) ||
    (country !== "" && m.country !== country) ||
    (q.length >= 2 && !matchIds.has(m.id));

  const fillOf = (m: SeatMember) => {
    if (mode === "vote" && vote) {
      const p = positionOf(m.id);
      if (vote.kind === "censure" && p === "-") return "var(--vote-absent)";
      return POSITION_COLOR[p];
    }
    return groupById.get(m.group)?.color ?? "#8D949A";
  };

  const voteTally = useMemo(() => {
    if (!vote || !voteData) return null;
    const t: Record<Position, number> = { P: 0, C: 0, A: 0, N: 0, "-": 0 };
    for (const m of members) {
      if (groupFilter && m.group !== groupFilter) continue;
      if (country && m.country !== country) continue;
      t[(voteData.positions[m.id]?.[voteIndex] as Position) ?? "-"]++;
    }
    return t;
  }, [vote, voteData, voteIndex, members, groupFilter, country]);

  const focused = members.find((m) => m.id === hovered) ?? null;

  return (
    <section className="mt-6">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-3 border-y border-rule py-3">
        <div className="flex rounded-lg border border-rule bg-surface p-0.5 text-sm" role="group" aria-label="Couleur des sièges">
          {(["groupe", "vote"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md px-3 py-1.5 ${mode === m ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
            >
              {m === "groupe" ? "Par groupe" : "Par vote"}
            </button>
          ))}
        </div>

        {mode === "vote" && (
          <>
            <label className="sr-only" htmlFor="topic">
              Thème
            </label>
            <select
              id="topic"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                const first = voteData?.votes.find((v) => !e.target.value || v.topics.includes(e.target.value));
                if (first) setVoteId(first.id);
              }}
              className="rounded-lg border border-rule bg-surface px-3 py-2 text-sm"
            >
              <option value="">Tous les thèmes</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="vote">
              Scrutin
            </label>
            <select
              id="vote"
              value={voteId}
              onChange={(e) => setVoteId(e.target.value)}
              disabled={!voteData}
              className="min-w-0 flex-1 basis-72 truncate rounded-lg border border-rule bg-surface px-3 py-2 text-sm"
            >
              {!voteData && <option>{loadError ? "Impossible de charger les scrutins" : "Chargement des scrutins…"}</option>}
              {filteredVotes.map((v) => (
                <option key={v.id} value={v.id}>
                  {formatDate(v.date, { day: "2-digit", month: "2-digit", year: "numeric" })} — {v.title.slice(0, 140)}
                </option>
              ))}
            </select>
          </>
        )}

        {countries.length > 0 && (
          <>
            <label className="sr-only" htmlFor="country">
              Pays
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-lg border border-rule bg-surface px-3 py-2 text-sm"
            >
              <option value="">Tous les pays</option>
              {countries.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </>
        )}

        <div className={`relative ${mode === "vote" ? "basis-full sm:basis-64" : "ml-auto basis-full sm:basis-72"}`}>
          <label className="sr-only" htmlFor="search">
            Rechercher un élu
          </label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Rechercher un ${memberLabel}`}
            className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-sm placeholder:text-ink-faint"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full select-none"
            role="img"
            aria-label={`Hémicycle de ${members.length} sièges${mode === "vote" && vote ? `, coloré selon le scrutin : ${vote.title}` : ", coloré par groupe politique"}`}
            onMouseLeave={() => setHovered(null)}
          >
            {members.map((m, i) => {
              const s = seats[i];
              if (!s) return null;
              const dim = isDimmed(m);
              const active = hovered === m.id;
              return (
                <circle
                  key={m.id}
                  className="seat"
                  cx={toX(s.x)}
                  cy={toY(s.y)}
                  r={dot * (W / 2) * (active ? 1.45 : 1)}
                  fill={fillOf(m)}
                  stroke={active ? "var(--ink)" : "none"}
                  strokeWidth={active ? 2 : 0}
                  opacity={dim ? 0.13 : 1}
                  onMouseEnter={() => setHovered(m.id)}
                  onClick={() => router.push(`/${chamber}/${m.id}`)}
                >
                  <title>{`${m.name} — ${groupById.get(m.group)?.short ?? ""}`}</title>
                </circle>
              );
            })}
            <text x={W / 2} y={H - 30} textAnchor="middle" className="narrow" fontSize="64" fontWeight="700" fill="var(--ink)">
              {(groupFilter || country || q.length >= 2 ? members.filter((m) => !isDimmed(m)).length : members.length).toLocaleString("fr-FR")}
            </text>
            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="17" fill="var(--ink-faint)">
              {groupFilter || country || q.length >= 2 ? "sièges sélectionnés" : "sièges"}
            </text>
          </svg>

          {/* Légende des groupes, de gauche à droite comme dans l'hémicycle */}
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Groupes politiques">
            {groups.map((g) => {
              const on = groupFilter === g.id;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setGroupFilter(on ? null : g.id)}
                    aria-pressed={on}
                    title={g.name}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      on ? "border-ink bg-ink text-paper" : "border-rule bg-surface text-ink hover:border-rule-strong"
                    }`}
                  >
                    <span className="size-2.5 rounded-full" style={{ background: g.color }} aria-hidden />
                    <span className="font-semibold">{g.short}</span>
                    <span className={`tabular ${on ? "text-paper/70" : "text-ink-faint"}`}>{g.count}</span>
                  </button>
                </li>
              );
            })}
            {groupFilter && (
              <li>
                <button type="button" onClick={() => setGroupFilter(null)} className="px-2 py-1.5 text-sm text-ink-soft underline underline-offset-4">
                  Afficher tous les groupes
                </button>
              </li>
            )}
          </ul>

          {mode === "vote" && vote && voteTally && (
            <div className="mt-6 rounded-xl border border-rule bg-surface p-5">
              <p className="text-sm text-ink-faint">
                Scrutin n° {vote.num} du {formatDate(vote.date)} ·{" "}
                <span className={vote.result === "adopté" ? "text-[var(--vote-pour)]" : "text-[var(--vote-contre)]"}>
                  {vote.result === "adopté" ? "Adopté" : vote.result === "rejeté" ? "Rejeté" : "Résultat non précisé"}
                </span>
              </p>
              <p className="mt-1 font-semibold leading-snug">{vote.title}</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {(vote.kind === "censure" ? (["P", "-"] as Position[]) : (["P", "C", "A", "N", "-"] as Position[])).map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: POSITION_COLOR[p] }} aria-hidden />
                    {vote.kind === "censure" ? (p === "P" ? "Pour la censure" : "Ne l'ont pas votée") : POSITION_LABEL[p]}
                    <span className="tabular font-semibold">{voteTally[p]}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <a href={vote.url} target="_blank" rel="noreferrer" className="font-semibold text-velvet underline underline-offset-4">
                  {chamber === "pe" ? "Détail sur HowTheyVote.eu" : "Voir le scrutin sur le site officiel"}
                </a>
                {vote.officialUrl && (
                  <a href={vote.officialUrl} target="_blank" rel="noreferrer" className="text-ink-soft underline underline-offset-4">
                    Texte adopté (europarl.europa.eu)
                  </a>
                )}
              </div>
              {chamber === "pe" && <p className="mt-3 text-xs text-ink-faint">Intitulés en anglais, tels que publiés par la source.</p>}
            </div>
          )}
        </div>

        {/* Panneau latéral */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          {matches.length > 0 && (
            <div className="mb-4 rounded-xl border border-rule bg-surface">
              <p className="border-b border-rule px-4 py-2 text-sm text-ink-faint">{plural(matches.length, "résultat")}</p>
              <ul>
                {matches.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/${chamber}/${m.id}`}
                      onMouseEnter={() => setHovered(m.id)}
                      onFocus={() => setHovered(m.id)}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-paper"
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupById.get(m.group)?.color }} aria-hidden />
                      <span className="font-medium">{m.name}</span>
                      <span className="ml-auto text-sm text-ink-faint">{groupById.get(m.group)?.short}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {q.length >= 2 && matches.length === 0 && (
            <p className="mb-4 rounded-xl border border-rule bg-surface px-4 py-3 text-sm text-ink-soft">
              Aucun {memberLabel} ne correspond à « {query} ». Vérifiez l&apos;orthographe ou essayez le nom seul.
            </p>
          )}

          {focused ? (
            <MemberCard
              member={focused}
              group={groupById.get(focused.group)}
              chamber={chamber}
              position={mode === "vote" && vote ? positionOf(focused.id) : null}
              censure={vote?.kind === "censure"}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-rule-strong px-5 py-6 text-sm leading-relaxed text-ink-soft">
              <p className="font-semibold text-ink">Survolez un siège pour identifier l&apos;élu.</p>
              <p className="mt-2">
                Un clic ouvre sa fiche : ses votes sur les grands textes, classés par thème, avec le lien vers chaque scrutin
                officiel.
              </p>
              <p className="mt-2">
                Cliquez sur un groupe pour l&apos;isoler, ou passez en mode « Par vote » pour voir comment chacun a voté sur un
                texte.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function MemberCard({
  member,
  group,
  chamber,
  position,
  censure,
}: {
  member: SeatMember;
  group?: Group;
  chamber: ChamberKey;
  position: Position | null;
  censure?: boolean;
}) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <div className="flex gap-4">
        <Photo key={member.id} src={member.photo} alt="" size={72} className="size-[72px] shrink-0 rounded-lg bg-paper object-cover" />
        <div className="min-w-0">
          <p className="narrow text-2xl font-bold leading-tight">{member.name}</p>
          {group && (
            <p className="mt-1 flex items-center gap-2 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: group.color }} aria-hidden />
              <span>{group.name}</span>
            </p>
          )}
          <p className="mt-1 text-sm text-ink-faint">{member.area}</p>
        </div>
      </div>
      {position && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
          <span className="size-2.5 rounded-full" style={{ background: POSITION_COLOR[position] }} aria-hidden />
          {censure ? (position === "P" ? "A voté la censure" : "N'a pas voté la censure") : POSITION_LABEL[position]}
        </p>
      )}
      <Link
        href={`/${chamber}/${member.id}`}
        className="mt-4 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper hover:opacity-90"
      >
        Voir la fiche et les votes
      </Link>
    </div>
  );
}
