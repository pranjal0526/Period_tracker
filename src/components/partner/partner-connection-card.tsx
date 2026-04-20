"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/lib/server-data";

type PartnerConnectionCardProps = {
  connection: DashboardSnapshot["partnerConnection"];
};

export function PartnerConnectionCard({ connection }: PartnerConnectionCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const runAction = () => {
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });

      if (!response.ok) {
        setStatus("That partner action didn't go through yet.");
        return;
      }

      setStatus("Partner invite refreshed.");
      router.refresh();
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Partner companion mode</CardTitle>
        <CardDescription>
          Consent-first sharing for calendar awareness, symptom context, and gentle support. One user can connect to only one partner at a time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-[24px] bg-card-strong p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Current invite code</p>
          <p className="mt-2 break-all text-xl font-semibold text-foreground sm:text-2xl">
            {connection?.accessCode ?? "No invite generated yet"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {connection?.partnerDisplayName
              ? `${connection.partnerDisplayName} is currently the connected partner.`
              : "Generate a code, send it once, and the first successful connection becomes the only active partner."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button onClick={runAction} disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Working..." : connection ? "Refresh invite code" : "Generate invite code"}
          </Button>
          {connection?.consentGiven ? (
            <Button variant="secondary" disabled className="w-full sm:w-auto">
              Partner connected
            </Button>
          ) : null}
        </div>

        {status ? <p className="text-sm text-muted">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
