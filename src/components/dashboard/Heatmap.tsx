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
 * A year of study activity. Conceptually similar to any contribution graph —
 * weeks as columns, weekdays as rows — with its own scale and colour ramp.
 */
export function ActivityHeatmap({ sessions }: { sessions: StudySession[] }) {
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
