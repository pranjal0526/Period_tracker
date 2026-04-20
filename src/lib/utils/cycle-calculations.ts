import { addDays, differenceInCalendarDays, format } from "date-fns";

export type CycleRecord = {
  startDate: string;
  endDate?: string | null;
  cycleLength?: number | null;
  periodLength?: number | null;
};

export const TYPICAL_CYCLE_MIN_DAYS = 24;
export const TYPICAL_CYCLE_MAX_DAYS = 38;
export const PERIOD_LENGTH_UPPER_NORMAL_DAYS = 8;
export const ESTIMATED_LUTEAL_PHASE_DAYS = 14;
export const ESTIMATED_FERTILE_WINDOW_LENGTH_DAYS = 6;
export const MIN_LOGICAL_CYCLE_DAYS = 1;
export const MAX_LOGICAL_CYCLE_DAYS = 90;
export const MIN_LOGICAL_PERIOD_DAYS = 1;
export const MAX_LOGICAL_PERIOD_DAYS = 15;

function normalizeCycleLength(value: number) {
  return Math.max(21, Math.min(40, Math.round(value)));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function sanitizeCycleLength(value?: number | null) {
  if (!isFiniteNumber(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded >= MIN_LOGICAL_CYCLE_DAYS && rounded <= MAX_LOGICAL_CYCLE_DAYS
    ? rounded
    : null;
}

export function sanitizePeriodLength(value?: number | null) {
  if (!isFiniteNumber(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded >= MIN_LOGICAL_PERIOD_DAYS && rounded <= MAX_LOGICAL_PERIOD_DAYS
    ? rounded
    : null;
}

export function calculateCycleLength(current: Date, previous?: Date) {
  if (!previous) {
    return null;
  }

  const days = differenceInCalendarDays(current, previous);
  return sanitizeCycleLength(days);
}

export function calculatePeriodLength(startDate: Date, endDate?: Date | null) {
  if (!endDate) {
    return null;
  }

  const days = differenceInCalendarDays(endDate, startDate) + 1;
  return sanitizePeriodLength(days);
}

export function averageCycleLength(cycles: CycleRecord[]) {
  const lengths = cycles
    .map((cycle) => sanitizeCycleLength(cycle.cycleLength))
    .filter((value): value is number => value != null);

  if (!lengths.length) {
    return 28;
  }

  const total = lengths.reduce((sum, value) => sum + value, 0);
  return Math.round(total / lengths.length);
}

export function predictedNextPeriodDate(cycles: CycleRecord[]) {
  if (!cycles.length) {
    return null;
  }

  const average = averageCycleLength(cycles);
  return addDays(new Date(cycles[0].startDate), average);
}

export function estimateOvulationCycleDay(cycleLength = 28) {
  const safeLength = normalizeCycleLength(cycleLength);
  return Math.max(1, safeLength - ESTIMATED_LUTEAL_PHASE_DAYS);
}

export function estimateFertileWindowCycleDays(cycleLength = 28) {
  const ovulationDay = estimateOvulationCycleDay(cycleLength);
  const startDay = Math.max(1, ovulationDay - (ESTIMATED_FERTILE_WINDOW_LENGTH_DAYS - 1));

  return {
    startDay,
    ovulationDay,
    endDay: ovulationDay,
  };
}

export function estimateFertileWindowFromNextPeriodStart(nextPeriodStart: Date) {
  const ovulationDate = addDays(nextPeriodStart, -ESTIMATED_LUTEAL_PHASE_DAYS);
  const fertileStartDate = addDays(
    ovulationDate,
    -(ESTIMATED_FERTILE_WINDOW_LENGTH_DAYS - 1),
  );

  return {
    fertileStartDate,
    ovulationDate,
    fertileEndDate: ovulationDate,
  };
}

export function cyclePhaseLabel(
  dayOfCycle: number,
  options?: { cycleLength?: number; periodLength?: number },
) {
  const safeDay = Math.max(1, dayOfCycle);
  const cycleLength = normalizeCycleLength(options?.cycleLength ?? 28);
  const periodLength = Math.max(2, Math.min(8, options?.periodLength ?? 5));
  const fertileWindow = estimateFertileWindowCycleDays(cycleLength);

  if (safeDay <= periodLength) return "Menstrual phase";
  if (safeDay < fertileWindow.startDay) return "Follicular phase";
  if (safeDay < fertileWindow.ovulationDay) return "Fertile window";
  if (safeDay === fertileWindow.ovulationDay) return "Ovulation day (estimated)";
  return "Luteal phase";
}

export function buildChartData(cycles: CycleRecord[]) {
  return cycles
    .slice(0, 6)
    .reverse()
    .map((cycle, index) => ({
      cycle,
      index,
      cycleLength: sanitizeCycleLength(cycle.cycleLength),
      periodLength: sanitizePeriodLength(cycle.periodLength),
    }))
    .filter((entry) => entry.cycleLength != null || entry.periodLength != null)
    .map((entry) => ({
      name: format(new Date(entry.cycle.startDate), `MMM '${String(entry.index + 1)}`),
      cycleLength: entry.cycleLength ?? undefined,
      periodLength: entry.periodLength ?? undefined,
    }));
}
