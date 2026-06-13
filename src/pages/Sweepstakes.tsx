import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Header } from "../components/Header";
import { MatchesSection } from "../components/MatchesSection";
import { ResultsSection } from "../components/ResultsSection";
import { StandingsTable } from "../components/StandingsTable";
import { useSweepstakes } from "../hooks/useSweepstakes";
import { computePlayerStandings, type Player } from "../lib/sweepstakes";

const DEFAULT_GROUP = "development";

export function Sweepstakes() {
  const params = useParams<{ id?: string }>();
  const groupId = params.id ?? DEFAULT_GROUP;
  const { players, snapshot, loading, error } = useSweepstakes(groupId);

  const playerStandings = useMemo(() => {
    if (!players || !snapshot) return [];
    return computePlayerStandings(players, snapshot.standings, snapshot.matches);
  }, [players, snapshot]);

  const ownersByCode = useMemo(() => {
    const map = new Map<string, Player[]>();
    if (!players) return map;
    for (const p of players) {
      for (const code of p.teams) {
        const list = map.get(code) ?? [];
        list.push(p);
        map.set(code, list);
      }
    }
    return map;
  }, [players]);

  const { live, finished, upcoming } = useMemo(() => {
    const all = snapshot?.matches ?? [];
    return {
      live: all
        .filter((m) => m.status === "live")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      finished: all
        .filter((m) => m.status === "finished")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      upcoming: all
        .filter((m) => m.status === "upcoming")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  }, [snapshot]);

  return (
    <div className="min-h-screen">
      <Header fetchedAt={snapshot?.fetchedAt ?? null} />
      <main className="max-w-3xl mx-auto px-3 sm:px-4 pt-3 pb-8 space-y-4">
        {error && (
          <div className="border border-brick-500 dark:border-brick-300 bg-brick-500/10 text-brick-500 dark:text-brick-300 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        {loading && !snapshot ? (
          <p className="text-sm opacity-60">Loading…</p>
        ) : (
          <>
            <StandingsTable rows={playerStandings} />
            <MatchesSection title="Live" matches={live} ownersByCode={ownersByCode} />
            <ResultsSection matches={finished} ownersByCode={ownersByCode} />
            <MatchesSection title="Upcoming" matches={upcoming} ownersByCode={ownersByCode} />
          </>
        )}
      </main>
    </div>
  );
}
