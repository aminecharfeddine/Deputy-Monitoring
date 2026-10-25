import type { Metadata } from "next";
import { CHAMBERS, loadChamber } from "@/lib/data";
import { formatDate, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Sources et méthode" };

export default function Methodologie() {
  const chambers = CHAMBERS.map((c) => ({ ...c, data: loadChamber(c.key) }));
  return (
    <article className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <h1 className="narrow text-5xl font-bold leading-none">Sources et méthode</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        Le site ne contient que des données publiques officielles, transformées sans interprétation. Aucune position n&apos;est
        résumée ou déduite par une IA : les positions affichées sont des votes nominatifs, chacun relié à son scrutin
        d&apos;origine.
      </p>

      <h2 className="narrow mt-12 text-3xl font-bold">Sources par institution</h2>
      <div className="mt-4 space-y-6">
        {chambers.map((c) => (
          <section key={c.key} className="rounded-xl border border-rule bg-surface p-5">
            <h3 className="text-lg font-semibold">{c.label}</h3>
            {c.data ? (
              <>
                <p className="mt-1 text-sm text-ink-faint">
                  Collecte du {formatDate(c.data.generatedAt)} : {plural(c.data.members.length, c.data.memberLabel)},{" "}
                  {plural(c.data.votes.length, "scrutin clé", "scrutins clés")}.
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {c.data.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                        {s.label}
                      </a>
                      <span className="text-ink-faint"> — {s.licence}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">Pas encore de données collectées.</p>
            )}
          </section>
        ))}
      </div>

      <h2 className="narrow mt-12 text-3xl font-bold">Quels votes sont retenus</h2>
      <div className="mt-4 space-y-4 leading-relaxed">
        <p>
          À l&apos;Assemblée et au Sénat, seuls les scrutins publics qui tranchent une question d&apos;ensemble sont retenus :
          vote sur l&apos;ensemble d&apos;un texte ou sur son article unique, propositions de résolution, déclarations du
          Gouvernement et motions de censure. Les votes sur les amendements et les motions de procédure sont écartés, car
          ils sont trop nombreux et souvent tactiques.
        </p>
        <p>
          Au Parlement européen, ce sont les votes principaux de la 10e législature (depuis juillet 2024) recensés par
          HowTheyVote.eu, hors décharges budgétaires.
        </p>
        <p>
          Pour une motion de censure, seuls les votes « pour » sont décomptés. Un élu qui ne figure pas parmi les votants
          ne l&apos;a donc pas votée.
        </p>
      </div>

      <h2 className="narrow mt-12 text-3xl font-bold">Comment lire une fiche</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 leading-relaxed">
        <li>
          <strong>Thèmes.</strong> Chaque scrutin est classé automatiquement selon des mots-clés de son intitulé (et, au
          Parlement européen, selon les sujets de l&apos;Observatoire législatif). Un même texte peut relever de plusieurs
          thèmes. Le classement peut se tromper : l&apos;intitulé exact et le lien officiel font foi.
        </li>
        <li>
          <strong>Position du groupe.</strong> À l&apos;Assemblée, c&apos;est la position majoritaire publiée par
          l&apos;Assemblée. Au Sénat et au Parlement européen, elle est calculée à partir des votes des membres actuels du
          groupe.
        </li>
        <li>
          <strong>Alignement.</strong> Part des votes exprimés de l&apos;élu identiques à la position majoritaire de son
          groupe actuel. Un élu qui a changé de groupe peut donc apparaître moins aligné.
        </li>
        <li>
          <strong>Absences.</strong> À l&apos;Assemblée, un député qui n&apos;a pas voté n&apos;apparaît pas dans la liste
          nominative : « pas de vote enregistré » ne distingue pas une absence d&apos;un choix de ne pas voter.
        </li>
        <li>
          <strong>Un vote n&apos;est pas une opinion.</strong> Voter contre un texte peut exprimer un désaccord avec une
          seule de ses mesures. Les déclarations publiques et les interventions en séance ne sont pas couvertes.
        </li>
      </ul>

      <h2 className="narrow mt-12 text-3xl font-bold">Mise à jour</h2>
      <p className="mt-4 leading-relaxed">
        Une tâche automatique télécharge les sources chaque lundi matin, régénère les fichiers et redéploie le site. Si une
        source est indisponible, les données précédentes sont conservées et la date de collecte ci-dessus l&apos;indique.
      </p>
    </article>
  );
}
