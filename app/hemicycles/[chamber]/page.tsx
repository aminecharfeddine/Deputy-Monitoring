import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CHAMBERS, isChamber, loadChamber } from "@/lib/data";
import { formatDate, plural } from "@/lib/format";
import { Hemicycle } from "@/components/Hemicycle";
import type { SeatMember } from "@/lib/types";

export function generateStaticParams() {
  return CHAMBERS.map((c) => ({ chamber: c.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ chamber: string }> }): Promise<Metadata> {
  const { chamber } = await params;
  const c = CHAMBERS.find((x) => x.key === chamber);
  return { title: c ? `Hémicycle — ${c.label}` : "Hémicycle" };
}

export default async function ChamberPage({ params }: { params: Promise<{ chamber: string }> }) {
  const { chamber } = await params;
  if (!isChamber(chamber)) notFound();
  const data = loadChamber(chamber);
  const meta = CHAMBERS.find((c) => c.key === chamber)!;

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="narrow text-4xl font-bold">{meta.label}</h1>
        <p className="mt-4 text-ink-soft">
          Les données de cette institution n&apos;ont pas encore été collectées. Lancez le workflow « Mise à jour des
          données » depuis l&apos;onglet Actions du dépôt GitHub.
        </p>
      </div>
    );
  }

  const order = new Map(data.groups.map((g) => [g.id, g.order]));
  const seats: SeatMember[] = [...data.members]
    .sort((a, b) => (order.get(a.group) ?? 99) - (order.get(b.group) ?? 99) || a.sort.localeCompare(b.sort, "fr"))
    .map((m) => ({ id: m.id, name: m.name, group: m.group, area: m.area, country: m.country, photo: m.photo }));

  const countries =
    chamber === "pe"
      ? [...new Map(data.members.map((m) => [m.country!, m.area])).entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"))
      : [];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div>
          <h1 className="narrow text-4xl font-bold leading-none sm:text-5xl">{data.label}</h1>
          <p className="mt-2 text-ink-soft">
            {plural(data.members.length, data.memberLabel)} en exercice. {data.legislature}.
          </p>
        </div>
        <p className="text-sm text-ink-faint">
          Données du {formatDate(data.generatedAt)}, {plural(data.votes.length, "scrutin clé", "scrutins clés")} jusqu&apos;au{" "}
          {formatDate(data.votes[0]?.date)}
        </p>
      </div>

      <Suspense fallback={<div className="mt-6 aspect-[2/1] w-full" />}>
      <Hemicycle
        chamber={chamber}
        memberLabel={data.memberLabel}
        groups={data.groups}
        members={seats}
        topics={data.topics}
        countries={countries}
      />
      </Suspense>
    </div>
  );
}
