import type { DashboardSnapshot } from "@/lib/server-data";

type SymptomEntry = DashboardSnapshot["symptoms"][number];
type MoodEntry = DashboardSnapshot["moods"][number];

type IntensitySignals = {
  symptomAverageIntensity: number | null;
  moodAverageIntensity: number | null;
  highSymptomCount: number;
  highMoodCount: number;
  symptomTrend: "rising" | "falling" | "stable" | "insufficient";
  moodTrend: "rising" | "falling" | "stable" | "insufficient";
  topSymptoms: string[];
  topMoods: string[];
  noteHighlights: string[];
};

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function deriveTrend(values: number[]) {
  if (values.length < 4) {
    return "insufficient" as const;
  }

  const recentValues = values.slice(0, 3);
  const baselineValues = values.slice(3, 6);
  if (!baselineValues.length) {
    return "insufficient" as const;
  }

  const recentAverage = average(recentValues) ?? 0;
  const baselineAverage = average(baselineValues) ?? 0;
  const difference = recentAverage - baselineAverage;

  if (difference >= 1) return "rising" as const;
  if (difference <= -1) return "falling" as const;
  return "stable" as const;
}

function rankTopItems(items: string[], maxItems = 3) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const normalized = item.trim().toLowerCase();
    if (!normalized) return;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([label]) => label);
}

function compactNote(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 117)}...`;
}

export function deriveIntensitySignals(
  symptoms: SymptomEntry[],
  moods: MoodEntry[],
): IntensitySignals {
  const recentSymptoms = symptoms.slice(0, 8);
  const recentMoods = moods.slice(0, 8);

  const symptomValues = recentSymptoms.map((entry) => entry.intensity);
  const moodValues = recentMoods.map((entry) => entry.intensity);

  const topSymptoms = rankTopItems(recentSymptoms.flatMap((entry) => entry.symptoms));
  const topMoods = rankTopItems(recentMoods.map((entry) => entry.mood));
  const noteHighlights = [
    ...recentSymptoms.map((entry) => entry.notes ?? ""),
    ...recentMoods.map((entry) => entry.notes ?? ""),
  ]
    .map((note) => note.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(compactNote);

  return {
    symptomAverageIntensity: average(symptomValues),
    moodAverageIntensity: average(moodValues),
    highSymptomCount: symptomValues.filter((value) => value >= 7).length,
    highMoodCount: moodValues.filter((value) => value >= 7).length,
    symptomTrend: deriveTrend(symptomValues),
    moodTrend: deriveTrend(moodValues),
    topSymptoms,
    topMoods,
    noteHighlights,
  };
}

function labelTrend(value: IntensitySignals["symptomTrend"]) {
  if (value === "insufficient") return "insufficient data";
  return value;
}

export function buildSignalPromptContext(signals: IntensitySignals) {
  return `
Symptom average intensity: ${signals.symptomAverageIntensity ?? "unknown"}
Mood average intensity: ${signals.moodAverageIntensity ?? "unknown"}
High-intensity symptom entries (>=7/10): ${signals.highSymptomCount}
High-intensity mood entries (>=7/10): ${signals.highMoodCount}
Symptom intensity trend: ${labelTrend(signals.symptomTrend)}
Mood intensity trend: ${labelTrend(signals.moodTrend)}
Most frequent symptoms: ${signals.topSymptoms.join(", ") || "none"}
Most frequent moods: ${signals.topMoods.join(", ") || "none"}
Shared notes highlights: ${signals.noteHighlights.join(" | ") || "none"}
`.trim();
}

export function buildSignalAwareRecommendations(signals: IntensitySignals) {
  const recommendations: string[] = [];

  if (
    signals.highSymptomCount >= 2 ||
    (signals.symptomAverageIntensity != null && signals.symptomAverageIntensity >= 6.5)
  ) {
    recommendations.push(
      "High symptom intensity appears repeatedly. Log start time, duration, and relief methods so a clinician can review a clearer pattern.",
    );
  }

  if (
    signals.moodTrend === "rising" ||
    (signals.moodAverageIntensity != null && signals.moodAverageIntensity >= 6.5)
  ) {
    recommendations.push(
      "Mood intensity is elevated recently. Track sleep, stress, and major triggers on the same day to spot what amplifies symptoms.",
    );
  }

  if (signals.noteHighlights.length) {
    recommendations.push(
      "Your recent notes contain useful context. Keep notes specific and time-linked so the next cycles are easier to interpret.",
    );
  }

  while (recommendations.length < 3) {
    recommendations.push(
      "Keep daily check-ins consistent for one to two more cycles to improve forecast accuracy and trend confidence.",
    );
  }

  return recommendations.slice(0, 3);
}
