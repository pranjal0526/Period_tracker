import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { buildSignalPromptContext, deriveIntensitySignals } from "@/lib/ai/signal-analysis";
import { authOptions } from "@/lib/auth";
import { getAssistantReply } from "@/lib/ai/chatbot";
import { explainGroqError } from "@/lib/ai/groq";
import { getDashboardSnapshot } from "@/lib/server-data";

const chatSchema = z.object({
  message: z.string().min(2),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = chatSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid chat payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  const snapshot = await getDashboardSnapshot(session.user.id);
  const intensitySignals = deriveIntensitySignals(snapshot.symptoms, snapshot.moods);
  const context = `
Average cycle length: ${snapshot.metrics.averageCycleLength ?? "unknown"}
Current cycle day: ${snapshot.metrics.currentCycleDay ?? "unknown"}
Current phase: ${snapshot.metrics.currentPhase}
Next expected period: ${snapshot.metrics.nextPeriodDate ?? "unknown"}
Estimated ovulation date: ${snapshot.metrics.estimatedOvulationDate ?? "unknown"}
Estimated fertile window: ${snapshot.metrics.fertileWindow ?? "unknown"}
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
${buildSignalPromptContext(intensitySignals)}
Recent anomalies: ${snapshot.anomalies.map((item) => item.message).join(" | ") || "none"}
`;

  try {
    const reply = await getAssistantReply(payload.data.message, context);
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      {
        error: explainGroqError(error),
      },
      { status: 502 },
    );
  }
}
