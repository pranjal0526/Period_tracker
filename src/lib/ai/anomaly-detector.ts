import {
  PERIOD_LENGTH_UPPER_NORMAL_DAYS,
  TYPICAL_CYCLE_MAX_DAYS,
  TYPICAL_CYCLE_MIN_DAYS,
  sanitizeCycleLength,
  sanitizePeriodLength,
} from "@/lib/utils/cycle-calculations";

export type CycleSignal = {
  startDate: string | Date;
  cycleLength?: number | null;
  periodLength?: number | null;
  flowIntensity?: string | null;
};

export type Anomaly = {
  type: "delayed" | "frequent" | "heavy" | "missed" | "irregular";
  severity: "info" | "warning" | "urgent";
  message: string;
  recommendation: string;
};

export function detectAnomalies(cycles: CycleSignal[]): Anomaly[] {
  if (cycles.length < 1) {
    return [];
  }

  const sortedCycles = [...cycles].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
  const anomalies: Anomaly[] = [];
  const [lastCycle, previousCycle] = sortedCycles;
  const recentCycleLengths = sortedCycles
    .map((cycle) => sanitizeCycleLength(cycle.cycleLength))
    .filter((value): value is number => value != null)
    .slice(0, 6);
  const recentPeriodLengths = sortedCycles
    .map((cycle) => sanitizePeriodLength(cycle.periodLength))
    .filter((value): value is number => value != null)
    .slice(0, 6);
  const daysSinceLastPeriod = Math.floor(
    (Date.now() - new Date(lastCycle.startDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  const latestCycleLength = sanitizeCycleLength(lastCycle.cycleLength);
  const previousLength = sanitizeCycleLength(previousCycle?.cycleLength);

  if (latestCycleLength && latestCycleLength > TYPICAL_CYCLE_MAX_DAYS) {
    anomalies.push({
      type: "delayed",
      severity: "warning",
      message: `Your latest cycle is longer than ${TYPICAL_CYCLE_MAX_DAYS} days.`,
      recommendation:
        "If cycles keep running long or symptoms are disruptive, check in with a clinician.",
    });
  }

  if (latestCycleLength && latestCycleLength < TYPICAL_CYCLE_MIN_DAYS) {
    anomalies.push({
      type: "frequent",
      severity: "warning",
      message: `Your latest cycle is shorter than ${TYPICAL_CYCLE_MIN_DAYS} days.`,
      recommendation:
        "Short cycles can happen, but repeat patterns are worth discussing with a clinician.",
    });
  }

  const longestRecentPeriod = recentPeriodLengths.length
    ? Math.max(...recentPeriodLengths)
    : null;

  if (longestRecentPeriod && longestRecentPeriod > PERIOD_LENGTH_UPPER_NORMAL_DAYS) {
    anomalies.push({
      type: "heavy",
      severity: "warning",
      message: `Bleeding lasted longer than ${PERIOD_LENGTH_UPPER_NORMAL_DAYS} days in a recent cycle.`,
      recommendation:
        "If this repeats, schedule medical review. Seek urgent care sooner if bleeding is very heavy or you feel faint.",
    });
  }

  if (daysSinceLastPeriod > 90) {
    anomalies.push({
      type: "missed",
      severity: "warning",
      message: "No new period start is logged for more than 90 days.",
      recommendation:
        "Take a pregnancy test if relevant and arrange a clinician visit to review possible causes.",
    });
  } else if (
    !latestCycleLength &&
    daysSinceLastPeriod > TYPICAL_CYCLE_MAX_DAYS
  ) {
    anomalies.push({
      type: "delayed",
      severity: "warning",
      message: "Your period may be later than expected.",
      recommendation:
        "Keep tracking. If this delay repeats or you have concerning symptoms, seek care advice.",
    });
  }

  if (recentCycleLengths.length >= 3) {
    const variability = Math.max(...recentCycleLengths) - Math.min(...recentCycleLengths);

    if (variability > 20) {
      anomalies.push({
        type: "irregular",
        severity: "warning",
        message: "Cycle length variation is wider than expected month-to-month.",
        recommendation:
          "Consider sharing your cycle log with a clinician to evaluate irregularity patterns.",
      });
    } else if (variability >= 10) {
      anomalies.push({
        type: "irregular",
        severity: "info",
        message: "Cycle length has varied noticeably across recent months.",
        recommendation:
          "Continue tracking over the next few cycles to confirm whether this settles.",
      });
    }
  } else if (
    previousLength &&
    latestCycleLength &&
    Math.abs(previousLength - latestCycleLength) >= 10
  ) {
    anomalies.push({
      type: "irregular",
      severity: "info",
      message: "Your two latest cycle lengths are noticeably different.",
      recommendation:
        "Keep logging starts consistently. A few more cycles help confirm whether this is a trend.",
    });
  }

  return anomalies;
}
