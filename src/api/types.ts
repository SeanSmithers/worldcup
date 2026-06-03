// Types for the FIFA public API responses, then the normalized shapes our app
// works with. Field names in the Fifa* types match the JSON wire format
// exactly (PascalCase, awkward casing) and intentionally only cover what we
// consume — the API returns many more fields.

export interface FifaLocalizedString {
  Locale: string;
  Description: string;
}

export interface FifaTeam {
  IdTeam: string;
  IdCountry: string;
  IdAssociation: string;
  Abbreviation: string;
  ShortClubName: string;
  PictureUrl: string;
  TeamName: FifaLocalizedString[];
  Score?: number | null;
}

export interface FifaStandingTeam extends FifaTeam {
  Name: FifaLocalizedString[];
}

export interface FifaMatch {
  IdMatch: string;
  IdCompetition: string;
  IdSeason: string;
  IdStage: string;
  IdGroup: string | null;
  StageName: FifaLocalizedString[];
  GroupName: FifaLocalizedString[] | null;
  Date: string;
  LocalDate: string;
  Home: FifaTeam | null;
  Away: FifaTeam | null;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  HomeTeamPenaltyScore: number | null;
  AwayTeamPenaltyScore: number | null;
  MatchStatus: number; // 0=Finished, 1=Upcoming, 3=Live (per legacy FIFA app), 12=Postponed
  Winner: string | null;
  MatchTime: string | null;
  ResultType: number;
  PlaceHolderA: string | null;
  PlaceHolderB: string | null;
}

export interface FifaStanding {
  IdTeam: string;
  IdCompetition: string;
  IdGroup: string;
  IdStage: string;
  Group: FifaLocalizedString[];
  Played: number;
  Won: number;
  Drawn: number;
  Lost: number;
  For: number;
  Against: number;
  GoalsDiference: number;
  Points: number;
  Position: number;
  IsLive: boolean;
  Team: FifaStandingTeam;
}

export interface FifaResults<T> {
  Results: T[];
}

// Normalized internal shapes used throughout the UI.
export type MatchStatus = "upcoming" | "live" | "finished";

export interface TeamRef {
  code: string;
  name: string;
}

export interface Match {
  id: string;
  date: string;
  stage: string;
  group: string | null;
  home: TeamRef | null;
  away: TeamRef | null;
  homeScore: number | null;
  awayScore: number | null;
  homePens: number | null;
  awayPens: number | null;
  status: MatchStatus;
  winnerIdTeam: string | null;
  minuteDisplay: string | null;
  placeholderA: string | null;
  placeholderB: string | null;
}

export interface TeamStanding {
  code: string;
  name: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  isLive: boolean;
}

export interface SnapshotResult {
  matches: Match[];
  standings: TeamStanding[];
  fetchedAt: number;
}
