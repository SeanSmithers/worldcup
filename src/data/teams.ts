import teamsJson from "../../data/teams-2026.json";

export interface TeamCatalogEntry {
  name: string;
  code: string;
  flag: string;
  group: string;
  odds: number;
  oddsFractional: string;
  fifaRank: number;
  tier: number;
}

const data = teamsJson as { teams: TeamCatalogEntry[] };

export const ALL_TEAMS: ReadonlyArray<TeamCatalogEntry> = data.teams;

const byCode = new Map<string, TeamCatalogEntry>();
for (const t of ALL_TEAMS) byCode.set(t.code, t);

export function teamByCode(code: string): TeamCatalogEntry | undefined {
  return byCode.get(code);
}

export function flagFor(code: string): string {
  return byCode.get(code)?.flag ?? "🏳️";
}

export function nameFor(code: string, fallback?: string): string {
  return byCode.get(code)?.name ?? fallback ?? code;
}
