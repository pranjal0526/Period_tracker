"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PartnerJoinCard() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter partner invite code</CardTitle>
        <CardDescription>
          Once connected, you&apos;ll get a read-only analytics view of the linked user.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Paste the invite code you received"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
        />
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={isPending || !inviteCode.trim()}
          onClick={() =>
            startTransition(async () => {
              setStatus("");

              const response = await fetch("/api/partner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "connect",
                  accessCode: inviteCode.trim(),
                }),
              });

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as {
                  error?: string;
                } | null;
                setStatus(payload?.error ?? "We couldn't connect that invite code.");
                return;
              }

              setStatus("Partner connection confirmed.");
              setInviteCode("");
              router.refresh();
            })
          }
        >
          {isPending ? "Connecting..." : "Connect to user"}
        </Button>
        {status ? <p className="text-sm text-muted">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
