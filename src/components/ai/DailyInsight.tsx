"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { relativeToNow } from "@/lib/utils/date-helpers";

type InsightPayload = {
  insight: string;
  generatedAt: string;
  source: "ai" | "fallback";
  aiError: string | null;
};

type DailyInsightProps = {
  cacheKey: string;
  enabled?: boolean;
};

type InsightState =
  | {
      status: "loading";
    }
  | {
      status: "ready";
      data: InsightPayload;
    }
  | {
      status: "error";
      error: string;
    };

const dailyInsightCache = new Map<string, InsightPayload>();
const dailyInsightRequests = new Map<string, Promise<InsightPayload>>();

function buildFriendlyFallbackNote(payload: InsightPayload) {
  if (payload.aiError) {
    return "This note is using a simpler backup version right now, but it's still here to keep things helpful.";
  }

  if (payload.source === "fallback") {
    return "This note is based on the check-ins available so far and will feel more personal as you log more.";
  }

  return null;
}

function InsightSkeleton() {
  return (
    <div className="rounded-[24px] bg-card-strong p-4 sm:p-5">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 rounded-full bg-line/70" />
        <div className="h-4 w-full rounded-full bg-line/70" />
        <div className="h-4 w-[92%] rounded-full bg-line/70" />
        <div className="h-4 w-[68%] rounded-full bg-line/70" />
      </div>
    </div>
  );
}

async function loadDailyInsight(cacheKey: string) {
  const cached = dailyInsightCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const inFlight = dailyInsightRequests.get(cacheKey);

  if (inFlight) {
    return inFlight;
  }

  const request = fetch("/api/ai/insight", { cache: "no-store" })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as
        | InsightPayload
        | {
            error?: string;
          }
        | null;

      if (!response.ok || !payload || !("insight" in payload)) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : "Daily insight is unavailable right now.",
        );
      }

      dailyInsightCache.set(cacheKey, payload);
      return payload;
    })
    .finally(() => {
      dailyInsightRequests.delete(cacheKey);
    });

  dailyInsightRequests.set(cacheKey, request);
  return request;
}

export function DailyInsight({ cacheKey, enabled = true }: DailyInsightProps) {
  const [state, setState] = useState<InsightState>(() => {
    const cached = dailyInsightCache.get(cacheKey);
    return cached ? { status: "ready", data: cached } : { status: "loading" };
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (dailyInsightCache.has(cacheKey)) {
      return;
    }

    let cancelled = false;

    loadDailyInsight(cacheKey)
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Daily insight is unavailable right now.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Today&apos;s note</Badge>
          <p className="text-sm text-muted">
            A short, supportive note shaped by your recent check-ins.
          </p>
        </div>

        {state.status === "loading" ? (
          <InsightSkeleton />
        ) : state.status === "error" ? (
          <div className="rounded-[24px] border border-warning/25 bg-warning/8 px-4 py-4 text-sm leading-7 text-warning">
            {state.error}
          </div>
        ) : (
          <>
            <div className="rounded-[24px] bg-card-strong p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">For today</p>
              <p className="mt-3 text-sm leading-7 text-foreground sm:text-[15px]">
                {state.data.insight}
              </p>
            </div>

            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              Updated {relativeToNow(state.data.generatedAt)}
            </p>

            {buildFriendlyFallbackNote(state.data) ? (
              <div className="rounded-xl border border-line/70 bg-card px-4 py-3 text-sm leading-6 text-muted">
                {buildFriendlyFallbackNote(state.data)}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
