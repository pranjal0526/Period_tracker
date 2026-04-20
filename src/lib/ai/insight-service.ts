import { z } from "zod";
import { readInsightCache, writeInsightCache } from "@/lib/ai/insight-cache";
import { callGroqChat, explainGroqError } from "@/lib/ai/groq";
import {
  hasMeaningfulDailyInsightData,
  hasMeaningfulPartnerInsightData,
  predictPhaseLabel,
  type DailyInsightInput,
  type PartnerInsightInput,
} from "@/lib/ai/ruleEngine";

export const dailyInsightSchema = z.object({
  cycle_day: z.number().int().min(0).max(120),
  avg_cycle_length: z.number().int().min(0).max(90),
  predicted_next_period: z.string().trim().min(1).max(40),
  symptoms_today: z.array(z.string().trim().min(1).max(40)).max(8),
  recent_symptoms_pattern: z.array(z.string().trim().min(1).max(80)).max(6),
  mood_today: z.string().trim().min(1).max(40),
  past_mood_pattern: z.array(z.string().trim().min(1).max(80)).max(6),
});

export const partnerInsightSchema = z.object({
  cycle_day: z.number().int().min(0).max(120),
  predicted_phase: z.string().trim().min(1).max(40),
  symptoms_today: z.array(z.string().trim().min(1).max(40)).max(8),
  mood_today: z.string().trim().min(1).max(40),
});

export type InsightResponse = {
  insight: string;
  generatedAt: string;
  source: "ai" | "fallback";
  aiError: string | null;
};

const DAILY_SYSTEM_PROMPT = `You are a women's health assistant inside a period tracking app.

Your role:
- Provide supportive, non-medical insights based only on given structured data
- Be calm, accurate, and emotionally supportive
- Never give diagnosis or medical advice
- Never hallucinate missing data

Rules:
- Keep response under 80 words
- Use simple human tone
- Focus on patterns and helpful suggestions
- If data is insufficient, say that clearly`;

const PARTNER_SYSTEM_PROMPT = `You are helping a partner support their significant other during her menstrual cycle.

Rules:
- Be respectful and emotionally intelligent
- Do NOT reveal private or sensitive details
- Focus only on how to support
- Keep response under 60 words
- Give 1-2 actionable suggestions`;

function formatList(values: string[], emptyLabel: string) {
  return values.length ? values.join(", ") : emptyLabel;
}

function humanList(values: string[]) {
  if (!values.length) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function toLowerPhrase(value: string) {
  return value.replace(/^[A-Z]/, (char) => char.toLowerCase());
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function hasMatchingKeyword(values: string[], pattern: RegExp) {
  return values.some((value) => pattern.test(normalizeKeyword(value)));
}

function normalizeGeneratedText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

function clampWords(value: string, maxWords: number) {
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return value;
  }

  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function getDaysUntilNextPeriod(predictedNextPeriod: string) {
  if (!predictedNextPeriod || predictedNextPeriod === "Unknown") {
    return null;
  }

  const today = new Date();
  const comparisonDate = new Date(`${predictedNextPeriod}T00:00:00.000Z`);

  if (Number.isNaN(comparisonDate.getTime())) {
    return null;
  }

  today.setHours(0, 0, 0, 0);
  return Math.round((comparisonDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function describeDailyPhase(input: DailyInsightInput) {
  const phase = predictPhaseLabel(input.cycle_day, input.avg_cycle_length);
  const daysUntilNextPeriod = getDaysUntilNextPeriod(input.predicted_next_period);

  if (phase === "Phase unclear") {
    return {
      phase,
      summary: "Phase is still unclear because the cycle pattern is light so far.",
    };
  }

  if (daysUntilNextPeriod != null && daysUntilNextPeriod >= 0 && daysUntilNextPeriod <= 3) {
    return {
      phase,
      summary: `${phase} looks plausible, and the next period may be fairly close.`,
    };
  }

  return {
    phase,
    summary: `${phase} is the best fit for the current cycle timing.`,
  };
}

function describePatternAlignment(input: DailyInsightInput) {
  const symptomKeywords = input.recent_symptoms_pattern.join(" ").toLowerCase();
  const moodKeywords = input.past_mood_pattern.join(" ").toLowerCase();

  if (!input.symptoms_today.length && input.mood_today === "Not logged today") {
    return "There is no same-day symptom or mood check-in yet, so keep the tone gentle and clear about limited data.";
  }

  if (
    input.symptoms_today.some((symptom) => symptomKeywords.includes(symptom.toLowerCase())) ||
    (input.mood_today !== "Not logged today" &&
      moodKeywords.includes(input.mood_today.toLowerCase()))
  ) {
    return "Today's symptoms or mood look reasonably consistent with the recent pattern.";
  }

  if (input.recent_symptoms_pattern.length || input.past_mood_pattern.length) {
    return "Today's check-in has a slightly different feel from the recent pattern, so acknowledge that gently.";
  }

  return "There is only a light pattern history so far, so avoid sounding overly certain.";
}

function buildDailySuggestionFocus(input: DailyInsightInput) {
  const symptomValues = input.symptoms_today.map(normalizeKeyword);
  const moodValue = normalizeKeyword(input.mood_today);
  const phase = predictPhaseLabel(input.cycle_day, input.avg_cycle_length);

  if (hasMatchingKeyword(symptomValues, /cramp|ache|pain|back pain|pelvic/)) {
    return "Focus on comfort: warmth, easier pacing, and keeping water nearby.";
  }

  if (hasMatchingKeyword(symptomValues, /bloat|nausea|stomach|digest/)) {
    return "Focus on steadiness: small meals, water, and a less rushed day may feel kinder.";
  }

  if (/low|sad|anxious|stressed|irritable|tired|overwhelmed/.test(moodValue)) {
    return "Focus on reducing friction: a softer schedule or one calming reset would fit well.";
  }

  if (phase === "Follicular phase") {
    return "Focus on steadiness rather than overthinking every signal.";
  }

  if (phase === "Luteal phase") {
    return "Focus on gentleness and lowering pressure if energy feels uneven.";
  }

  return "Focus on one small, practical form of care rather than broad wellness advice.";
}

function buildPartnerSuggestionFocus(input: PartnerInsightInput) {
  const symptomValues = input.symptoms_today.map(normalizeKeyword);
  const moodValue = normalizeKeyword(input.mood_today);

  if (hasMatchingKeyword(symptomValues, /cramp|ache|pain|back pain|pelvic/)) {
    return "Offer warmth, water, or help with one practical task without making a big production of it.";
  }

  if (hasMatchingKeyword(symptomValues, /bloat|nausea|stomach|digest/)) {
    return "Keep plans flexible and make it easy for them to choose comfort.";
  }

  if (/low|sad|anxious|stressed|irritable|tired|overwhelmed/.test(moodValue)) {
    return "Lead with patience, keep expectations light, and ask one simple question about what would help.";
  }

  return "Stay calm, keep support low-pressure, and let them set the tone.";
}

function buildDailyStyleExamples() {
  return `Good style examples:
- "You may be in your menstrual phase, and cramps with a lower-energy mood seem close to your recent pattern. A gentler day with warmth and water may feel especially supportive."
- "This looks more like a follicular stretch, and today's check-in does not strongly break from your recent pattern. Keep things simple and just note anything that feels newly different."
- "There is not enough pattern data yet to say much confidently. A few more check-ins will make tomorrow's insight feel much more personal."`;
}

function buildPartnerStyleExamples() {
  return `Good style examples:
- "They may be in a lower-energy part of the cycle, so softer plans and one practical offer of help may land well today."
- "Nothing dramatic stands out, so the best move is calm support: check in kindly and stay flexible if energy changes."
- "There is not enough shared data to be specific today, so keep support simple and let them lead what feels helpful."`;
}

function buildDailyPrompt(input: DailyInsightInput) {
  const phaseSummary = describeDailyPhase(input);
  const patternAlignment = describePatternAlignment(input);
  const suggestionFocus = buildDailySuggestionFocus(input);
  const concreteCue =
    humanList(input.symptoms_today) ||
    (input.mood_today !== "Not logged today" ? input.mood_today : "limited same-day signals");

  return `User Data:
Cycle Day: ${input.cycle_day || "Unknown"}
Average Cycle Length: ${input.avg_cycle_length || "Unknown"}
Predicted Next Period: ${input.predicted_next_period}
Symptoms Today: ${formatList(input.symptoms_today, "None logged")}
Symptom Pattern: ${formatList(input.recent_symptoms_pattern, "No clear pattern yet")}
Mood Today: ${input.mood_today}
Mood Pattern: ${formatList(input.past_mood_pattern, "No clear pattern yet")}

Observed helpers:
Likely phase: ${phaseSummary.phase}
Phase note: ${phaseSummary.summary}
Pattern read: ${patternAlignment}
Concrete cue to anchor on if helpful: ${concreteCue}
Suggestion focus: ${suggestionFocus}

Writing instructions:
- Sound like a thoughtful daily note, not a report
- Mention 1 or 2 concrete cues from the data when possible
- Avoid generic lines like "listen to your body" unless you make them specific
- Avoid repeating every field back to the user
- Use 2 or 3 short sentences, plain text only

${buildDailyStyleExamples()}

Task:
Generate a short daily insight including:
1. What phase the user might be in
2. Whether symptoms/mood match patterns
3. One gentle suggestion`;
}

function buildPartnerPrompt(input: PartnerInsightInput) {
  const suggestionFocus = buildPartnerSuggestionFocus(input);
  const concreteCue =
    humanList(input.symptoms_today) ||
    (input.mood_today !== "Not logged today" ? input.mood_today : "limited same-day signals");

  return `Cycle Phase: ${input.predicted_phase}
Symptoms: ${formatList(input.symptoms_today, "None logged")}
Mood: ${input.mood_today}

Support framing:
- Keep this supportive and low-pressure
- Translate signals into practical support, not analysis
- Anchor on this cue if helpful: ${concreteCue}
- Best support focus: ${suggestionFocus}
- Do not sound formal or robotic
- Do not reveal more detail than needed
- Use 1 or 2 short sentences, plain text only

${buildPartnerStyleExamples()}

Task:
Give simple, supportive advice for the partner on how to behave or help today.`;
}

function buildDailyFallback(input: DailyInsightInput) {
  if (!hasMeaningfulDailyInsightData(input)) {
    return "There isn't enough pattern data yet to make this feel personal. A couple more cycle, symptom, or mood check-ins will help the next insight sound more like you.";
  }

  const { phase, summary } = describeDailyPhase(input);
  const symptomsPhrase = input.symptoms_today.length
    ? `${humanList(input.symptoms_today)} ${input.symptoms_today.length === 1 ? "stands" : "stand"} out today`
    : null;
  const moodPhrase =
    input.mood_today !== "Not logged today" ? `your mood reads as ${toLowerPhrase(input.mood_today)}` : null;
  const concreteSignal = [symptomsPhrase, moodPhrase].filter(Boolean).join(", and ");
  const patternSentence = describePatternAlignment(input)
    .replace("Today's", "That")
    .replace("There is", "There's");
  const suggestion = buildDailySuggestionFocus(input);

  if (phase === "Phase unclear") {
    return clampWords(
      `${summary} ${concreteSignal ? `Right now, ${concreteSignal}. ` : ""}${patternSentence} ${suggestion}`,
      80,
    );
  }

  return clampWords(
    `You may be in the ${phase.toLowerCase()}. ${concreteSignal ? `Right now, ${concreteSignal}. ` : ""}${patternSentence} ${suggestion}`,
    80,
  );
}

function buildPartnerFallback(input: PartnerInsightInput) {
  if (!hasMeaningfulPartnerInsightData(input)) {
    return "There isn't enough shared data to make this very specific today. Keep support simple: check in kindly and let them lead what feels helpful.";
  }

  const concreteCue =
    humanList(input.symptoms_today) ||
    (input.mood_today !== "Not logged today" ? input.mood_today.toLowerCase() : "");
  const suggestion = buildPartnerSuggestionFocus(input);

  if (input.predicted_phase === "Phase unclear") {
    return clampWords(
      `${concreteCue ? `Today's shared cue is ${concreteCue}. ` : ""}The phase is still unclear, so the best move is low-pressure support. ${suggestion}`,
      60,
    );
  }

  return clampWords(
    `They may be in the ${input.predicted_phase.toLowerCase()}. ${concreteCue ? `The clearest cue today is ${concreteCue}. ` : ""}${suggestion}`,
    60,
  );
}

function buildCacheKey(scope: "daily" | "partner", cacheKey?: string) {
  return `${scope}:${cacheKey ?? "default"}`;
}

export async function generateDailyInsight(
  input: DailyInsightInput,
  options?: { cacheKey?: string },
): Promise<InsightResponse> {
  const normalizedInput = dailyInsightSchema.parse(input);
  const cacheKey = buildCacheKey("daily", options?.cacheKey ?? JSON.stringify(normalizedInput));
  const cached = readInsightCache<InsightResponse>(cacheKey);

  if (cached) {
    return cached;
  }

  let insight = buildDailyFallback(normalizedInput);
  let source: InsightResponse["source"] = "fallback";
  let aiError: string | null = null;

  if (hasMeaningfulDailyInsightData(normalizedInput)) {
    try {
      const aiResponse = await callGroqChat(
        [
          { role: "system", content: DAILY_SYSTEM_PROMPT },
          { role: "user", content: buildDailyPrompt(normalizedInput) },
        ],
        { temperature: 0.45 },
      );
      const cleanedResponse = clampWords(normalizeGeneratedText(aiResponse), 80);

      if (cleanedResponse) {
        insight = cleanedResponse;
        source = "ai";
      }
    } catch (error) {
      aiError = explainGroqError(error);
    }
  }

  const result = {
    insight,
    generatedAt: new Date().toISOString(),
    source,
    aiError,
  };

  writeInsightCache(cacheKey, result);
  return result;
}

export async function generatePartnerInsight(
  input: PartnerInsightInput,
  options?: { cacheKey?: string },
): Promise<InsightResponse> {
  const normalizedInput = partnerInsightSchema.parse(input);
  const cacheKey = buildCacheKey("partner", options?.cacheKey ?? JSON.stringify(normalizedInput));
  const cached = readInsightCache<InsightResponse>(cacheKey);

  if (cached) {
    return cached;
  }

  let insight = buildPartnerFallback(normalizedInput);
  let source: InsightResponse["source"] = "fallback";
  let aiError: string | null = null;

  if (hasMeaningfulPartnerInsightData(normalizedInput)) {
    try {
      const aiResponse = await callGroqChat(
        [
          { role: "system", content: PARTNER_SYSTEM_PROMPT },
          { role: "user", content: buildPartnerPrompt(normalizedInput) },
        ],
        { temperature: 0.4 },
      );
      const cleanedResponse = clampWords(normalizeGeneratedText(aiResponse), 60);

      if (cleanedResponse) {
        insight = cleanedResponse;
        source = "ai";
      }
    } catch (error) {
      aiError = explainGroqError(error);
    }
  }

  const result = {
    insight,
    generatedAt: new Date().toISOString(),
    source,
    aiError,
  };

  writeInsightCache(cacheKey, result);
  return result;
}
