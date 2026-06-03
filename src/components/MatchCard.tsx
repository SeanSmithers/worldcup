import type { Match } from "../api/types";
import { Avatar } from "./Avatar";
import { Flag } from "./Flag";
import type { Player } from "../lib/sweepstakes";

interface Props {
  match: Match;
  ownersByCode: Map<string, Player[]>;
}

const dayMonthFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "long",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dayMonthFmt.format(d).toUpperCase();
}
function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : timeFmt.format(d);
}

// Map FIFA's verbose stage names to compact labels for the pill.
function shortStage(stage: string): string {
  switch (stage) {
    case "Round of 32": return "RO 32";
    case "Round of 16": return "RO 16";
    case "Quarter-final": return "Quarter Final";
    case "Semi-final": return "Semi Final";
    case "Play-off for third place": return "Third Place";
    default: return stage;
  }
}

function computeWinner(m: Match): "home" | "away" | null {
  if (m.status !== "finished" || m.homeScore == null || m.awayScore == null) return null;
  if (m.homeScore > m.awayScore) return "home";
  if (m.awayScore > m.homeScore) return "away";
  if (m.homePens != null && m.awayPens != null) {
    if (m.homePens > m.awayPens) return "home";
    if (m.awayPens > m.homePens) return "away";
  }
  return null;
}

function TeamName({
  align,
  code,
  name,
  isWinner,
}: {
  align: "left" | "right";
  code: string | null;
  name: string | null;
  isWinner: boolean;
}) {
  const display = name ?? "TBD";
  // Editorial type scale, slightly smaller for very long names but never
  // truncated.
  const sizeCls = display.length > 16
    ? "text-base sm:text-lg"
    : display.length > 11
      ? "text-lg sm:text-xl"
      : "text-xl sm:text-2xl";
  return (
    <div
      className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      {code ? (
        <Flag code={code} className="h-6 sm:h-7 w-auto shrink-0" />
      ) : (
        <span className="inline-block w-7 h-5 sm:w-9 sm:h-7 rounded-sm bg-ink-900/15 dark:bg-ink-50/15 shrink-0" />
      )}
      <span
        className={`font-semibold uppercase tracking-wide leading-tight break-words ${sizeCls} ${
          isWinner ? "text-ink-900 dark:text-ink-50" : "text-ink-900/85 dark:text-ink-50/85"
        }`}
      >
        {display}
      </span>
    </div>
  );
}

export function MatchCard({ match, ownersByCode }: Props) {
  const homeOwners = match.home ? (ownersByCode.get(match.home.code) ?? []) : [];
  const awayOwners = match.away ? (ownersByCode.get(match.away.code) ?? []) : [];
  const winner = computeWinner(match);
  const stageLabel = match.group ?? shortStage(match.stage);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <article
      className={`relative px-3 sm:px-4 py-3.5 sm:py-4 ${
        isLive ? "bg-brick-500/[0.07] dark:bg-brick-500/15" : ""
      }`}
    >
      {isLive && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] bg-brick-500 animate-pulse"
        />
      )}

      {/* Top row: team names + center group/status label */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <TeamName
          align="left"
          code={match.home?.code ?? null}
          name={match.home?.name ?? null}
          isWinner={winner === "home"}
        />
        <div className="flex flex-col items-center gap-1 min-w-[4.5rem] sm:min-w-[6.5rem]">
          {stageLabel && (
            <span className="rounded bg-flagblue-500/50 dark:bg-flagblue-400/40 text-ink-900 dark:text-ink-50 uppercase text-[10px] sm:text-xs font-bold tracking-wide px-2 py-0.5 whitespace-nowrap">
              {stageLabel}
            </span>
          )}
          {isLive ? (
            <span className="flex items-center gap-1.5 font-bold text-brick-500 dark:text-brick-300 text-xs uppercase whitespace-nowrap">
              <span aria-hidden className="w-2 h-2 rounded-full bg-brick-500 dark:bg-brick-300 animate-pulse" />
              Live{match.minuteDisplay && match.minuteDisplay !== "0'" ? `: ${match.minuteDisplay}` : ""}
            </span>
          ) : isFinished ? (
            <span className="text-xs sm:text-sm uppercase font-light text-ink-900/60 dark:text-ink-50/60">FT</span>
          ) : (
            <span className="text-xs sm:text-sm uppercase font-light text-ink-900/60 dark:text-ink-50/60">vs</span>
          )}
        </div>
        <TeamName
          align="right"
          code={match.away?.code ?? null}
          name={match.away?.name ?? null}
          isWinner={winner === "away"}
        />
      </div>

      {/* Bottom row: avatars + score-or-date + avatars */}
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <div className="flex -space-x-1.5 min-h-[1.5rem]">
          {homeOwners.map((p) => (
            <Avatar
              key={p.name}
              src={p.image}
              alt={p.name}
              className="w-6 h-6 sm:w-7 sm:h-7"
            />
          ))}
        </div>
        <div className="text-center min-w-[4.5rem] sm:min-w-[6.5rem]">
          {match.status === "upcoming" ? (
            <div className="uppercase font-light leading-tight text-base sm:text-lg text-ink-900/75 dark:text-ink-50/75">
              <div>{formatDay(match.date)}</div>
              <div className="tab-num">{formatTime(match.date)}</div>
            </div>
          ) : (
            <div className="font-mono font-bold tab-num text-2xl sm:text-3xl leading-none text-ink-900 dark:text-ink-50">
              <span className={winner === "home" ? "" : "opacity-50"}>{match.homeScore ?? 0}</span>
              <span className="mx-1.5 opacity-30">–</span>
              <span className={winner === "away" ? "" : "opacity-50"}>{match.awayScore ?? 0}</span>
              {(match.homePens ?? 0) + (match.awayPens ?? 0) > 0 && (
                <div className="font-mono text-[10px] font-medium opacity-60 mt-1 tracking-wider">
                  PENS {match.homePens}–{match.awayPens}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex -space-x-1.5 justify-end min-h-[1.5rem]">
          {awayOwners.map((p) => (
            <Avatar
              key={p.name}
              src={p.image}
              alt={p.name}
              className="w-6 h-6 sm:w-7 sm:h-7"
            />
          ))}
        </div>
      </div>
    </article>
  );
}
