import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  buildSignalAwareRecommendations,
  buildSignalPromptContext,
  deriveIntensitySignals,
} from "@/lib/ai/signal-analysis";
import { authOptions } from "@/lib/auth";
import { callGroqAPI, explainGroqError } from "@/lib/ai/groq";
import { getDashboardSnapshot } from "@/lib/server-data";
import connectDB from "@/lib/mongodb/mongoose";
import AIInsight from "@/models/AIInsight";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getDashboardSnapshot(session.user.id);
  const intensitySignals = deriveIntensitySignals(snapshot.symptoms, snapshot.moods);
  const signalContext = buildSignalPromptContext(intensitySignals);
  const prompt = `
Provide a concise cycle summary for a period tracker UI.
Output plain text only.
Keep it under 120 words.
Use 2 short paragraphs max.
Do not include numbered or bulleted recommendation lists (those are shown separately in UI).
Use medically careful language: ovulation and fertile-window dates are estimates, not certainties.
Prioritize signal interpretation from symptom intensity, mood intensity, and note context.
Use a calm, comforting tone that feels supportive rather than clinical.
When appropriate, include one short reassuring line.

Average cycle length: ${snapshot.metrics.averageCycleLength ?? "unknown"}
Current cycle day: ${snapshot.metrics.currentCycleDay ?? "unknown"}
Current phase: ${snapshot.metrics.currentPhase}
Next period date: ${snapshot.metrics.nextPeriodDate ?? "unknown"}
Estimated ovulation date: ${snapshot.metrics.estimatedOvulationDate ?? "unknown"}
Estimated fertile window: ${snapshot.metrics.fertileWindow ?? "unknown"}
Recent anomalies: ${snapshot.anomalies.map((item) => `${item.type} (${item.severity})`).join(", ") || "none"}
Recent symptoms with intensity: ${
    snapshot.symptoms
      .map((item) => `${item.symptoms.join("/") || "none"} (${item.intensity}/10)`)
      .join(", ") || "none"
  }
Recent moods with intensity: ${
    snapshot.moods.map((item) => `${item.mood} (${item.intensity}/10)`).join(", ") || "none"
  }
Recent notes: ${
    [...snapshot.symptoms, ...snapshot.moods]
      .map((item) => item.notes?.trim())
      .filter((value): value is string => Boolean(value))
      .slice(0, 4)
      .join(" | ") || "none"
  }
Derived intensity signals:
${signalContext}
`;

  let summary =
    snapshot.cycles.length || snapshot.symptoms.length || snapshot.moods.length
      ? "Ember is tracking your cycle timing along with symptom and mood intensity trends. Keep going one day at a time, and the picture will get clearer with each check-in."
      : "Your AI snapshot needs a little more data first. Add a cycle entry, symptom log, or mood check-in, and Ember will turn it into a calmer, more helpful read.";
  let aiError: string | null = null;

  try {
    const aiSummary = await callGroqAPI(prompt);

    if (aiSummary) {
      summary = aiSummary;
    }
  } catch (error) {
    aiError = explainGroqError(error);
    summary =
      "Live AI analysis is unavailable right now, but your tracking is still safe and useful. A softer fallback summary is shown until the AI connection is back.";
  }

  const recommendations =
    snapshot.cycles.length || snapshot.symptoms.length || snapshot.moods.length
      ? buildSignalAwareRecommendations(intensitySignals)
      : [
          "Start by logging your latest period start date.",
          "Add one symptom check-in so the assistant has some context.",
          "Use mood notes for days that feel very different from your baseline.",
        ];
  const serializedAnomalies = snapshot.anomalies.map((item) => ({
    type: item.type,
    severity: item.severity,
    message: item.message,
    recommendation: item.recommendation,
  }));

  const generatedAt = new Date();
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
      await AIInsight.create({
        userId: session.user.id,
        summary,
        recommendations,
        anomalies: serializedAnomalies,
        generatedAt,
      });
    } catch (error) {
      const persistError =
        error instanceof Error ? error.message : "We couldn't save this AI snapshot.";
      aiError = aiError ? `${aiError} ${persistError}` : persistError;
    }
  }

  return NextResponse.json({
    summary,
    anomalies: serializedAnomalies,
    recommendations,
    aiError,
    generatedAt: generatedAt.toISOString(),
  });
}
