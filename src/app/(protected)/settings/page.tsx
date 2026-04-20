import { getServerSession } from "next-auth";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <Badge className="w-fit">Settings & setup</Badge>
          <div>
            <h1 className="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">Guardrails first</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              This first pass focuses on privacy, environment readiness, and giving you a clean place
              to confirm that the integrations are wired correctly.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ProfileSettingsForm
          initialNickname={session?.user?.nickname}
          initialThemePreference={session?.user?.themePreference ?? "light"}
        />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account snapshot</CardTitle>
              <CardDescription>Current signed-in identity and future profile settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] bg-card p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Name</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {session?.user?.name ?? "Not available"}
                </p>
              </div>
              <div className="rounded-[24px] bg-card p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Nickname</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {session?.user?.nickname ?? "Not set"}
                </p>
              </div>
              <div className="rounded-[24px] bg-card p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Email</p>
                <p className="mt-2 break-words text-lg font-semibold text-foreground">
                  {session?.user?.email ?? "Not available"}
                </p>
              </div>
              <div className="rounded-[24px] bg-card p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Theme preference</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {session?.user?.themePreference ?? "light"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DeleteAccountCard />
    </div>
  );
}
