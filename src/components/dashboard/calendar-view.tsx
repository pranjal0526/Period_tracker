import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate, formatShortDate } from "@/lib/utils/date-helpers";
import type { DashboardSnapshot } from "@/lib/server-data";

type CalendarViewProps = {
  cycles: DashboardSnapshot["cycles"];
  metrics: DashboardSnapshot["metrics"];
};

export function CalendarView({ cycles, metrics }: CalendarViewProps) {
  const latestCycleId = cycles[0]?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cycle calendar</CardTitle>
        <CardDescription>
          Upcoming milestones based on your logged starts and estimated ovulation timing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[24px] bg-card-strong p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Next expected period</p>
            <p className="mt-2 break-words text-lg font-semibold text-foreground">
              {metrics.nextPeriodDate ? formatLongDate(metrics.nextPeriodDate) : "Needs more data"}
            </p>
          </div>
          <div className="rounded-[24px] bg-card-strong p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">
              Estimated ovulation day
            </p>
            <p className="mt-2 break-words text-lg font-semibold text-foreground">
              {metrics.estimatedOvulationDate
                ? formatLongDate(metrics.estimatedOvulationDate)
                : "Needs more data"}
            </p>
          </div>
          <div className="rounded-[24px] bg-card-strong p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Estimated fertile window</p>
            <p className="mt-2 break-words text-lg font-semibold text-foreground">
              {metrics.fertileWindow ?? "Needs more data"}
            </p>
            <p className="mt-1 text-xs text-muted">
              Window is shown as the 5 days before ovulation plus ovulation day.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-line/70 bg-card p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Recent starts</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {cycles.length ? (
              cycles.slice(0, 5).map((cycle) => {
                const cycleLengthLabel =
                  cycle.cycleLength != null
                    ? `Cycle ${cycle.cycleLength} days`
                    : "Cycle length pending";

                return (
                  <div
                    key={cycle.id}
                    className="rounded-2xl border border-line/70 bg-card-strong px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {formatShortDate(cycle.startDate)}
                      {cycle.endDate
                        ? ` - ${formatShortDate(cycle.endDate)}`
                        : cycle.id === latestCycleId
                          ? " - ongoing"
                          : " - end date missing"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {cycleLengthLabel} •{" "}
                      {cycle.periodLength
                        ? `Period ${cycle.periodLength} days`
                        : cycle.id === latestCycleId
                          ? "Period in progress"
                          : "End date missing"}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted">
                No live cycle entries yet. Once you log a start date, your calendar summary will show up here.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
