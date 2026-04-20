import { HeartPulse, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AnomalyAlert } from "@/components/ai/anomaly-alert";
import { DailyInsight } from "@/components/ai/DailyInsight";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { CycleChart } from "@/components/dashboard/cycle-chart";
import { MoodLogger } from "@/components/dashboard/mood-logger";
import { SymptomLogger } from "@/components/dashboard/symptom-logger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildCareNote } from "@/lib/notifications";
import type { DashboardSnapshot } from "@/lib/server-data";
import { formatLongDate } from "@/lib/utils/date-helpers";

type DashboardHomeProps = {
  snapshot: DashboardSnapshot;
  userName?: string | null;
};

const metricCards = [
  {
    key: "day",
    label: "Current cycle day",
    compactLabel: "Cycle day",
    icon: HeartPulse,
  },
  {
    key: "length",
    label: "Average cycle length",
    compactLabel: "Avg. cycle",
    icon: Sparkles,
  },
  {
    key: "phase",
    label: "Current phase",
    compactLabel: "Phase",
    icon: ShieldCheck,
  },
  {
    key: "partner",
    label: "Partner mode",
    compactLabel: "Partner",
    icon: Users,
  },
] as const;

export function DashboardHome({ snapshot, userName }: DashboardHomeProps) {
  const careNote = buildCareNote(snapshot, { audience: "user" });
  const dailyInsightCacheKey = [
    snapshot.metrics.currentCycleDay ?? "none",
    snapshot.metrics.averageCycleLength ?? "none",
    snapshot.metrics.nextPeriodDate ?? "none",
    snapshot.cycles[0]?.startDate ?? "none",
    snapshot.symptoms[0]?.date ?? "none",
    snapshot.moods[0]?.date ?? "none",
  ].join(":");
  const values = {
    day: snapshot.metrics.currentCycleDay
      ? `Day ${snapshot.metrics.currentCycleDay}`
      : "No data yet",
    length:
      snapshot.metrics.averageCycleLength != null
        ? `${snapshot.metrics.averageCycleLength} days`
        : "Awaiting data",
    phase:
      snapshot.metrics.currentPhase === "Waiting for first cycle"
        ? "Awaiting data"
        : snapshot.metrics.currentPhase.replace(" (estimated)", ""),
    partner: snapshot.partnerConnection?.consentGiven ? "Connected" : "Not linked",
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Dashboard</Badge>
            <p className="text-sm text-muted">
              {userName
                ? `Welcome, ${userName}. Here’s the clearest snapshot of this cycle so far.`
                : "Track your cycle and insights in one place."}
            </p>
          </div>
          <div className="rounded-[24px] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.48),rgba(255,248,242,0.88))] p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Next expected period</p>
            <p className="mt-2 text-[1.65rem] font-semibold leading-tight text-foreground sm:text-[1.8rem]">
              {snapshot.metrics.nextPeriodDate
                ? formatLongDate(snapshot.metrics.nextPeriodDate)
                : "Needs more data"}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[18px] bg-card/88 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Fertile window</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {snapshot.metrics.fertileWindow ?? "Needs more history"}
                </p>
              </div>
              <div className="rounded-[18px] bg-card/88 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Ovulation</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {snapshot.metrics.estimatedOvulationDate
                    ? formatLongDate(snapshot.metrics.estimatedOvulationDate)
                    : "Needs more history"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-secondary/16 bg-[linear-gradient(180deg,rgba(13,125,121,0.08),rgba(13,125,121,0.03))] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-secondary">
              {careNote.title}
            </p>
            <p className="mt-2 text-sm leading-7 text-foreground/92">
              {careNote.message}
            </p>
          </div>

          {snapshot.setupError ? (
            <div className="rounded-[24px] border border-warning/20 bg-warning/8 px-4 py-3 text-sm text-warning">
              {snapshot.setupError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metricCards.map(({ key, label, compactLabel, icon: Icon }) => (
          <Card key={key} className="overflow-hidden p-0">
            <CardContent className="mt-0 flex min-h-[148px] min-w-0 flex-col justify-between p-4 sm:min-h-[156px] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
                  <span className="xl:hidden">{compactLabel}</span>
                  <span className="hidden xl:inline">{label}</span>
                </p>
                <div className="shrink-0 rounded-full bg-card-strong p-2.5 text-primary sm:p-3">
                  <Icon className="size-4 sm:size-[18px]" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-balance text-base font-semibold leading-snug text-foreground sm:text-lg xl:text-[1.7rem] xl:leading-tight">
                  {values[key]}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DailyInsight key={dailyInsightCacheKey} cacheKey={dailyInsightCacheKey} />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <CycleChart cycles={snapshot.cycles} />
        <AnomalyAlert anomalies={snapshot.anomalies} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <CalendarView cycles={snapshot.cycles} metrics={snapshot.metrics} />
        <div className="grid gap-6">
          <SymptomLogger symptoms={snapshot.symptoms} />
          <MoodLogger moods={snapshot.moods} />
        </div>
      </div>
    </div>
  );
}
