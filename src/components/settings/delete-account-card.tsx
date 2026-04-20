"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRMATION_TEXT = "DELETE MY ACCOUNT";

export function DeleteAccountCard() {
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="border-warning/25">
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          This permanently deletes your profile, cycle history, symptoms, moods, AI insights,
          partner links, and related messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-[24px] border border-warning/20 bg-warning/8 p-4 text-sm text-warning">
          This action cannot be undone. It works from both user mode and partner mode.
        </div>

        <div className="space-y-2">
          <Label htmlFor="delete-confirmation">
            Type <span className="font-semibold text-foreground">{CONFIRMATION_TEXT}</span> to confirm
          </Label>
          <Input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={CONFIRMATION_TEXT}
            autoComplete="off"
          />
        </div>

        <Button
          variant="outline"
          disabled={isPending || confirmation.trim() !== CONFIRMATION_TEXT}
          className="w-full border-warning/35 text-warning hover:bg-warning/10 hover:text-warning sm:w-auto"
          onClick={() =>
            startTransition(async () => {
              setStatus("");

              const response = await fetch("/api/settings", {
                method: "DELETE",
              });

              if (!response.ok) {
                const payload = await response.json().catch(() => null);
                setStatus(payload?.error ?? "We couldn't delete your account yet.");
                return;
              }

              setStatus("Account deleted. Signing you out...");
              await signOut({ callbackUrl: "/" });
            })
          }
        >
          {isPending ? "Deleting..." : "Delete profile and all data"}
        </Button>

        {status ? <p className="text-sm text-muted">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
