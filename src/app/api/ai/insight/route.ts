import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  dailyInsightSchema,
  generateDailyInsight,
} from "@/lib/ai/insight-service";
import { buildDailyInsightInput, type DailyInsightInput } from "@/lib/ai/ruleEngine";
import { getDashboardSnapshot } from "@/lib/server-data";

function buildUserScopedCacheKey(userId: string, input: DailyInsightInput) {
  return `${userId}:${JSON.stringify(input)}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getDashboardSnapshot(session.user.id);
  const input = buildDailyInsightInput(snapshot);
  const result = await generateDailyInsight(input, {
    cacheKey: buildUserScopedCacheKey(session.user.id, input),
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = dailyInsightSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid insight payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  const result = await generateDailyInsight(payload.data, {
    cacheKey: buildUserScopedCacheKey(session.user.id, payload.data),
  });

  return NextResponse.json(result);
}
