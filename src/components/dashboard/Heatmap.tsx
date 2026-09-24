"use client";

import { useMemo, useState } from "react";
import type { StudySession } from "@/lib/types";
import { cn, formatMinutes } from "@/lib/utils";
import { densifySessions } from "@/data/activity";

const LEVELS = [
  "bg-surface-2",
  "bg-accent/18",
  "bg-accent/38",
  "bg-accent/62",
  "bg-accent/90",
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Day numbers sit inside the cells in month view, so the two darkest steps
 * need ink that survives an accent fill rather than the usual muted text.
 */
const LEVEL_INK = [
  "text-faint",
  "text-fg-dim",
  "text-fg-dim",
  "text-accent-ink",
  "text-accent-ink",
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function level(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes < 40) return 1;
  if (minutes < 70) return 2;
  if (minutes < 105) return 3;
  return 4;
}

interface Cell {
  session: StudySession | null;
  date: Date | null;
}

/**
 * A year of study activity — weeks as columns, weekdays as rows.
 *
 * Honest about a young account: twelve mostly-empty months is a discouraging
 * first impression when you started three weeks ago, which is why the shell
 * below defaults to the month view until there is enough history to fill
 * this one.
 */
function YearHeatmap({ sessions }: { sessions: StudySession[] }) {
  const [hover, setHover] = useState<{ session: StudySession; date: Date } | null>(
    null,
  );

  const columns = useMemo(() => {
    // Always a full year of cells, whether the account is a day old or a
    // year old — a real account's rows are sparse by nature.
    const recent = densifySessions(sessions, 364);
    if (recent.length === 0) return [];

    const cells: Cell[] = recent.map((session) => ({
      session,
      date: new Date(`${session.date}T00:00:00`),
    }));

    // Pad the first week so each column starts on a Sunday.
    const leading = cells[0].date ? cells[0].date.getDay() : 0;
    const padded: Cell[] = [
      ...Array.from({ length: leading }, () => ({ session: null, date: null })),
      ...cells,
    ];

    const grouped: Cell[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      grouped.push(padded.slice(i, i + 7));
    }
    return grouped;
  }, [sessions]);

  const monthLabels = useMemo(() => {
    let lastMonth = -1;
    return columns.map((week) => {
      const first = week.find((c) => c.date)?.date;
      if (!first) return "";
      const m = first.getMonth();
      if (m !== lastMonth && first.getDate() <= 14) {
        lastMonth = m;
        return MONTHS[m];
      }
      return "";
    });
  }, [columns]);

  return (
    <div className="w-full" suppressHydrationWarning>
      <div className="scrollbar-none overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div className="flex gap-[3px] pl-[26px]">
            {monthLabels.map((label, i) => (
              <div key={i} className="w-[11px] shrink-0">
                <span className="mono-label block text-[9px] text-faint">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-1.5 flex gap-[3px]">
            <div className="flex w-[23px] shrink-0 flex-col gap-[3px] pr-1">
              {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                <span
                  key={i}
                  className="mono-label flex h-[11px] items-center text-[8.5px] text-faint"
                >
                  {d}
                </span>
              ))}
            </div>

            {columns.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, di) => {
                  const cell = week[di];
                  if (!cell || !cell.session || !cell.date) {
                    return <div key={di} className="h-[11px] w-[11px]" />;
                  }
                  const lvl = level(cell.session.minutes);
                  return (
                    <button
                      key={di}
                      type="button"
                      aria-label={`${cell.session.date}: ${formatMinutes(cell.session.minutes)}`}
                      onMouseEnter={() =>
                        setHover({ session: cell.session!, date: cell.date! })
                      }
                      onMouseLeave={() => setHover(null)}
                      onFocus={() =>
                        setHover({ session: cell.session!, date: cell.date! })
                      }
                      onBlur={() => setHover(null)}
                      className={cn(
                        "h-[11px] w-[11px] rounded-[2.5px] transition-transform duration-150 hover:scale-[1.35]",
                        LEVELS[lvl],
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="mono-meta h-4 text-muted">
          {hover ? (
            <span className="animate-fade-in">
              {hover.session.minutes > 0
                ? `${formatMinutes(hover.session.minutes)} on ${formatDay(hover.date)}`
                : `Rest day — ${formatDay(hover.date)}`}
            </span>
          ) : (
            <span className="text-faint">Hover a day for detail</span>
          )}
        </div>
        <div className="mono-label flex items-center gap-1.5 text-faint">
          <span>Less</span>
          {LEVELS.map((l, i) => (
            <span key={i} className={cn("h-[10px] w-[10px] rounded-[2.5px]", l)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------ Month view ----------------------------- */

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * One calendar month, as a real calendar.
 *
 * The year view answers "how consistent have I been?" — a shape you read at a
 * glance. A month answers "which days did I work, and how much?", which is a
 * different question and wants day numbers, bigger cells and a total. Same
 * ramp and same scale as the year view, so a shade means the same thing in
 * both.
 */
function MonthHeatmap({
  sessions,
  month,
  onMonthChange,
  canGoBack,
  canGoForward,
}: {
  sessions: StudySession[];
  month: Date;
  onMonthChange: (next: Date) => void;
  canGoBack: boolean;
  canGoForward: boolean;
}) {
  const [hover, setHover] = useState<{ session: StudySession; date: Date } | null>(
    null,
  );

  const byDate = useMemo(
    () => new Map(sessions.map((s) => [s.date, s.minutes])),
    [sessions],
  );

  const { cells, worked, total } = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const days = new Date(year, m + 1, 0).getDate();
    const leading = new Date(year, m, 1).getDay();

    const rows: (Date | null)[] = [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: days }, (_, i) => new Date(year, m, i + 1)),
    ];
    while (rows.length % 7 !== 0) rows.push(null);

    let worked = 0;
    let total = 0;
    for (const d of rows) {
      if (!d) continue;
      const minutes = byDate.get(isoLocal(d)) ?? 0;
      if (minutes > 0) {
        worked += 1;
        total += minutes;
      }
    }
    return { cells: rows, worked, total };
  }, [month, byDate]);

  const today = isoLocal(new Date());

  return (
    <div className="w-full" suppressHydrationWarning>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="mono-meta rounded-md border border-line bg-surface-2 px-2 py-1 text-fg-dim transition-colors enabled:hover:border-line-strong enabled:hover:text-accent disabled:opacity-30"
          aria-label="Previous month"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-[13.5px] font-semibold text-fg">
            {MONTHS_LONG[month.getMonth()]} {month.getFullYear()}
          </div>
          <div className="mono-meta mt-0.5 text-faint">
            {worked} day{worked === 1 ? "" : "s"} worked
            {total > 0 ? ` · ${formatMinutes(total)}` : ""}
          </div>
        </div>
        <button
          type="button"
          disabled={!canGoForward}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="mono-meta rounded-md border border-line bg-surface-2 px-2 py-1 text-fg-dim transition-colors enabled:hover:border-line-strong enabled:hover:text-accent disabled:opacity-30"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="mx-auto grid max-w-[420px] grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d, i) => (
          <span
            key={i}
            className="mono-label pb-1 text-center text-[9px] text-faint"
          >
            {d}
          </span>
        ))}

        {cells.map((date, i) => {
          if (!date) return <div key={i} className="aspect-square" />;
          const iso = isoLocal(date);
          const minutes = byDate.get(iso) ?? 0;
          const lvl = level(minutes);
          const isToday = iso === today;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${iso}: ${minutes > 0 ? formatMinutes(minutes) : "no activity"}`}
              onMouseEnter={() => setHover({ session: { date: iso, minutes }, date })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ session: { date: iso, minutes }, date })}
              onBlur={() => setHover(null)}
              className={cn(
                "mono-meta flex aspect-square items-center justify-center rounded-[5px] text-[11px] transition-transform duration-150 hover:scale-[1.06]",
                LEVELS[lvl],
                LEVEL_INK[lvl],
                // `ring-current` inherits the level's ink, so today is
                // visible on an empty cell and on a full-accent one alike.
                // A fixed accent ring vanished on exactly the days most
                // likely to be today.
                isToday && "ring-[1.5px] ring-inset ring-current",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="mono-meta h-4 text-muted">
          {hover ? (
            <span className="animate-fade-in">
              {hover.session.minutes > 0
                ? `${formatMinutes(hover.session.minutes)} on ${formatDay(hover.date)}`
                : `No activity — ${formatDay(hover.date)}`}
            </span>
          ) : (
            <span className="text-faint">Hover a day for detail</span>
          )}
        </div>
        <div className="mono-label flex items-center gap-1.5 text-faint">
          <span>Less</span>
          {LEVELS.map((l, i) => (
            <span key={i} className={cn("h-[10px] w-[10px] rounded-[2.5px]", l)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

/** Local-date ISO, so a cell is not shifted a day by the timezone. */
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/* -------------------------------- Shell -------------------------------- */

/**
 * Month or year, with the default chosen from how much history exists.
 *
 * A twelve-month grid holding three days of work reads as failure rather than
 * as a start. So a young account opens on the month — and once there is
 * enough history for the year view to say something, that becomes the
 * default on its own. Derived, so nobody has to remember to change it.
 */
export function ActivityHeatmap({ sessions }: { sessions: StudySession[] }) {
  const worked = useMemo(
    () => sessions.filter((s) => s.minutes > 0).map((s) => s.date).sort(),
    [sessions],
  );

  const spanDays = useMemo(() => {
    if (worked.length === 0) return 0;
    const first = new Date(`${worked[0]}T00:00:00`).getTime();
    return Math.round((Date.now() - first) / 86_400_000);
  }, [worked]);

  const [view, setView] = useState<"month" | "year">(() =>
    spanDays >= 120 ? "year" : "month",
  );
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const earliest = worked.length > 0 ? new Date(`${worked[0]}T00:00:00`) : new Date();
  const thisMonth = new Date();

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div
          className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5"
          role="tablist"
          aria-label="Activity range"
        >
          {(["month", "year"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "mono-meta rounded-md px-3 py-1 capitalize transition-colors",
                view === v
                  ? "bg-accent text-accent-ink"
                  : "text-subtle hover:text-fg",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <MonthHeatmap
          sessions={sessions}
          month={month}
          onMonthChange={setMonth}
          canGoBack={
            month.getFullYear() > earliest.getFullYear() ||
            (month.getFullYear() === earliest.getFullYear() &&
              month.getMonth() > earliest.getMonth())
          }
          canGoForward={
            month.getFullYear() < thisMonth.getFullYear() ||
            (month.getFullYear() === thisMonth.getFullYear() &&
              month.getMonth() < thisMonth.getMonth())
          }
        />
      ) : (
        <YearHeatmap sessions={sessions} />
      )}
    </div>
  );
}
