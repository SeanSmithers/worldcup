import { useMemo, useState } from "react";
import type { Match } from "../api/types";
import type { Player } from "../lib/sweepstakes";
import { MatchCard } from "./MatchCard";

interface Props {
  matches: Match[];
  ownersByCode: Map<string, Player[]>;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function ResultsSection({ matches, ownersByCode }: Props) {
  const [showAll, setShowAll] = useState(false);

  const recent = useMemo(() => {
    const cutoff = Date.now() - ONE_DAY_MS;
    return matches.filter((m) => new Date(m.date).getTime() > cutoff);
  }, [matches]);

  if (matches.length === 0) return null;

  const visible = showAll ? matches : recent;
  const title = showAll ? "All Results" : "Recent Results";
  const hasOlder = matches.length > recent.length;

  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-1.5 px-1">
        <h2 className="font-semibold uppercase tracking-wide text-sm text-ink-900/70 dark:text-ink-50/70">
          {title}
        </h2>
        {hasOlder && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide px-2.5 py-1 border border-flagblue-500/60 text-flagblue-500 dark:border-flagblue-400/70 dark:text-flagblue-400 hover:bg-flagblue-500 hover:text-white dark:hover:bg-flagblue-400 dark:hover:text-ink-900 transition-colors"
          >
            {showAll ? "Show recent" : "Show all"}
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-ink-900/60 dark:text-ink-50/60 px-1 py-3">
          No results in the last 24 hours.{hasOlder ? " Tap “Show all” to see earlier matches." : ""}
        </p>
      ) : (
        <div className="border-y border-ink-900/15 dark:border-ink-50/15 bg-white/40 dark:bg-ink-800/40 divide-y divide-ink-900/10 dark:divide-ink-50/10">
          {visible.map((m) => (
            <MatchCard key={m.id} match={m} ownersByCode={ownersByCode} />
          ))}
        </div>
      )}
    </section>
  );
}
