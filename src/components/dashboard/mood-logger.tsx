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

type MoodLoggerProps = {
  moods: DashboardSnapshot["moods"];
  readOnly?: boolean;
  ownerLabel?: string;
};

const moodOptions = [
  "Calm",
  "Energetic",
  "Tender",
  "Stretched thin",
  "Focused",
  "Irritable",
];

export function MoodLogger({
  moods,
  readOnly = false,
  ownerLabel,
}: MoodLoggerProps) {
  const router = useRouter();
  const [mood, setMood] = useState("Calm");
  const [intensity, setIntensity] = useState("5");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const deleteEntry = (id: string) => {
    setStatus("");

    startTransition(async () => {
      const response = await fetch(`/api/moods?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setStatus("We couldn't delete that mood log yet.");
        return;
      }

      setStatus("Mood entry deleted.");
      router.refresh();
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/moods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          intensity: Number(intensity),
          notes,
        }),
      });

      if (!response.ok) {
        setStatus("We couldn't save that mood entry yet.");
        return;
      }

      setMood("Calm");
      setIntensity("5");
      setNotes("");
      setStatus("Mood entry saved.");
      router.refresh();
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{readOnly ? "Mood overview" : "Mood logger"}</CardTitle>
        <CardDescription>
          {readOnly
            ? `${ownerLabel ?? "Your partner"} shared mood logs, intensity, and notes here.`
            : "Track how your cycle affects energy, patience, social bandwidth, and confidence."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!readOnly ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="mood">Mood</Label>
              <select
                id="mood"
                className="flex h-11 w-full rounded-2xl border border-line bg-card-strong px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
                value={mood}
                onChange={(event) => setMood(event.target.value)}
              >
                {moodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mood-intensity">Intensity (1-10)</Label>
              <Input
                id="mood-intensity"
                type="number"
                min={1}
                max={10}
                value={intensity}
                onChange={(event) => setIntensity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mood-notes">Notes (shared with connected partner)</Label>
              <Textarea
                id="mood-notes"
                placeholder="What helped, what triggered this, what you want future-you to remember."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending ? "Saving..." : "Save mood check-in"}
            </Button>
            {status ? <p className="text-sm text-muted">{status}</p> : null}
          </form>
        ) : null}

        <div className="rounded-[24px] border border-line/70 bg-card p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Recent moods</p>
          <div className="mt-3 space-y-3">
            {moods.length ? (
              moods.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-2xl bg-card-strong p-3 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-foreground">
                      {entry.mood}
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
                No mood entries yet. This becomes useful surprisingly fast once you log a week or two.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
