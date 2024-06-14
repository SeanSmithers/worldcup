import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { TaskGenerator, dropTask, task, timeout } from 'ember-concurrency';
import { taskFor } from 'ember-concurrency-ts';

const standingsEndpoint = `https://standings.uefa.com/v1/standings?competitionId=3&phase=TOURNAMENT&seasonYear=2024`;
const apiKey = `ceeee1a5bb209502c6c438abd8f30aef179ce669bb9288f2d1cf2fa276de03f4`;
const liveScoreEndpoint = `https://api.fifa.com/api/v3/live/football/range?from=2022-12-01T00:00:00Z&to=2022-12-20T00:00:00Z&IdSeason=255711&IdCompetition=17`;
const fifaStandingsEndpoint = `https://api.fifa.com/api/v3/calendar/17/255711/285063/standing?language=en`;
const uefaLiveScoreEndpoint = `https://match.uefa.com/v5/matches?competitionId=3&limit=30&offset=0&order=ASC&phase=TOURNAMENT&seasonYear=2024`;

enum competitionType {
  Fifa,
  Uefa,
}
export type CountryCode =
  | 'ALB'
  | 'SVN'
  | 'ROU'
  | 'GEO'
  | 'ENG'
  | 'DEN'
  | 'MKD'
  | 'ITA'
  | 'RUS'
  | 'UKR'
  | 'NED'
  | 'POL'
  | 'WAL'
  | 'GER'
  | 'CRO'
  | 'FIN'
  | 'BEL'
  | 'SWE'
  | 'HUN'
  | 'POR'
  | 'TUR'
  | 'SVK'
  | 'FRA'
  | 'SUI'
  | 'SCO'
  | 'ESP'
  | 'AUT'
  | 'CZE'
  | 'ARG'
  | 'BRA'
  | 'MAR'
  | 'AUS'
  | 'CAN'
  | 'GHA'
  | 'JPN'
  | 'MEX'
  | 'SEN'
  | 'URU'
  | 'CMR'
  | 'KOR'
  | 'QAT'
  | 'SRB'
  | 'TUN'
  | 'USA'
  | 'CRC'
  | 'ECU'
  | 'IRN'
  | 'KSA'
  | 'NOR'
  | 'CHE'
  | 'NZL'
  | 'PHI'
  | 'IRL'
  | 'NGA'
  | 'ZAM'
  | 'CRI'
  | 'DNK'
  | 'CHN'
  | 'HAI'
  | 'VIE'
  | 'JAM'
  | 'PAN'
  | 'RSA'
  | 'COL';

export interface TeamWireFormat {
  internationalName: string;
  associationLogoUrl: string;
  countryCode: CountryCode;
  isPlaceholder: boolean;
}
export interface FixtureWireformat {
  homeTeam: TeamWireFormat;
  awayTeam: TeamWireFormat;
  kickOffTime: { dateTime: string };
  group: { metaData: { groupName: string } };
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  minute?: { normal: number; injury?: number };
  translations?: { phaseName: { EN: string } };
  score?: { total: { away: number; home: number } };
}

export interface TeamStanding {
  drawn: number;
  goalDifference: number;
  goalsAgainst: number;
  goalsFor: number;
  isLive: boolean;
  lost: number;
  played: number;
  points: number;
  won: number;
  team: TeamWireFormat;
}

export interface GroupStandingWireFormat {
  items: Array<TeamStanding>;
}

export interface MatchResult {
  MatchTime: any;
  GroupName: [{ Description: string }];
  StageName: [{ Description: string }];
  Date: string;
  HomeTeam: {
    IdCountry: string;
    Score: number;
    ShortClubName: string;
    IdAssociation: string;
  };
  AwayTeam: {
    IdCountry: string;
    Score: number;
    ShortClubName: string;
    IdAssociation: string;
  };
  MatchStatus: number; // 1 == Not started? 3 == live,
  Period: number; // 0 == not started? 3 == first half? 4 == half time, 5 == second half,
  Winner?: string;
}
export interface LiveScoreWireFormat {
  Results: Array<MatchResult>;
}

export interface FifaStandingWireFormat {
  Team: {
    IdCountry: string;
    ShortClubName: string;
    IdAssociation: string;
  };
  Won: number;
  Played: number;
  Points: number;
  Lost: number;
  Drawn: number;
  For: number;
  Against: number;
  GoalsDiference: number;
  IdGroup: string;
}

export interface UefaStandingWireFormat {
  team: {
    associationId: string;
    countryCode: string;
    internationalName: string;
  };
  drawn: number;
  goalDifference: number;
  goalsAgainst: number;
  goalsFor: number;
  isLive: boolean;
  lost: number;
  played: number;
  points: number;
  won: number;
}

const comp: competitionType = competitionType.Uefa;

function fifaFixtureToStatus(fifaFixture: MatchResult) {
  if (fifaFixture.Winner || fifaFixture.Period === 10) {
    return 'FINISHED';
  } else if (fifaFixture.MatchStatus === 3) {
    return 'LIVE';
  } else {
    return 'UPCOMING';
  }
}

function fifaToUefaPhaseName(phaseNumber: number) {
  switch (phaseNumber) {
    case 3:
      return 'First half';
    case 4:
      return 'Half time';
    case 5:
      return 'Second half';
    default:
      return 'In progress';
  }
}
function parseUefaFixture(fixture: any): FixtureWireformat {
  return fixture as FixtureWireformat;
}

function parseFifaFixture(fifaFixture: any): FixtureWireformat {
  let fixture: FixtureWireformat = {
    homeTeam: {
      internationalName: fifaFixture.HomeTeam.ShortClubName,
      associationLogoUrl: '',
      countryCode: fifaFixture.HomeTeam.IdCountry as CountryCode,
      isPlaceholder: false,
    },
    awayTeam: {
      internationalName: fifaFixture.AwayTeam.ShortClubName,
      associationLogoUrl: '',
      countryCode: fifaFixture.AwayTeam.IdCountry as CountryCode,
      isPlaceholder: false,
    },
    kickOffTime: { dateTime: fifaFixture.Date },
    group: {
      metaData: {
        groupName:
          fifaFixture.GroupName[0]?.Description ||
          fifaFixture.StageName[0]?.Description,
      },
    },
    status: fifaFixtureToStatus(fifaFixture),
  };

  if (fixture.status === 'LIVE') {
    fixture.minute = { normal: fifaFixture.MatchTime };
    fixture.translations = {
      phaseName: { EN: fifaToUefaPhaseName(fifaFixture.Period) },
    };
    fixture.score = {
      total: {
        away: fifaFixture.AwayTeam.Score,
        home: fifaFixture.HomeTeam.Score,
      },
    };
  }

  if (fixture.status === 'FINISHED') {
    fixture.score = {
      total: {
        away: fifaFixture.AwayTeam.Score,
        home: fifaFixture.HomeTeam.Score,
      },
    };
  }

  return fixture;
}

function parseFifaStandings(
  standings: Array<FifaStandingWireFormat>,
  liveFixtures: Array<MatchResult>
): Array<TeamStanding> {
  return standings.map((standing) => {
    return {
      drawn: standing?.Drawn,
      goalDifference: standing?.GoalsDiference,
      goalsAgainst: standing?.Against,
      goalsFor: standing?.For,
      isLive: liveFixtures.any(
        (fixture) =>
          fixture.AwayTeam.IdCountry === standing.Team.IdCountry ||
          fixture.HomeTeam.IdCountry === standing.Team.IdCountry ||
          fixture.HomeTeam.IdCountry === standing.Team.IdAssociation ||
          fixture.AwayTeam.IdCountry === standing.Team.IdAssociation
      ),
      lost: standing?.Lost,
      played: standing?.Played,
      points: standing?.Points,
      won: standing?.Won,
      team: {
        internationalName: standing?.Team?.ShortClubName,
        associationLogoUrl: '',
        countryCode: standing?.Team?.IdCountry ?? standing?.Team?.IdAssociation,
        isPlaceholder: false,
      },
    };
  }) as Array<TeamStanding>;
}

function parseUefaStandings(
  standings: Array<UefaStandingWireFormat>,
  liveFixtures: Array<MatchResult>
): Array<TeamStanding> {
  return standings.map((standing) => {
    return {
      drawn: standing?.drawn,
      goalDifference: standing?.goalDifference,
      goalsAgainst: standing?.goalsAgainst,
      goalsFor: standing?.goalsFor,
      isLive: liveFixtures.any(
        (fixture) =>
          fixture.AwayTeam.IdCountry === standing.team.countryCode ||
          fixture.HomeTeam.IdCountry === standing.team.countryCode ||
          fixture.HomeTeam.IdCountry === standing.team.associationId ||
          fixture.AwayTeam.IdCountry === standing.team.associationId
      ),
      lost: standing?.lost,
      played: standing?.played,
      points: standing?.points,
      won: standing?.won,
      team: {
        internationalName: standing.team.internationalName,
        associationLogoUrl: '',
        countryCode: standing.team.countryCode,
        isPlaceholder: false,
      },
    };
  }) as Array<TeamStanding>;
}
export default class Api extends Service {
  @tracked model!: {
    standings: Array<GroupStandingWireFormat>;
    fixtures: Array<FixtureWireformat>;
    liveScores: Array<MatchResult>;
  };

  @dropTask
  *loadModel(): TaskGenerator<void> {
    let standingsFn =
      comp === competitionType.Uefa
        ? this.loadStandings
        : this.loadFifaStandings;
    let liveScoresFn =
      comp === competitionType.Uefa ? this.uefaLiveScores : this.liveScores;

    let result = yield Promise.all([
      taskFor(standingsFn).perform(),
      taskFor(liveScoresFn).perform(),
    ]);
    this.model = {
      standings: [],
      fixtures: [],
      liveScores: [],
    };
    let liveScores: Array<MatchResult>;

    switch (comp) {
      case competitionType.Uefa:
        liveScores = result[1];
        break;
      case competitionType.Fifa:
        liveScores = result[1].Results as Array<MatchResult>;
        break;
    }
    this.model = {
      standings: [],
      fixtures: result[0] as Array<FixtureWireformat>,
      liveScores: liveScores,
    };

    let standings: Array<FifaStandingWireFormat | UefaStandingWireFormat>;

    let fixtures: FixtureWireformat[] = this.model.liveScores.map((fixture) => {
      switch (comp) {
        case competitionType.Uefa:
          return parseUefaFixture(fixture);
        case competitionType.Fifa:
          return parseFifaFixture(fixture);
      }
    });

    switch (comp) {
      case competitionType.Uefa:
        standings = result[0].flatMap(
          (group: { items: Array<UefaStandingWireFormat> }) => group.items
        ) as Array<UefaStandingWireFormat>;
        break;
      case competitionType.Fifa:
        let fifaStandings = result[1].Results as Array<FifaStandingWireFormat>;
        standings = fifaStandings;
        break;
    }

    let liveFixtures = this.model.liveScores.filter(
      (fixture) => fixture.MatchStatus === 3
    );

    let mappedStandings: Array<TeamStanding> = [];

    switch (comp) {
      case competitionType.Fifa:
        mappedStandings = parseFifaStandings(
          standings as Array<FifaStandingWireFormat>,
          liveFixtures
        );
        break;

      case competitionType.Uefa:
        standings = standings as Array<UefaStandingWireFormat>;
        mappedStandings = parseUefaStandings(
          standings as Array<UefaStandingWireFormat>,
          liveFixtures
        );
        break;
    }

    this.model.standings = [
      { items: mappedStandings },
    ] as GroupStandingWireFormat[];

    this.model.fixtures = fixtures;
  }

  @task
  *enqueueRefresh(): TaskGenerator<void> {
    yield timeout(10_000); //10 seconds
    yield taskFor(this.loadModel).perform();
    taskFor(this.enqueueRefresh).perform();
  }

  @task
  *loadStandings(): TaskGenerator<Array<GroupStandingWireFormat>> {
    return yield this.fetch(standingsEndpoint);
  }

  @task
  *loadFifaStandings(): TaskGenerator<Array<FifaStandingWireFormat>> {
    return yield this.fetch(fifaStandingsEndpoint);
  }

  @task
  *uefaLiveScores(): TaskGenerator<any> {
    return yield this.fetch(uefaLiveScoreEndpoint);
  }
  @task
  *liveScores(): TaskGenerator<any> {
    let res = yield Promise.all([this.fetch(liveScoreEndpoint)]);

    return res[0];
  }

  async fetch(endpoint: string) {
    let result = await fetch(endpoint, {
      headers: {
        'x-api-key': apiKey,
      },
    });
    return await result.json();
  }
}
