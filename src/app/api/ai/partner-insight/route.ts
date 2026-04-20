import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generatePartnerInsight,
  partnerInsightSchema,
} from "@/lib/ai/insight-service";
import { buildPartnerInsightInput, type PartnerInsightInput } from "@/lib/ai/ruleEngine";
import { getPartnerViewerSnapshot } from "@/lib/server-data";

function buildPartnerScopedCacheKey(userId: string, input: PartnerInsightInput) {
  return `${userId}:${JSON.stringify(input)}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewerSnapshot = await getPartnerViewerSnapshot(session.user.id);

  if (!viewerSnapshot) {
    return NextResponse.json(
      { error: "Partner insight is only available in companion mode." },
      { status: 403 },
    );
  }

  const input = buildPartnerInsightInput(viewerSnapshot.snapshot);
  const result = await generatePartnerInsight(input, {
    cacheKey: buildPartnerScopedCacheKey(session.user.id, input),
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = partnerInsightSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid partner insight payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  const result = await generatePartnerInsight(payload.data, {
    cacheKey: buildPartnerScopedCacheKey(session.user.id, payload.data),
  });

  return NextResponse.json(result);
}
