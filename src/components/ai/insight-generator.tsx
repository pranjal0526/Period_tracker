"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate } from "@/lib/utils/date-helpers";

type InsightGeneratorProps = {
  anomalyCount: number;
  initialInsight?: {
    summary: string;
    recommendations: string[];
    generatedAt: string;
  } | null;
};

type InsightPayload = {
  summary: string;
  recommendations: string[];
  aiError?: string | null;
  generatedAt?: string;
};

function normalizeText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildReadableBlocks(summary: string) {
  const normalized = normalizeText(summary).replace(/\s+(\d+\.)\s+/g, "\n$1 ");

  return normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function InsightGenerator({
  anomalyCount,
  initialInsight = null,
}: InsightGeneratorProps) {
  const [insight, setInsight] = useState<InsightPayload | null>(initialInsight);
  const [isPending, startTransition] = useTransition();
  const fallbackSummary = `You currently have ${anomalyCount} active pattern flag${anomalyCount === 1 ? "" : "s"}. When you're ready, Ember can turn that into a gentler, easier-to-read summary.`;
  const summaryBlocks = buildReadableBlocks(insight?.summary ?? fallbackSummary);
  const actionItems = (insight?.recommendations ?? []).map(normalizeText).filter(Boolean);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>AI insight snapshot</CardTitle>
        <CardDescription>
          Generate a concise overview from cycle timing, estimated fertile or ovulation windows,
          mood, and symptom history in a tone that stays calm and supportive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-5">
        <div className="rounded-[24px] bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Summary</p>
          <div className="mt-3 space-y-3 text-sm leading-7 text-foreground sm:text-[15px]">
            {summaryBlocks.map((block) => {
              const numberedMatch = block.match(/^(\d+)\.\s*(.*)$/);

              if (!numberedMatch) {
                return (
                  <p key={block} className="break-words text-muted">
                    {block}
                  </p>
                );
              }

              return (
                <div key={block} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-card-strong text-[11px] font-semibold text-foreground">
                    {numberedMatch[1]}
                  </span>
                  <p className="break-words text-muted">{numberedMatch[2]}</p>
                </div>
              );
            })}
          </div>
        </div>

        {insight?.generatedAt ? (
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Last generated: {formatLongDate(insight.generatedAt)}
          </p>
        ) : null}

        {actionItems.length ? (
          <div className="rounded-[24px] bg-card-strong p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Action steps</p>
            <div className="mt-3 space-y-2.5">
              {actionItems.map((item, index) => (
                <div key={`${index}-${item}`} className="flex items-start gap-2.5">
                  <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-card text-[11px] font-semibold text-foreground">
                    {index + 1}
                  </span>
                  <p className="break-words text-sm leading-6 text-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {insight?.aiError ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning break-words">
            {normalizeText(insight.aiError)}
          </div>
        ) : null}

        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const response = await fetch("/api/ai/analyze", { method: "POST" });
              const data = (await response.json().catch(() => null)) as
                | InsightPayload
                | {
                    error?: string;
                  }
                | null;

              if (!response.ok) {
                setInsight({
                  summary:
                    "Ember couldn't reach live analysis right now, but your tracking is still meaningful and your dashboard is still ready for you.",
                  recommendations: [
                    "Keep logging cycles, symptoms, and moods so Ember can build a steadier baseline.",
                  ],
                  aiError: data && "error" in data ? data.error : "AI request failed.",
                });
                return;
              }

              setInsight(data as InsightPayload);
            })
          }
        >
          {isPending ? "Generating..." : insight ? "Refresh AI snapshot" : "Generate AI snapshot"}
        </Button>
      </CardContent>
    </Card>
  );
}
