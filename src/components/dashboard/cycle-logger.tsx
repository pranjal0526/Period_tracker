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
import { formatShortDate, getLocalDateInputValue } from "@/lib/utils/date-helpers";

type CycleLoggerProps = {
  cycles: DashboardSnapshot["cycles"];
};

export function CycleLogger({ cycles }: CycleLoggerProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [draftEndDates, setDraftEndDates] = useState<Record<string, string>>({});
  const [flowIntensity, setFlowIntensity] = useState("Medium");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const todayISO = getLocalDateInputValue();
  const recentCycles = cycles.slice(0, 5);
  const latestCycleId = cycles[0]?.id;

  const deleteCycle = (id: string) => {
    setStatus("");

    startTransition(async () => {
      const response = await fetch(`/api/cycles?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setStatus(payload?.error ?? "We couldn't delete that cycle entry yet.");
        return;
      }

      setStatus("Cycle entry deleted.");
      router.refresh();
    });
  };

  const saveEndDate = (cycleId: string, cycleStartDate: string) => {
    const nextEndDate = draftEndDates[cycleId];

    setStatus("");

    if (!nextEndDate) {
      setStatus("Choose the end date first.");
      return;
    }

    if (nextEndDate > todayISO) {
      setStatus("End date cannot be in the future.");
      return;
    }

    if (nextEndDate < cycleStartDate.slice(0, 10)) {
      setStatus("End date cannot be earlier than start date.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/cycles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cycleId,
          endDate: nextEndDate,
          clientToday: todayISO,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setStatus(payload?.error ?? "We couldn't update that end date yet.");
        return;
      }

      setDraftEndDates((current) => {
        const next = { ...current };
        delete next[cycleId];
        return next;
      });
      setStatus("End date updated.");
      router.refresh();
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    if (startDate > todayISO) {
      setStatus("Start date cannot be in the future.");
      return;
    }

    if (endDate && endDate > todayISO) {
      setStatus("End date cannot be in the future.");
      return;
    }

    if (endDate && endDate < startDate) {
      setStatus("End date cannot be earlier than start date.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate: endDate || null,
          flowIntensity,
          notes,
          clientToday: todayISO,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setStatus(payload?.error ?? "We couldn't save that cycle entry yet.");
        return;
      }

      setStartDate("");
      setEndDate("");
      setFlowIntensity("Medium");
      setNotes("");
      setStatus(
        endDate
          ? "Period range saved."
          : "Period start saved. Add the end date later when bleeding stops.",
      );
      router.refresh();
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Period dates</CardTitle>
        <CardDescription>
          Log the day bleeding starts now. End date is optional and can be added later in one small update.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={todayISO}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End date (optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={startDate || undefined}
                max={todayISO}
              />
              <p className="text-xs text-muted">
                Leave this blank if your period is still going on.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flow-intensity">Flow intensity</Label>
            <select
              id="flow-intensity"
              className="flex h-11 w-full rounded-2xl border border-line bg-card-strong px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
              value={flowIntensity}
              onChange={(event) => setFlowIntensity(event.target.value)}
            >
              <option>Light</option>
              <option>Medium</option>
              <option>Heavy</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cycle-notes">Notes</Label>
            <Textarea
              id="cycle-notes"
              placeholder="Leave blank if you only want the dates."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Saving..." : endDate ? "Save period range" : "Save period start"}
          </Button>
          <p className="text-xs text-muted">
            If your period started today, save just the start date now and update the end date later from the recent list below.
          </p>
          {status ? <p className="text-sm text-muted">{status}</p> : null}
        </form>

        <div className="rounded-[24px] border border-line/70 bg-card p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Recent period ranges</p>
          <div className="mt-3 space-y-3">
            {recentCycles.length ? (
              recentCycles.map((cycle) => {
                const needsEndDate = !cycle.endDate;
                const draftEndDate = draftEndDates[cycle.id] ?? "";
                const isLatestOngoing = needsEndDate && cycle.id === latestCycleId;
                const cycleLengthLabel =
                  cycle.cycleLength != null
                    ? `Cycle ${cycle.cycleLength} days`
                    : "Cycle length pending";

                return (
                  <div
                    key={cycle.id}
                    className="rounded-2xl bg-card-strong p-3"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatShortDate(cycle.startDate)}
                          {cycle.endDate
                            ? ` - ${formatShortDate(cycle.endDate)}`
                            : isLatestOngoing
                              ? " - ongoing"
                              : " - end date missing"}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {cycleLengthLabel} •{" "}
                          {cycle.periodLength
                            ? `Period ${cycle.periodLength} days`
                            : isLatestOngoing
                              ? "Period in progress"
                              : "End date missing"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 self-end md:self-auto"
                        onClick={() => deleteCycle(cycle.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {needsEndDate ? (
                      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Label htmlFor={`cycle-end-${cycle.id}`}>Add end date</Label>
                          <Input
                            id={`cycle-end-${cycle.id}`}
                            type="date"
                            value={draftEndDate}
                            min={cycle.startDate.slice(0, 10)}
                            max={todayISO}
                            onChange={(event) =>
                              setDraftEndDates((current) => ({
                                ...current,
                                [cycle.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full sm:w-auto"
                          disabled={isPending || !draftEndDate}
                          onClick={() => saveEndDate(cycle.id, cycle.startDate)}
                        >
                          {isPending ? "Saving..." : "Mark ended"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted">
                Your first saved period range will start filling the calendar automatically.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
