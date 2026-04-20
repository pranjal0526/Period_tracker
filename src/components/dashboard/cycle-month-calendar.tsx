"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  averageCycleLength,
  estimateFertileWindowFromNextPeriodStart,
} from "@/lib/utils/cycle-calculations";
import { cn } from "@/lib/utils";
import type { DashboardSnapshot } from "@/lib/server-data";

type CycleMonthCalendarProps = {
  cycles: DashboardSnapshot["cycles"];
};

type SignalSource = "actual" | "predicted";

type DaySignal = {
  period?: SignalSource;
  periodStart?: SignalSource;
  periodEnd?: SignalSource;
  fertile?: SignalSource;
  ovulation?: SignalSource;
};

const weekdays = [
  { short: "S", full: "Sun" },
  { short: "M", full: "Mon" },
  { short: "T", full: "Tue" },
  { short: "W", full: "Wed" },
  { short: "T", full: "Thu" },
  { short: "F", full: "Fri" },
  { short: "S", full: "Sat" },
];

export function CycleMonthCalendar({ cycles }: CycleMonthCalendarProps) {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));

  const sortedCycles = [...cycles].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const averageLength = Math.max(
    21,
    Math.min(
      40,
      averageCycleLength(
        sortedCycles.map((cycle) => ({
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          cycleLength: cycle.cycleLength,
          periodLength: cycle.periodLength,
        })),
      ),
    ),
  );

  const periodLengths = sortedCycles
    .map((cycle) => {
      if (typeof cycle.periodLength === "number" && cycle.periodLength > 0) {
        return cycle.periodLength;
      }

      if (cycle.endDate) {
        const start = startOfDay(new Date(cycle.startDate));
        const end = startOfDay(new Date(cycle.endDate));
        return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      }

      return null;
    })
    .filter((value): value is number => value != null);
  const averagePeriodLength = periodLengths.length
    ? Math.max(
        3,
        Math.min(
          8,
          Math.round(periodLengths.reduce((sum, value) => sum + value, 0) / periodLengths.length),
        ),
      )
    : 5;

  const upcomingStarts: Date[] = [];
  const latestCycleStart = sortedCycles.at(-1)?.startDate;

  if (latestCycleStart) {
    let nextStart = addDays(startOfDay(new Date(latestCycleStart)), averageLength);

    while (!isAfter(nextStart, today)) {
      nextStart = addDays(nextStart, averageLength);
    }

    upcomingStarts.push(nextStart, addDays(nextStart, averageLength));
  }

  const daySignals = new Map<string, DaySignal>();
  let minTrackedDate = startOfDay(today);
  let maxTrackedDate = startOfDay(today);

  const updateBounds = (day: Date) => {
    if (isBefore(day, minTrackedDate)) {
      minTrackedDate = day;
    }
    if (isAfter(day, maxTrackedDate)) {
      maxTrackedDate = day;
    }
  };

  const upsertSignal = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const existing = daySignals.get(key);

    if (existing) {
      return existing;
    }

    const created: DaySignal = {};
    daySignals.set(key, created);
    return created;
  };

  const mergeSignal = <T extends keyof DaySignal>(
    signal: DaySignal,
    field: T,
    source: SignalSource,
  ) => {
    const current = signal[field];

    if (current == null || (current === "predicted" && source === "actual")) {
      signal[field] = source;
    }
  };

  const applyPeriodRange = (rangeStart: Date, rangeEnd: Date, source: SignalSource) => {
    const start = startOfDay(rangeStart);
    const end = startOfDay(rangeEnd);

    eachDayOfInterval({ start, end }).forEach((day) => {
      const signal = upsertSignal(day);
      mergeSignal(signal, "period", source);
      updateBounds(day);
    });

    mergeSignal(upsertSignal(start), "periodStart", source);
    mergeSignal(upsertSignal(end), "periodEnd", source);
    updateBounds(start);
    updateBounds(end);
  };

  const applyFertilityRange = (
    cycleStart: Date,
    cycleEnd: Date,
    source: SignalSource,
  ) => {
    const { fertileStartDate, ovulationDate } =
      estimateFertileWindowFromNextPeriodStart(cycleEnd);
    const ovulationDay = isBefore(ovulationDate, cycleStart) ? cycleStart : ovulationDate;
    const fertileStart = isBefore(fertileStartDate, cycleStart)
      ? cycleStart
      : fertileStartDate;

    eachDayOfInterval({ start: fertileStart, end: ovulationDay }).forEach((day) => {
      const signal = upsertSignal(day);
      mergeSignal(signal, "fertile", source);
      updateBounds(day);
    });

    mergeSignal(upsertSignal(ovulationDay), "ovulation", source);
    updateBounds(ovulationDay);
  };

  sortedCycles.forEach((cycle) => {
    const start = startOfDay(new Date(cycle.startDate));
    const end = cycle.endDate ? startOfDay(new Date(cycle.endDate)) : start;
    const safeEnd = isBefore(end, start) ? start : end;
    applyPeriodRange(start, safeEnd, "actual");
  });

  upcomingStarts.forEach((predictedStart) => {
    const predictedEnd = addDays(predictedStart, averagePeriodLength - 1);
    applyPeriodRange(predictedStart, predictedEnd, "predicted");
  });

  const actualStarts = sortedCycles.map((cycle) => startOfDay(new Date(cycle.startDate)));

  actualStarts.forEach((currentStart, index) => {
    const nextActualStart = actualStarts[index + 1];

    if (nextActualStart) {
      applyFertilityRange(currentStart, nextActualStart, "actual");
      return;
    }

    if (upcomingStarts[0]) {
      applyFertilityRange(currentStart, upcomingStarts[0], "predicted");
    }
  });

  if (upcomingStarts[0] && upcomingStarts[1]) {
    applyFertilityRange(upcomingStarts[0], upcomingStarts[1], "predicted");
  }

  const earliestMonth = startOfMonth(minTrackedDate);
  const latestMonth = startOfMonth(addMonths(maxTrackedDate, 1));
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth)),
    end: endOfWeek(endOfMonth(visibleMonth)),
  });
  const canGoPrevious = isAfter(visibleMonth, earliestMonth);
  const canGoNext = isBefore(visibleMonth, latestMonth);

  const toneClass = (tone: "period" | "fertile" | "ovulation" | "muted") =>
    ({
      period: "bg-primary/14 text-primary",
      fertile: "bg-secondary/14 text-secondary",
      ovulation: "bg-secondary/24 text-secondary",
      muted: "bg-card-strong text-muted",
    })[tone];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Month view</CardTitle>
        <CardDescription>
          Switch months to review logged dates and estimated fertile or ovulation windows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-line/70 bg-card-strong px-2 py-2 sm:gap-3 sm:px-3">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
            disabled={!canGoPrevious}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="text-sm font-semibold text-foreground sm:text-lg">
              {format(visibleMonth, "MMMM yyyy")}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
              {format(earliestMonth, "MMM yyyy")} to {format(latestMonth, "MMM yyyy")}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-muted sm:gap-2 sm:text-[11px]">
            {weekdays.map(({ short, full }) => (
              <div key={full}>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{full}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const signals = daySignals.get(key);
              const isPeriodDay = Boolean(signals?.period);
              const isPredictedPeriod = signals?.period === "predicted";
              const isFertileDay = Boolean(signals?.fertile);
              const isPredictedFertile = signals?.fertile === "predicted";
              const isOvulationDay = Boolean(signals?.ovulation);
              const isCurrentMonth = isSameMonth(day, visibleMonth);
              const labels: Array<{
                text: string;
                tone: "period" | "fertile" | "ovulation" | "muted";
              }> = [];

              if (signals?.periodStart === "actual") labels.push({ text: "Period start", tone: "period" });
              if (signals?.periodStart === "predicted")
                labels.push({ text: "Pred. start", tone: "period" });
              if (signals?.periodEnd === "actual") labels.push({ text: "Period end", tone: "period" });
              if (signals?.periodEnd === "predicted") labels.push({ text: "Pred. end", tone: "period" });

              if (!labels.length && signals?.period === "actual") {
                labels.push({ text: "Period", tone: "period" });
              }
              if (!labels.length && signals?.period === "predicted") {
                labels.push({ text: "Pred. period", tone: "period" });
              }

              if (signals?.ovulation === "actual") labels.push({ text: "Ovulation", tone: "ovulation" });
              if (signals?.ovulation === "predicted")
                labels.push({ text: "Pred. ovu.", tone: "ovulation" });
              if (!isOvulationDay && signals?.fertile === "actual") {
                labels.push({ text: "Fertile", tone: "fertile" });
              }
              if (!isOvulationDay && signals?.fertile === "predicted") {
                labels.push({ text: "Pred. fertile", tone: "fertile" });
              }

              if (!labels.length && isToday(day)) {
                labels.push({ text: "Today", tone: "muted" });
              }

              return (
                <div
                  key={key}
                  className={cn(
                    "flex min-h-[72px] flex-col items-center justify-start gap-1 rounded-lg border px-1 py-1.5 text-[11px] transition sm:min-h-24 sm:rounded-xl sm:px-1.5 sm:py-2 sm:text-sm",
                    isPeriodDay
                      ? isPredictedPeriod
                        ? "border-primary/28 border-dashed bg-primary/8"
                        : "border-primary/40 bg-primary/12"
                      : isFertileDay
                        ? isPredictedFertile
                          ? "border-secondary/28 border-dashed bg-secondary/8"
                          : "border-secondary/35 bg-secondary/12"
                        : "border-line bg-card",
                    isOvulationDay ? "ring-2 ring-secondary/35" : "",
                    isToday(day) ? "ring-[var(--ring)]" : "",
                    isCurrentMonth ? "text-foreground" : "opacity-40",
                  )}
                >
                  <span className="font-semibold">{format(day, "d")}</span>
                  <div className="flex w-full flex-col items-center gap-1">
                    {labels.slice(0, 2).map((label, index) => (
                      <span
                        key={`${key}-${label.text}`}
                        className={cn(
                          "rounded-full px-1 py-0.5 text-center text-[8px] font-semibold leading-none sm:px-1.5 sm:text-[9px]",
                          toneClass(label.tone),
                          index === 1 ? "hidden sm:inline-flex" : "inline-flex",
                        )}
                      >
                        {label.text}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-line/70 bg-card p-3 text-xs text-muted">
          <p className="uppercase tracking-[0.16em]">Legend</p>
          <p className="mt-2">
            Filled colors are logged dates. Dashed styles are predictions for upcoming cycles,
            fertile windows, and ovulation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
