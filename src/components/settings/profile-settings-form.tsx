"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileSettingsFormProps = {
  initialNickname?: string | null;
  initialThemePreference?: "light" | "dark";
};

export function ProfileSettingsForm({
  initialNickname,
  initialThemePreference = "light",
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [themePreference, setThemePreference] = useState(initialThemePreference);
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile preferences</CardTitle>
        <CardDescription>
          Set the nickname that appears across the app and choose your preferred theme.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nickname">Nickname</Label>
          <Input
            id="nickname"
            maxLength={24}
            placeholder="How Ember should greet you"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
          <p className="text-xs text-muted">
            This name appears on your dashboard and anywhere your connected partner sees your analytics.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Theme preference</Label>
          <select
            id="theme"
            className="flex h-11 w-full rounded-2xl border border-line bg-card-strong px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
            value={themePreference}
            onChange={(event) =>
              setThemePreference(event.target.value as "light" | "dark")
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <p className="text-xs text-muted">
            Theme preference is personal, so both the user and the partner can customize their own view.
          </p>
        </div>

        <Button
          disabled={isPending}
          className="w-full sm:w-auto"
          onClick={() =>
            startTransition(async () => {
              setStatus("");

              const response = await fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  nickname,
                  themePreference,
                }),
              });

              if (!response.ok) {
                setStatus("We couldn't save your settings yet.");
                return;
              }

              setStatus("Settings saved.");
              router.refresh();
            })
          }
        >
          {isPending ? "Saving..." : "Save preferences"}
        </Button>

        {status ? <p className="text-sm text-muted">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
