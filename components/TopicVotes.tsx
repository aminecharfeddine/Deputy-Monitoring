"use client";

import { useState } from "react";
import { POSITION_COLOR, formatDate, plural } from "@/lib/format";
import type { ChamberKey, Position } from "@/lib/types";

export interface VoteRow {
  id: string;
  num: number;
  date: string;
  title: string;
  kind: "texte" | "censure";
  result: string;
  url: string;
  officialUrl: string | null;
  topics: string[];
  pos: Position;
  groupPos: Position | null;
}

export interface TopicBlock {
  id: string;
  label: string;
  rows: VoteRow[];
}

const LABEL: Record<Position, string> = {
  P: "Pour",
  C: "Contre",
  A: "Abstention",
  N: "Non-votant",
  "-": "Pas de vote",
};

const labelFor = (r: VoteRow, p: Position) =>
  r.kind === "censure" ? (p === "P" ? "Pour la censure" : "Ne l'a pas votée") : LABEL[p];

const ORDER: Position[] = ["P", "C", "A", "N", "-"];

export function TopicVotes({ blocks, chamber, groupShort }: { blocks: TopicBlock[]; chamber: ChamberKey; groupShort: string }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(blocks.slice(0, 1).map((b) => b.id)));
  const [hideNoVote, setHideNoVote] = useState(true);
  const hasNoVote = blocks.some((b) => b.rows.some((r) => r.pos === "-"));

  if (!blocks.length) {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-rule-strong px-5 py-6 text-ink-soft">
        Aucun scrutin clé n&apos;a encore eu lieu depuis le début du mandat de cet élu. Ses votes apparaîtront après la
        prochaine mise à jour hebdomadaire des données.
      </p>
    );
  }

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft" aria-label="Légende des votes">
          {(["P", "C", "A", "N"] as Position[]).map((p) => (
            <li key={p} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: POSITION_COLOR[p] }} aria-hidden />
              {LABEL[p]}
            </li>
          ))}
          {hasNoVote && (
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-rule-strong" style={{ background: POSITION_COLOR["-"] }} aria-hidden />
              Pas de vote enregistré
            </li>
          )}
        </ul>
        <div className="flex gap-3 text-sm">
          {hasNoVote && (
            <label className="flex items-center gap-2 text-ink-soft">
              <input type="checkbox" checked={hideNoVote} onChange={(e) => setHideNoVote(e.target.checked)} className="accent-[var(--ink)]" />
              Masquer les scrutins sans vote
            </label>
          )}
          <button
            type="button"
            onClick={() => setOpen(open.size === blocks.length ? new Set() : new Set(blocks.map((b) => b.id)))}
            className="text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            {open.size === blocks.length ? "Tout replier" : "Tout déplier"}
          </button>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {blocks.map((b) => {
          const counts = Object.fromEntries(ORDER.map((p) => [p, b.rows.filter((r) => r.pos === p).length])) as Record<Position, number>;
          const visible = hideNoVote ? b.rows.filter((r) => r.pos !== "-") : b.rows;
          const isOpen = open.has(b.id);
          const isCensure = b.id === "gouvernement";
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => toggle(b.id)}
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-4 text-left sm:grid-cols-[minmax(0,1fr)_220px_auto]"
              >
                <span>
                  <span className="narrow text-xl font-bold">{b.label}</span>
                  <span className="ml-2 text-sm text-ink-faint">{plural(b.rows.length, "scrutin")}</span>
                </span>
                <span className="col-span-2 flex h-2.5 overflow-hidden rounded-full bg-[var(--vote-absent)] sm:col-span-1" aria-hidden>
                  {ORDER.map((p) =>
                    counts[p] ? <span key={p} style={{ width: `${(counts[p] / b.rows.length) * 100}%`, background: POSITION_COLOR[p] }} /> : null
                  )}
                </span>
                <span className="tabular row-start-1 text-right text-sm text-ink-soft sm:col-start-3">
                  {isCensure
                    ? `${counts.P} censure${counts.P > 1 ? "s" : ""} votée${counts.P > 1 ? "s" : ""}`
                    : `${counts.P} pour · ${counts.C} contre · ${counts.A} abst.`}
                  <span className="ml-3 inline-block w-3 text-ink" aria-hidden>
                    {isOpen ? "−" : "+"}
                  </span>
                </span>
              </button>

              {isOpen && (
                <ol className="mb-5 space-y-px overflow-hidden rounded-xl border border-rule bg-rule">
                  {visible.length === 0 && (
                    <li className="bg-surface px-4 py-3 text-sm text-ink-soft">Aucun vote enregistré sur ce thème.</li>
                  )}
                  {visible.map((r) => (
                    <li key={r.id} className="grid gap-x-5 gap-y-2 bg-surface px-4 py-3 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
                      <div className="min-w-0">
                        <p className="text-xs text-ink-faint">
                          {formatDate(r.date)} · n° {r.num} ·{" "}
                          <span className={r.result === "adopté" ? "text-[var(--vote-pour)]" : "text-[var(--vote-contre)]"}>
                            {r.result === "adopté" ? "adopté" : r.result === "rejeté" ? "rejeté" : ""}
                          </span>
                        </p>
                        <a href={r.url} target="_blank" rel="noreferrer" className="mt-0.5 block leading-snug hover:underline hover:underline-offset-4">
                          {r.title}
                        </a>
                        {r.officialUrl && (
                          <a href={r.officialUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-ink-soft underline underline-offset-4">
                            Texte adopté
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold sm:justify-start">
                        <span className="size-3 shrink-0 rounded-full" style={{ background: POSITION_COLOR[r.pos] }} aria-hidden />
                        {labelFor(r, r.pos)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-ink-soft">
                        {r.groupPos && r.kind !== "censure" ? (
                          <>
                            <span className="size-2 shrink-0 rounded-full" style={{ background: POSITION_COLOR[r.groupPos] }} aria-hidden />
                            {groupShort} : {LABEL[r.groupPos].toLowerCase()}
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
      {chamber === "pe" && <p className="mt-3 text-xs text-ink-faint">Intitulés en anglais, tels que publiés par HowTheyVote.eu.</p>}
    </div>
  );
}
