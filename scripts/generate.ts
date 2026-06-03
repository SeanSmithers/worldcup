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
  const playerOrder = shuffled(players.map((_, i) => i), rnd);
  const pools = new Map<number, Team[]>();
  const refillAll = () => {
    for (const tier of tiers) pools.set(tier, shuffled(teamsByTier.get(tier)!, rnd));
  };
  refillAll();

  const result: Assignment = players.map(() => []);
  for (const pIdx of playerOrder) {
    if ([...pools.values()].every((p) => p.length === 0)) refillAll();
    const usedGroups = new Set<string>();
    for (const tier of tiers) {
      const pool = pools.get(tier)!;
      const candidates = pool.filter((t) => !usedGroups.has(t.group));
      if (candidates.length === 0) return null; // dead-end, retry whole draw
      const pick = candidates[Math.floor(rnd() * candidates.length)];
      pool.splice(pool.indexOf(pick), 1);
      result[pIdx].push(pick);
      usedGroups.add(pick.group);
    }
  }
  return result;
}

function pairwiseStats(assignment: Assignment, teamsPerPlayer: number): {
  max: number;
  identicalPairs: number;
  total: number;
} {
  const sets = assignment.map((p) => new Set(p.map((t) => t.code)));
  let max = 0;
  let identicalPairs = 0;
  let total = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      let c = 0;
      for (const code of sets[i]) if (sets[j].has(code)) c++;
      total += c;
      if (c > max) max = c;
      if (c === teamsPerPlayer) identicalPairs++;
    }
  }
  return { max, identicalPairs, total };
}

function compareStats(
  a: { max: number; identicalPairs: number; total: number },
  b: { max: number; identicalPairs: number; total: number },
): number {
  if (a.max !== b.max) return a.max - b.max;
  if (a.identicalPairs !== b.identicalPairs) return a.identicalPairs - b.identicalPairs;
  return a.total - b.total;
}

// Local search: swap one team between two players within a single tier
// (preserves the one-team-per-tier and distinct-groups invariants) whenever
// the swap strictly improves pairwise overlap.
function improveBySwaps(assignment: Assignment, teamsPerPlayer: number, rnd: () => number): void {
  const n = assignment.length;
  let stats = pairwiseStats(assignment, teamsPerPlayer);
  let progress = true;
  while (progress && (stats.max > 1 || stats.identicalPairs > 0)) {
    progress = false;
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
  let best: { assignment: Assignment; max: number; identicalPairs: number; total: number } | null = null;
  let attempts = 0;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    attempts++;
    const a = generateOnce(players, tiers, teamsByTier, rnd);
    if (!a) continue;
    improveBySwaps(a, teamsPerPlayer, rnd);
    const stats = pairwiseStats(a, teamsPerPlayer);
    const candidate = { assignment: a, ...stats };
    const better =
      !best ||
      candidate.max < best.max ||
      (candidate.max === best.max && candidate.identicalPairs < best.identicalPairs) ||
      (candidate.max === best.max && candidate.identicalPairs === best.identicalPairs && candidate.total < best.total);
    if (better) best = candidate;
    if (best!.max <= 1 && best!.identicalPairs === 0) break;
  }

  if (!best) {
    console.error(`Could not generate a valid assignment in ${MAX_ATTEMPTS} attempts.`);
    process.exit(1);
  }

  console.log(
    `Attempts: ${attempts} | max pairwise overlap: ${best.max} | identical groupings: ${best.identicalPairs}`,
  );
  if (best.max > 1 || best.identicalPairs > 0) {
    console.warn("Soft constraint not met (max pairwise overlap > 1 or identical groupings).");
  }

  console.log("");
  for (let i = 0; i < players.length; i++) {
    const teams = best.assignment[i]
      .map((t) => `${t.flag}  ${t.name} (Group ${t.group}, Tier ${t.tier})`)
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
