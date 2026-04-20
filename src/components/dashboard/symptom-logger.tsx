"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DashboardSnapshot } from "@/lib/server-data";
import { relativeToNow } from "@/lib/utils/date-helpers";

type SymptomLoggerProps = {
  symptoms: DashboardSnapshot["symptoms"];
  readOnly?: boolean;
  ownerLabel?: string;
};

export function SymptomLogger({
  symptoms,
  readOnly = false,
  ownerLabel,
}: SymptomLoggerProps) {
  const router = useRouter();
  const [symptomText, setSymptomText] = useState("");
  const [intensity, setIntensity] = useState("5");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const deleteEntry = (id: string) => {
    setStatus("");

    startTransition(async () => {
      const response = await fetch(`/api/symptoms?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setStatus("We couldn't delete that symptom log yet.");
        return;
      }

      setStatus("Symptom entry deleted.");
      router.refresh();
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: symptomText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          intensity: Number(intensity),
          notes,
        }),
      });

      if (!response.ok) {
        setStatus("We couldn't save that symptom entry yet.");
        return;
      }

      setSymptomText("");
      setIntensity("5");
      setNotes("");
      setStatus("Symptom entry saved.");
      router.refresh();
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{readOnly ? "Symptoms overview" : "Symptom logger"}</CardTitle>
        <CardDescription>
          {readOnly
            ? `${ownerLabel ?? "Your partner"} shared symptom logs, intensity, and notes here.`
            : "Capture cramps, cravings, bloating, headaches, or anything else you want the AI to notice."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!readOnly ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms</Label>
              <Input
                id="symptoms"
                placeholder="cramps, bloating, fatigue"
                value={symptomText}
                onChange={(event) => setSymptomText(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symptom-intensity">Intensity (1-10)</Label>
              <Input
                id="symptom-intensity"
                type="number"
                min={1}
                max={10}
                value={intensity}
                onChange={(event) => setIntensity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symptom-notes">Notes (shared with connected partner)</Label>
              <Textarea
                id="symptom-notes"
                placeholder="Anything that might explain the spike today..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Saving..." : "Save symptom check-in"}
            </Button>
            {status ? <p className="text-sm text-muted">{status}</p> : null}
          </form>
        ) : null}

        <div className="rounded-[24px] border border-line/70 bg-card p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Recent check-ins</p>
          <div className="mt-3 space-y-3">
            {symptoms.length ? (
              symptoms.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-2xl bg-card-strong p-3 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-foreground">
                      {entry.symptoms.join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Intensity {entry.intensity}/10 • {relativeToNow(entry.date)}
                    </p>
                    {entry.notes ? (
                      <p className="mt-1 break-words text-xs leading-5 text-muted">
                        {readOnly ? "Shared note" : "Note"}: {entry.notes}
                      </p>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 self-end md:self-auto"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                No symptom entries yet. Start with a simple comma-separated note.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
