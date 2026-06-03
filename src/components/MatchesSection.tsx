import type { Match } from "../api/types";
import type { Player } from "../lib/sweepstakes";
import { MatchCard } from "./MatchCard";

interface Props {
  title: string;
  matches: Match[];
  ownersByCode: Map<string, Player[]>;
}

export function MatchesSection({ title, matches, ownersByCode }: Props) {
  if (matches.length === 0) return null;
  return (
    <section>
      <h2 className="font-semibold uppercase tracking-wide text-sm text-ink-900/70 dark:text-ink-50/70 mb-1.5 px-1">
        {title}
      </h2>
      <div className="border-y border-ink-900/15 dark:border-ink-50/15 bg-white/40 dark:bg-ink-800/40 divide-y divide-ink-900/10 dark:divide-ink-50/10">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} ownersByCode={ownersByCode} />
        ))}
      </div>
    </section>
  );
}
