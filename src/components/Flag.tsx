import { fifaToIso } from "../lib/flags";
import { nameFor } from "../data/teams";

interface Props {
  code: string;
  // Height-driven sizing — set h-* (and matching w if you want fixed ratio).
  // The img has a natural 4:3 ratio so `h-5 w-auto` yields a 20×15 flag.
  className?: string;
}

export function Flag({ code, className }: Props) {
  const iso = fifaToIso(code);
  const name = nameFor(code, code);
  if (!iso) {
    return (
      <span
        role="img"
        aria-label={name}
        title={name}
        className={`inline-block bg-ink-900/15 dark:bg-ink-50/15 rounded-[3px] ${className ?? ""}`}
        style={{ aspectRatio: "4 / 3" }}
      />
    );
  }
  return (
    <img
      src={`${import.meta.env.BASE_URL}flags/${iso}.svg`}
      alt={name}
      title={name}
      loading="lazy"
      decoding="async"
      className={`inline-block rounded-[3px] align-middle ${className ?? ""}`}
    />
  );
}
