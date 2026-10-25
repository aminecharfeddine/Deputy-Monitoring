import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CHAMBERS, isChamber, loadChamber } from "@/lib/data";
import { formatDate, plural } from "@/lib/format";
import { Photo } from "@/components/Photo";
import { TopicVotes, type TopicBlock, type VoteRow } from "@/components/TopicVotes";
import type { Position } from "@/lib/types";

export function generateStaticParams() {
  return CHAMBERS.flatMap((c) => (loadChamber(c.key)?.members ?? []).map((m) => ({ chamber: c.key, id: m.id })));
}

export async function generateMetadata({ params }: { params: Promise<{ chamber: string; id: string }> }): Promise<Metadata> {
  const { chamber, id } = await params;
  const m = isChamber(chamber) ? loadChamber(chamber)?.members.find((x) => x.id === id) : null;
  return { title: m ? `${m.name} — votes et positions` : "Fiche élu" };
}

export default async function MemberPage({ params }: { params: Promise<{ chamber: string; id: string }> }) {
  const { chamber, id } = await params;
  if (!isChamber(chamber)) notFound();
  const data = loadChamber(chamber);
  const member = data?.members.find((m) => m.id === id);
  if (!data || !member) notFound();

  const group = data.groups.find((g) => g.id === member.group);
  const pos = data.positions[member.id] ?? "";
  const since = member.since ?? "";

  const rows: VoteRow[] = [];
  data.votes.forEach((v, i) => {
    let p = (pos[i] ?? "-") as Position;
    if (v.date < since) return; // avant le début du mandat
    if (p === "-" && !since) return; // hors mandat (Sénat, PE)
    const groupPos = data.groupPositions[i]?.[member.group] ?? null;
    if (v.kind === "censure" && p === "-") p = "N"; // n'a pas voté la censure
    rows.push({
      id: v.id,
      num: v.num,
      date: v.date,
      title: v.title,
      kind: v.kind,
      result: v.result,
      url: v.url,
      officialUrl: v.officialUrl ?? null,
      topics: v.topics,
      pos: p,
      groupPos,
    });
  });

  const expressed = rows.filter((r) => r.pos === "P" || r.pos === "C" || r.pos === "A");
  const comparable = expressed.filter((r) => r.groupPos && r.kind !== "censure");
  const aligned = comparable.filter((r) => r.pos === r.groupPos).length;
  const loyalty = comparable.length ? Math.round((aligned / comparable.length) * 100) : null;
  const participation = rows.filter((r) => r.kind !== "censure").length
    ? Math.round((expressed.filter((r) => r.kind !== "censure").length / rows.filter((r) => r.kind !== "censure").length) * 100)
    : null;

  // Censure et confiance en dernier : les thèmes de fond d'abord
  const topicOrder = [...data.topics.filter((t) => t.id !== "gouvernement" && t.id !== "autres"), ...data.topics.filter((t) => t.id === "gouvernement" || t.id === "autres")];
  const blocks: TopicBlock[] = topicOrder
    .map((t) => ({ id: t.id, label: t.label, rows: rows.filter((r) => r.topics.includes(t.id)) }))
    .filter((b) => b.rows.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <nav aria-label="Fil d'Ariane" className="text-sm text-ink-soft">
        <Link href={`/hemicycles/${chamber}`} className="underline-offset-4 hover:text-ink hover:underline">
          {data.label}
        </Link>
        <span className="mx-2 text-ink-faint">/</span>
        <span>{member.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Identité */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Photo src={member.photo} alt={`Portrait officiel de ${member.name}`} size={160} className="mb-5 size-40 rounded-xl bg-surface object-cover" />
          <h1 className="narrow text-4xl font-bold leading-[1.02]">{member.name}</h1>
          {group && (
            <p className="mt-3 flex items-start gap-2">
              <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: group.color }} aria-hidden />
              <span>
                {group.name} <span className="text-ink-faint">({group.short})</span>
              </span>
            </p>
          )}
          <dl className="mt-5 space-y-3 border-t border-rule pt-5 text-sm">
            {member.area && (
              <div>
                <dt className="text-ink-faint">{chamber === "pe" ? "Élu en" : "Circonscription"}</dt>
                <dd>{member.area}</dd>
              </div>
            )}
            {member.region && (
              <div>
                <dt className="text-ink-faint">{chamber === "pe" ? "Parti national" : "Région"}</dt>
                <dd>{member.region}</dd>
              </div>
            )}
            {member.commission && (
              <div>
                <dt className="text-ink-faint">Commission permanente</dt>
                <dd>{member.commission}</dd>
              </div>
            )}
            {member.since && (
              <div>
                <dt className="text-ink-faint">En fonction depuis</dt>
                <dd>{formatDate(member.since)}</dd>
              </div>
            )}
            {member.profession && (
              <div>
                <dt className="text-ink-faint">Profession déclarée</dt>
                <dd>{member.profession}</dd>
              </div>
            )}
          </dl>
          <ul className="mt-5 space-y-2 border-t border-rule pt-5 text-sm">
            <li>
              <a href={member.url} target="_blank" rel="noreferrer" className="font-semibold text-velvet underline underline-offset-4">
                Fiche officielle
              </a>
            </li>
            {member.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="text-ink-soft underline underline-offset-4 hover:text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Votes */}
        <div className="min-w-0">
          <h2 className="narrow text-3xl font-bold">Positions par thème</h2>
          <p className="mt-2 max-w-[68ch] text-ink-soft">
            Votes nominatifs de {member.name} sur les scrutins clés : votes sur l&apos;ensemble des textes,{" "}
            {chamber === "pe" ? "votes finaux en plénière" : "articles uniques, résolutions et motions de censure"}. Chaque
            ligne renvoie au scrutin officiel.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-rule bg-rule sm:grid-cols-3">
            <Stat label="Scrutins clés pendant le mandat" value={rows.length.toLocaleString("fr-FR")} />
            <Stat
              label="Participation"
              value={participation === null ? "—" : `${participation} %`}
              note="Part des scrutins clés où l'élu a voté pour, contre ou s'est abstenu."
            />
            <Stat
              label={`Alignement sur ${group?.short ?? "son groupe"}`}
              value={loyalty === null ? "—" : `${loyalty} %`}
              note={comparable.length ? `Sur ${plural(comparable.length, "vote exprimé", "votes exprimés")}, comparé à la position majoritaire du groupe.` : undefined}
            />
          </dl>

          <div className="mt-6 rounded-xl border border-rule bg-surface px-5 py-4 text-sm leading-relaxed text-ink-soft">
            Un vote porte sur un texte entier, qui mêle souvent plusieurs mesures : il indique une position sur ce texte, pas
            une opinion détaillée sur chaque sujet. Le classement par thème est automatique, à partir de l&apos;intitulé du
            scrutin{chamber === "pe" ? " et des sujets de l'Observatoire législatif du Parlement européen" : ""}.
          </div>

          <TopicVotes blocks={blocks} chamber={chamber} groupShort={group?.short ?? "Groupe"} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-sm text-ink-faint">{label}</dt>
      <dd className="narrow tabular mt-1 text-3xl font-bold">{value}</dd>
      {note && <dd className="mt-1 text-xs leading-snug text-ink-faint">{note}</dd>}
    </div>
  );
}
