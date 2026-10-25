import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CHAMBERS, isChamber } from "@/lib/data";
import { MemberFiche } from "@/components/MemberFiche";

export function generateStaticParams() {
  return CHAMBERS.map((c) => ({ chamber: c.key }));
}

export const metadata = { title: "Fiche élu" };

export default async function EluPage({ params }: { params: Promise<{ chamber: string }> }) {
  const { chamber } = await params;
  if (!isChamber(chamber)) notFound();
  const label = CHAMBERS.find((c) => c.key === chamber)!.label;
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-ink-soft sm:px-6">Chargement de la fiche…</div>}>
      <MemberFiche chamber={chamber} label={label} />
    </Suspense>
  );
}
