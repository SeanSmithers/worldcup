import type {
  FifaMatch,
  FifaResults,
  FifaStanding,
  Match,
  MatchStatus,
  SnapshotResult,
  TeamRef,
  TeamStanding,
} from "./types";

const BASE = "https://api.fifa.com/api/v3";

// 2026 FIFA World Cup IDs (verified live against the FIFA API).
export const WC2026 = {
  idCompetition: "17",
  idSeason: "285023",
  firstStageId: "289273",
} as const;

function descOf(arr: { Description: string }[] | null | undefined): string {
  if (!arr || arr.length === 0) return "";
  return arr[0].Description ?? "";
}

function fifaMatchStatusToStatus(s: number): MatchStatus {
  if (s === 0) return "finished";
  if (s === 3) return "live";
  return "upcoming";
}

function toTeamRef(t: FifaMatch["Home"]): TeamRef | null {
  if (!t) return null;
  return {
    code: t.IdCountry || t.IdAssociation || t.Abbreviation,
    name: descOf(t.TeamName) || t.ShortClubName || t.Abbreviation,
  };
}

function normalizeMatch(m: FifaMatch): Match {
  return {
    id: m.IdMatch,
    date: m.Date,
    stage: descOf(m.StageName),
    group: m.GroupName && m.GroupName.length > 0 ? descOf(m.GroupName) || null : null,
    home: toTeamRef(m.Home),
    away: toTeamRef(m.Away),
    homeScore: m.HomeTeamScore ?? null,
    awayScore: m.AwayTeamScore ?? null,
    homePens: m.HomeTeamPenaltyScore ?? null,
    awayPens: m.AwayTeamPenaltyScore ?? null,
    status: fifaMatchStatusToStatus(m.MatchStatus),
    winnerIdTeam: m.Winner,
    minuteDisplay: m.MatchTime,
    placeholderA: m.PlaceHolderA,
    placeholderB: m.PlaceHolderB,
  };
}

function normalizeStanding(s: FifaStanding): TeamStanding {
  return {
    code: s.Team.IdCountry || s.Team.IdAssociation || s.Team.Abbreviation,
    name: descOf(s.Team.Name) || descOf(s.Team.TeamName) || s.Team.ShortClubName,
    group: descOf(s.Group),
    played: s.Played,
    won: s.Won,
    drawn: s.Drawn,
    lost: s.Lost,
    goalsFor: s.For,
    goalsAgainst: s.Against,
    goalDifference: s.GoalsDiference,
    points: s.Points,
    position: s.Position,
    isLive: s.IsLive,
  };
}

export class FifaApi {
  private readonly baseUrl: string;
  private readonly idCompetition: string;
  private readonly idSeason: string;
  private readonly firstStageId: string;

  constructor(opts: { baseUrl?: string; idCompetition: string; idSeason: string; firstStageId: string }) {
    this.baseUrl = opts.baseUrl ?? BASE;
    this.idCompetition = opts.idCompetition;
    this.idSeason = opts.idSeason;
    this.firstStageId = opts.firstStageId;
  }

  static forWorldCup2026(): FifaApi {
    return new FifaApi({ ...WC2026 });
  }

  async fetchMatches(signal?: AbortSignal): Promise<Match[]> {
    const url = `${this.baseUrl}/calendar/matches?idCompetition=${this.idCompetition}&idSeason=${this.idSeason}&count=500&language=en`;
    const res = await this.fetchJson<FifaResults<FifaMatch>>(url, signal);
    return res.Results.map(normalizeMatch);
  }

  async fetchStandings(signal?: AbortSignal): Promise<TeamStanding[]> {
    const url = `${this.baseUrl}/calendar/${this.idCompetition}/${this.idSeason}/${this.firstStageId}/standing?language=en`;
    const res = await this.fetchJson<FifaResults<FifaStanding>>(url, signal);
    return res.Results.map(normalizeStanding);
  }

  async fetchSnapshot(signal?: AbortSignal): Promise<SnapshotResult> {
    const [matches, standings] = await Promise.all([
      this.fetchMatches(signal),
      this.fetchStandings(signal),
    ]);
    return { matches, standings, fetchedAt: Date.now() };
  }

  private async fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`FIFA API ${res.status} ${res.statusText}: ${url}`);
    return (await res.json()) as T;
  }
}
