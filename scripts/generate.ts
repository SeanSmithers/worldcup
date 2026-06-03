// World Cup sweepstakes team-draw generator.
//
// Each player receives one team from each odds-band (tier), with all teams
// from distinct group-stage groups so a player's teams never meet in the
// group stage. With 8 players every team is drawn exactly once; with more
// players teams are reused, subject to: no two players have the identical
// grouping, and ideally any two players share at most one team.
//
// Run: npm run generate -- "<player1,player2,...>" [seed] [outputName]
//   - seed: optional integer; omitted → random.
//   - outputName: optional; if given, writes public/players/<outputName>.json.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Team = {
  name: string;
  code: string;
  flag: string;
  group: string;
  tier: number;
  odds?: number;
  oddsFractional?: string;
  fifaRank?: number;
};

type Assignment = Team[][];

const TEAMS_PATH = "data/teams-2026.json";
const OUTPUT_DIR = "public/players";
const MAX_ATTEMPTS = 20_000;

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseArgs(argv: string[]): { players: string[]; seed: number; outputName?: string } {
  if (argv.length < 1) {
    console.error('Usage: npm run generate -- "<player1,player2,...>" [seed] [outputName]');
    process.exit(1);
  }
  // Sort player names for input-order-independent reproducibility (same as old Ruby).
  const players = argv[0].split(",").map((s) => s.trim()).filter(Boolean).sort();
  if (players.length < 2) {
    console.error("Provide at least 2 players.");
    process.exit(1);
  }
  const seed = argv[1] !== undefined ? Number.parseInt(argv[1], 10) : Math.floor(Math.random() * 100_000);
  if (Number.isNaN(seed)) {
    console.error(`Invalid seed: "${argv[1]}"`);
    process.exit(1);
  }
  return { players, seed, outputName: argv[2] };
}

function loadTeams(): { tiers: number[]; teamsByTier: Map<number, Team[]> } {
  const raw = JSON.parse(readFileSync(TEAMS_PATH, "utf8")) as { teams: Team[] };
  const tiers = [...new Set(raw.teams.map((t) => t.tier))].sort((a, b) => a - b);
  const teamsByTier = new Map<number, Team[]>();
  for (const tier of tiers) teamsByTier.set(tier, raw.teams.filter((t) => t.tier === tier));
  return { tiers, teamsByTier };
}

function generateOnce(
  players: string[],
  tiers: number[],
  teamsByTier: Map<number, Team[]>,
  rnd: () => number,
): Assignment | null {
  // Tier-major construction with a fresh per-tier player shuffle so the
  // "extra" (>8) players who must take a duplicate rotate between tiers —
  // duplicates spread across the field instead of piling onto one player.
  const result: Assignment = players.map(() => []);
  const usedGroups: Set<string>[] = players.map(() => new Set<string>());

  for (const tier of tiers) {
    const playerOrder = shuffled(players.map((_, i) => i), rnd);
    let pool = shuffled(teamsByTier.get(tier)!, rnd);

    for (const pIdx of playerOrder) {
      if (pool.length === 0) pool = shuffled(teamsByTier.get(tier)!, rnd);
      const candidates = pool.filter((t) => !usedGroups[pIdx].has(t.group));
      if (candidates.length === 0) return null; // dead-end, retry whole draw
      const pick = candidates[Math.floor(rnd() * candidates.length)];
      pool.splice(pool.indexOf(pick), 1);
      result[pIdx].push(pick);
      usedGroups[pIdx].add(pick.group);
    }
  }
  return result;
}

interface DrawStats {
  max: number;            // max pairwise overlap across any pair of players
  identicalPairs: number; // pairs that share every team (hard violation)
  total: number;          // sum of pairwise overlaps (lower = fewer dups)
  maxDup: number;         // max count of "shared" teams any single player has
  dupSpread: number;      // maxDup - minDup across players
}

function pairwiseStats(assignment: Assignment, teamsPerPlayer: number): DrawStats {
  const n = assignment.length;
  const sets = assignment.map((p) => new Set(p.map((t) => t.code)));
  let max = 0;
  let identicalPairs = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let c = 0;
      for (const code of sets[i]) if (sets[j].has(code)) c++;
      total += c;
      if (c > max) max = c;
      if (c === teamsPerPlayer) identicalPairs++;
    }
  }

  // Per-player duplicate count: how many of this player's teams are also
  // held by at least one other player.
  const teamPlayers = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    for (const t of assignment[i]) {
      const arr = teamPlayers.get(t.code) ?? [];
      arr.push(i);
      teamPlayers.set(t.code, arr);
    }
  }
  const dupCount = new Array<number>(n).fill(0);
  for (const owners of teamPlayers.values()) {
    if (owners.length > 1) for (const p of owners) dupCount[p]++;
  }
  const maxDup = Math.max(...dupCount);
  const minDup = Math.min(...dupCount);

  return { max, identicalPairs, total, maxDup, dupSpread: maxDup - minDup };
}

// Hard invariants the script must never silently violate:
//  - each player has exactly `teamsPerPlayer` teams
//  - one team per tier (tier set equals [1..teamsPerPlayer])
//  - all teams come from distinct groups (so a player's teams never meet
//    in the group stage)
function validate(assignment: Assignment, players: string[], teamsPerPlayer: number): void {
  for (let i = 0; i < assignment.length; i++) {
    const teams = assignment[i];
    const name = players[i];
    if (teams.length !== teamsPerPlayer) {
      throw new Error(`${name}: has ${teams.length} teams, expected ${teamsPerPlayer}`);
    }
    const groups = new Set(teams.map((t) => t.group));
    if (groups.size !== teamsPerPlayer) {
      const counts = new Map<string, number>();
      for (const t of teams) counts.set(t.group, (counts.get(t.group) ?? 0) + 1);
      const dupes = [...counts.entries()].filter(([, c]) => c > 1).map(([g, c]) => `${g}×${c}`).join(", ");
      throw new Error(`${name}: duplicate groups in roster — ${dupes}`);
    }
    const expectedTiers = Array.from({ length: teamsPerPlayer }, (_, k) => k + 1);
    const actualTiers = teams.map((t) => t.tier).sort((a, b) => a - b);
    if (actualTiers.join(",") !== expectedTiers.join(",")) {
      throw new Error(`${name}: tier coverage [${actualTiers.join(",")}], expected [${expectedTiers.join(",")}]`);
    }
  }
}

function compareStats(a: DrawStats, b: DrawStats): number {
  // Hardest first: no identical groupings, then pairwise overlap.
  if (a.identicalPairs !== b.identicalPairs) return a.identicalPairs - b.identicalPairs;
  if (a.max !== b.max) return a.max - b.max;
  // Soft: balance — fewest duplicates concentrated on any one player, then
  // smallest spread, then total.
  if (a.maxDup !== b.maxDup) return a.maxDup - b.maxDup;
  if (a.dupSpread !== b.dupSpread) return a.dupSpread - b.dupSpread;
  return a.total - b.total;
}

// Local search: swap one team between two players within a single tier
// (preserves the one-team-per-tier and distinct-groups invariants) whenever
// the swap strictly improves the combined stats — pairwise overlap first,
// then balance of duplicates across players.
function improveBySwaps(assignment: Assignment, teamsPerPlayer: number, rnd: () => number): void {
  const n = assignment.length;
  let stats = pairwiseStats(assignment, teamsPerPlayer);
  let progress = true;
  let iterations = 0;
  // Cap iterations to keep total runtime bounded across many attempts.
  while (progress && iterations < 200) {
    progress = false;
    iterations++;
    const playerOrder = shuffled([...Array(n).keys()], rnd);
    const tierOrder = shuffled([...Array(teamsPerPlayer).keys()], rnd);
    outer: for (const i of playerOrder) {
      for (const tIdx of tierOrder) {
        for (const k of shuffled([...Array(n).keys()], rnd)) {
          if (k === i) continue;
          const ti = assignment[i][tIdx];
          const tk = assignment[k][tIdx];
          if (ti.code === tk.code) continue;
          // distinct-groups must hold after swap
          const iOtherGroups = new Set(assignment[i].filter((_, idx) => idx !== tIdx).map((t) => t.group));
          if (iOtherGroups.has(tk.group)) continue;
          const kOtherGroups = new Set(assignment[k].filter((_, idx) => idx !== tIdx).map((t) => t.group));
          if (kOtherGroups.has(ti.group)) continue;
          assignment[i][tIdx] = tk;
          assignment[k][tIdx] = ti;
          const next = pairwiseStats(assignment, teamsPerPlayer);
          if (compareStats(next, stats) < 0) {
            stats = next;
            progress = true;
            break outer;
          }
          assignment[i][tIdx] = ti;
          assignment[k][tIdx] = tk;
        }
      }
    }
  }
}

function main(): void {
  const { players, seed, outputName } = parseArgs(process.argv.slice(2));
  console.log(`Seed: ${seed}`);
  console.log(`Players (${players.length}): ${players.join(", ")}`);

  const { tiers, teamsByTier } = loadTeams();
  const teamsPerPlayer = tiers.length;
  console.log(
    `Tiers: ${tiers.length} bands × ${teamsByTier.get(tiers[0])!.length} teams → ${teamsPerPlayer} teams per player`,
  );

  const rnd = mulberry32(seed);
  // Combinatorial floor for max duplicates concentrated on any player: with
  // N players × T teams each over a pool of `tierSize * tiers` teams, the
  // sum of dup-counts equals 2*(N*T - poolSize) (each duplicate-team
  // contributes 1 to each of the two players holding it). Divided evenly
  // over N players gives the floor of maxDup.
  const poolSize = teamsByTier.get(tiers[0])!.length * tiers.length;
  const dupTeams = Math.max(0, players.length * teamsPerPlayer - poolSize);
  const maxDupFloor = Math.ceil((2 * dupTeams) / players.length);

  let best: { assignment: Assignment; stats: DrawStats } | null = null;
  let attempts = 0;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    attempts++;
    const a = generateOnce(players, tiers, teamsByTier, rnd);
    if (!a) continue;
    improveBySwaps(a, teamsPerPlayer, rnd);
    const stats = pairwiseStats(a, teamsPerPlayer);
    if (!best || compareStats(stats, best.stats) < 0) {
      best = { assignment: a, stats };
    }
    if (best.stats.max <= 1 && best.stats.identicalPairs === 0 && best.stats.maxDup <= maxDupFloor) break;
  }

  if (!best) {
    console.error(`Could not generate a valid assignment in ${MAX_ATTEMPTS} attempts.`);
    process.exit(1);
  }

  try {
    validate(best.assignment, players, teamsPerPlayer);
  } catch (e) {
    console.error(`Internal error — invariant violated: ${(e as Error).message}`);
    process.exit(2);
  }

  console.log(
    `Attempts: ${attempts} | max pairwise overlap: ${best.stats.max} | identical groupings: ${best.stats.identicalPairs} | max dup/player: ${best.stats.maxDup} (floor ${maxDupFloor})`,
  );
  if (best.stats.max > 1 || best.stats.identicalPairs > 0) {
    console.warn("Soft constraint not met (max pairwise overlap > 1 or identical groupings).");
  }

  console.log("");
  for (let i = 0; i < players.length; i++) {
    const teams = best.assignment[i]
      .map((t) => `${t.flag} ${t.name} (${t.group})`)
      .join(", ");
    console.log(`${players[i]}: ${teams}`);
  }

  if (outputName) {
    const out = {
      players: players.map((name, i) => ({
        name,
        teams: best!.assignment[i].map((t) => t.code),
        image: "",
      })),
    };
    const file = resolve(OUTPUT_DIR, `${outputName}.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
    console.log(`Wrote ${file}`);
  } else {
    console.log("(no outputName given — file not written)");
  }
}

main();
