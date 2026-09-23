import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader, Card, Badge } from "@/components/ui/primitives";
import { STUDY_PLAN } from "@/data/studyPlan";
import { TODAY_SLOTS, USER } from "@/data/profile";
import { IconCalendar, IconTarget, IconBraces, IconAndroid, IconTerminal } from "@/components/icons";
import { formatMinutes } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Study Plans",
  description:
    `${STUDY_PLAN.length} weeks at roughly two hours a day, pairing Kotlin with the Android idea it unlocks.`,
};

export default function StudyPlansPage() {
  return (
    <div>
      <PageHeader
        kicker="Study plans"
        title={`${STUDY_PLAN.length} Weeks to Android Interview Ready`}
        subtitle="Roughly two focused hours a day. Each week pairs the Kotlin you need with the Android idea it unlocks, and closes with the interview pattern that keeps the DSA muscle warm."
      />

      {/* --------------------------- Daily shape ------------------------- */}
      <Card className="mb-9 p-5">
        <div className="mono-label mb-4 flex items-center gap-2 text-subtle">
          <IconCalendar size={13} />
          The daily shape
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {TODAY_SLOTS.map((slot) => (
            <div
              key={slot.label}
              className="rounded-lg border border-line bg-surface-2/50 p-4"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px] font-semibold text-fg-dim">
                  {slot.label}
                </span>
                <span className="mono-meta text-accent">{slot.minutes}m</span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-subtle">{slot.topic}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-subtle">
          {formatMinutes(USER.dailyTargetMinutes)} a day, five or six days a week.
          The rest days are in the plan on purpose — spaced repetition needs the
          gaps as much as the sessions.
        </p>
      </Card>

      {/* ----------------------------- Weeks ----------------------------- */}
      <div className="space-y-3">
        {STUDY_PLAN.map((week) => (
          <Card key={week.week} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mono-label mb-2 text-faint">
                  Week {String(week.week).padStart(2, "0")}
                </div>
                <h2 className="text-[16px] font-semibold tracking-tight text-fg">
                  {week.theme}
                </h2>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
                  {week.focus}
                </p>
              </div>
              {week.project ? (
                <Badge tone="accent">Project week</Badge>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <Column
                icon={<IconBraces size={12} />}
                title="Kotlin"
                items={week.kotlin}
                tone="text-accent"
              />
              <Column
                icon={<IconAndroid size={12} />}
                title="Android"
                items={week.android}
                tone="text-info"
              />
              <Column
                icon={<IconTerminal size={12} />}
                title="Interview"
                items={week.interview}
                tone="text-violet"
              />
            </div>

            {week.project ? (
              <div className="mt-5 rounded-lg border border-accent/20 bg-accent/[0.05] p-4">
                <div className="mono-label mb-2 flex items-center gap-2 text-accent">
                  <IconTarget size={12} />
                  Project
                </div>
                <p className="text-[13px] leading-relaxed text-fg-dim">
                  {week.project}
                </p>
              </div>
            ) : null}

            <div className="mt-5 border-t border-line pt-4">
              <span className="mono-label mr-2 text-subtle">By the end</span>
              <span className="text-[13px] leading-relaxed text-fg-dim">
                {week.outcome}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Column({
  icon,
  title,
  items,
  tone,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div>
      <div className={`mono-label mb-2.5 flex items-center gap-2 ${tone}`}>
        {icon}
        {title}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="mono-meta rounded border border-line bg-surface-2/60 px-1.5 py-1 text-muted"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
