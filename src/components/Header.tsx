interface Props {
  fetchedAt: number | null;
}

export function Header({ fetchedAt }: Props) {
  const updated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;
  return (
    <header className="border-b border-ink-900/15 dark:border-ink-50/15">
      <div className="relative max-w-3xl mx-auto px-3 sm:px-4 py-2.5 flex items-center min-h-[3rem]">
        <img
          src={`${import.meta.env.BASE_URL}assets/wc2026-logo.png`}
          alt=""
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-8 w-auto"
        />
        <h1 className="w-full text-center font-semibold uppercase tracking-wide leading-none text-lg sm:text-xl text-ink-900 dark:text-ink-50">
          World Cup 2026 Sweepstakes
        </h1>
        {updated && (
          <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] tab-num opacity-50 hidden sm:inline">
            {updated}
          </span>
        )}
      </div>
    </header>
  );
}
