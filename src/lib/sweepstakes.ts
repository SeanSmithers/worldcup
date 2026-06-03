import type { Match, TeamStanding } from "../api/types";
import { flagFor, nameFor } from "../data/teams";

export interface Player {
  name: string;
  teams: string[]; // FIFA 3-letter codes
  image: string;
}

export interface PlayerTeamRow {
  code: string;
  name: string;
  flag: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isLive: boolean;
}

export interface PlayerStanding {
  player: Player;
  teams: PlayerTeamRow[];
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  hasLiveMatch: boolean;
}

// Build per-team rows for a player by combining the player's assigned team
// codes with the live FIFA standings (group stage). Teams not yet found in
// the standings (e.g. before group stage starts) get zeros.
function teamRowsFor(player: Player, standingsByCode: Map<string, TeamStanding>, liveCodes: Set<string>): PlayerTeamRow[] {
  return player.teams.map((code): PlayerTeamRow => {
    const s = standingsByCode.get(code);
    return {
      code,
      name: s?.name ?? nameFor(code),
      flag: flagFor(code),
      group: s?.group ?? "",
      played: s?.played ?? 0,
      won: s?.won ?? 0,
      drawn: s?.drawn ?? 0,
      lost: s?.lost ?? 0,
      goalsFor: s?.goalsFor ?? 0,
      goalsAgainst: s?.goalsAgainst ?? 0,
      goalDifference: s?.goalDifference ?? 0,
      points: s?.points ?? 0,
      isLive: liveCodes.has(code),
    };
  });
}

export function computePlayerStandings(
  players: Player[],
  standings: TeamStanding[],
  matches: Match[],
): PlayerStanding[] {
  const standingsByCode = new Map<string, TeamStanding>();
  for (const s of standings) standingsByCode.set(s.code, s);

  // Codes currently playing (status === "live").
  const liveCodes = new Set<string>();
  for (const m of matches) {
    if (m.status !== "live") continue;
    if (m.home?.code) liveCodes.add(m.home.code);
    if (m.away?.code) liveCodes.add(m.away.code);
  }

  const rows = players.map((player): PlayerStanding => {
    const teamRows = teamRowsFor(player, standingsByCode, liveCodes);
    const totals = teamRows.reduce(
      (acc, t) => ({
        played: acc.played + t.played,
        won: acc.won + t.won,
        drawn: acc.drawn + t.drawn,
        lost: acc.lost + t.lost,
        goalsFor: acc.goalsFor + t.goalsFor,
        goalsAgainst: acc.goalsAgainst + t.goalsAgainst,
        goalDifference: acc.goalDifference + t.goalDifference,
        points: acc.points + t.points,
      }),
      { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
    );
    return {
      player,
      teams: teamRows,
      ...totals,
      hasLiveMatch: teamRows.some((t) => t.isLive),
    };
  });

  // Sort by points desc, then GD, then GF, then wins (matches old behaviour).
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return b.won - a.won;
  });

  return rows;
}
