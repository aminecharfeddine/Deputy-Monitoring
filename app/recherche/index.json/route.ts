import { CHAMBERS, loadChamber } from "@/lib/data";
import { loadDossiers } from "@/lib/dossiers";

/** Index statique (généré au build) pour la recherche côté navigateur. */
export async function GET() {
  const dossiers = loadDossiers().map((d) => ({
    slug: d.slug,
    title: d.title,
    subtitle: d.subtitle,
    keywords: d.keywords,
    terms: d.definitions.map((x) => x.term),
  }));
  const votes = CHAMBERS.flatMap((c) =>
    (loadChamber(c.key)?.votes ?? []).map((v) => ({
      c: c.key,
      id: v.id,
      d: v.date,
      t: v.title,
      r: v.result,
      u: v.url,
      k: v.kind,
    }))
  );
  return Response.json({ dossiers, votes });
}
