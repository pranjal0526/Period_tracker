import { addDays, format, parseISO } from "date-fns";
import type { DashboardSnapshot } from "@/lib/server-data";
import { getLocalDateInputValue } from "@/lib/utils/date-helpers";
import {
  cyclePhaseLabel,
  sanitizeCycleLength,
  type CycleRecord,
} from "@/lib/utils/cycle-calculations";

export type DailyInsightInput = {
  cycle_day: number;
  avg_cycle_length: number;
  predicted_next_period: string;
  symptoms_today: string[];
  recent_symptoms_pattern: string[];
  mood_today: string;
  past_mood_pattern: string[];
};

export type PartnerInsightInput = {
  cycle_day: number;
  predicted_phase: string;
  symptoms_today: string[];
  mood_today: string;
};

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map(normalizeLabel).filter(Boolean))];
}

function rankLabels(values: string[], maxItems = 3) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const normalized = normalizeLabel(value);
    if (!normalized) {
      return;
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([label]) => label);
}

function isTodayInLocalTimezone(dateValue: string, reference = new Date()) {
  return getLocalDateInputValue(parseISO(dateValue)) === getLocalDateInputValue(reference);
}

function getCycleRecords(snapshot: DashboardSnapshot): CycleRecord[] {
  return snapshot.cycles.map((cycle) => ({
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    cycleLength: cycle.cycleLength,
    periodLength: cycle.periodLength,
  }));
}

export function calculateAverageCycle(cycles: CycleRecord[]) {
  const validLengths = cycles
    .map((cycle) => sanitizeCycleLength(cycle.cycleLength))
    .filter((value): value is number => value != null);

  if (!validLengths.length) {
    return null;
  }

  const total = validLengths.reduce((sum, value) => sum + value, 0);
  return Math.round(total / validLengths.length);
}

export function predictNextPeriod(cycles: CycleRecord[]) {
  const averageCycleLength = calculateAverageCycle(cycles);

  if (!cycles.length || averageCycleLength == null) {
    return null;
  }

  return format(addDays(new Date(cycles[0].startDate), averageCycleLength), "yyyy-MM-dd");
}

export function detectSymptomPatterns(symptoms: DashboardSnapshot["symptoms"]) {
  const recentSymptoms = symptoms.slice(0, 8);
  const topSymptoms = rankLabels(recentSymptoms.flatMap((entry) => entry.symptoms), 3);
  const highIntensityCount = recentSymptoms.filter((entry) => entry.intensity >= 7).length;
  const patterns: string[] = [];

  if (topSymptoms.length) {
    patterns.push(`Recurring symptoms: ${topSymptoms.join(", ")}`);
  }

  if (highIntensityCount >= 2) {
    patterns.push("Higher-intensity symptom days appeared more than once recently");
  }

  return patterns.slice(0, 4);
}

export function detectMoodPatterns(moods: DashboardSnapshot["moods"]) {
  const recentMoods = moods.slice(0, 8);
  const topMoods = rankLabels(recentMoods.map((entry) => entry.mood), 3);
  const highIntensityCount = recentMoods.filter((entry) => entry.intensity >= 7).length;
  const patterns: string[] = [];

  if (topMoods.length) {
    patterns.push(`Common moods: ${topMoods.join(", ")}`);
  }

  if (highIntensityCount >= 2) {
    patterns.push("Stronger mood shifts showed up more than once recently");
  }

  return patterns.slice(0, 4);
}

function getSymptomsToday(snapshot: DashboardSnapshot) {
  return uniqueValues(
    snapshot.symptoms
      .filter((entry) => isTodayInLocalTimezone(entry.date))
      .flatMap((entry) => entry.symptoms),
  ).slice(0, 6);
}

function getMoodToday(snapshot: DashboardSnapshot) {
  const moodEntry = snapshot.moods.find((entry) => isTodayInLocalTimezone(entry.date));
  return moodEntry ? normalizeLabel(moodEntry.mood) : "Not logged today";
}

export function predictPhaseLabel(
  cycleDay: number | null | undefined,
  averageCycleLength: number | null | undefined,
  periodLength?: number | null,
) {
  if (!cycleDay || cycleDay < 1 || !averageCycleLength || averageCycleLength < 1) {
    return "Phase unclear";
  }

  return cyclePhaseLabel(cycleDay, {
    cycleLength: averageCycleLength,
    periodLength: periodLength ?? undefined,
  }).replace(" (estimated)", "");
}

export function buildDailyInsightInput(snapshot: DashboardSnapshot): DailyInsightInput {
  const cycleRecords = getCycleRecords(snapshot);
  const averageCycleLength = calculateAverageCycle(cycleRecords);
  const predictedNextPeriod = predictNextPeriod(cycleRecords);

  return {
    cycle_day: snapshot.metrics.currentCycleDay ?? 0,
    avg_cycle_length: averageCycleLength ?? 0,
    predicted_next_period: predictedNextPeriod ?? "Unknown",
    symptoms_today: getSymptomsToday(snapshot),
    recent_symptoms_pattern: detectSymptomPatterns(snapshot.symptoms),
    mood_today: getMoodToday(snapshot),
    past_mood_pattern: detectMoodPatterns(snapshot.moods),
  };
}

export function buildPartnerInsightInput(snapshot: DashboardSnapshot): PartnerInsightInput {
  const predictedPhase =
    snapshot.metrics.currentPhase === "Waiting for first cycle"
      ? "Phase unclear"
      : snapshot.metrics.currentPhase.replace(" (estimated)", "") || "Phase unclear";

  return {
    cycle_day: snapshot.metrics.currentCycleDay ?? 0,
    predicted_phase: predictedPhase,
    symptoms_today: getSymptomsToday(snapshot),
    mood_today: getMoodToday(snapshot),
  };
}

export function hasMeaningfulDailyInsightData(input: DailyInsightInput) {
  return (
    input.cycle_day > 0 ||
    input.avg_cycle_length > 0 ||
    input.predicted_next_period !== "Unknown" ||
    input.symptoms_today.length > 0 ||
    input.recent_symptoms_pattern.length > 0 ||
    input.mood_today !== "Not logged today" ||
    input.past_mood_pattern.length > 0
  );
}

export function hasMeaningfulPartnerInsightData(input: PartnerInsightInput) {
  return (
    input.cycle_day > 0 ||
    input.predicted_phase !== "Phase unclear" ||
    input.symptoms_today.length > 0 ||
    input.mood_today !== "Not logged today"
  );
}
