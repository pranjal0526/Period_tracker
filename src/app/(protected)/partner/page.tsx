import { getServerSession } from "next-auth";
import { AnomalyAlert } from "@/components/ai/anomaly-alert";
import { PartnerInsight } from "@/components/ai/PartnerInsight";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { CycleChart } from "@/components/dashboard/cycle-chart";
import { MoodLogger } from "@/components/dashboard/mood-logger";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SymptomLogger } from "@/components/dashboard/symptom-logger";
import { PartnerConnectionCard } from "@/components/partner/partner-connection-card";
import { PartnerJoinCard } from "@/components/partner/partner-join-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { buildCareNote, buildNotifications } from "@/lib/notifications";
import { getDashboardSnapshot, getPartnerViewerSnapshot } from "@/lib/server-data";

export const dynamic = "force-dynamic";

type PartnerPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function PartnerPage({ searchParams }: PartnerPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const viewerSnapshot = await getPartnerViewerSnapshot(session?.user?.id);

  if (viewerSnapshot) {
    const ownerName = viewerSnapshot.snapshot.profile?.displayName ?? "Connected user";
    const partnerInsightCacheKey = [
      viewerSnapshot.snapshot.metrics.currentCycleDay ?? "none",
      viewerSnapshot.snapshot.metrics.currentPhase,
      viewerSnapshot.snapshot.cycles[0]?.startDate ?? "none",
      viewerSnapshot.snapshot.symptoms[0]?.date ?? "none",
      viewerSnapshot.snapshot.moods[0]?.date ?? "none",
    ].join(":");
    const notifications = buildNotifications(viewerSnapshot.snapshot, {
      audience: "partner",
      ownerName,
    });
    const careNote = buildCareNote(viewerSnapshot.snapshot, {
      audience: "partner",
      ownerName,
    });

    return (
      <div className="space-y-6">
        <Card className="relative z-30 overflow-visible">
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge className="w-fit">Partner analytics</Badge>
                <div>
                  <h1 className="mt-4 font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
                    {ownerName}&apos;s shared analytics
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                    This view is read-only. It surfaces cycle rhythm, calendar timing, symptoms,
                    moods, and AI flags that the connected user has chosen to share through their
                    invite code.
                  </p>
                </div>
              </div>
              <NotificationBell notifications={notifications} />
            </div>

            <div className="rounded-2xl border border-secondary/14 bg-secondary/8 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-secondary">{careNote.title}</p>
              <p className="mt-2 text-sm leading-7 text-foreground">{careNote.message}</p>
            </div>
          </CardContent>
        </Card>

        <PartnerInsight
          key={partnerInsightCacheKey}
          cacheKey={partnerInsightCacheKey}
          enabled
          ownerName={ownerName}
        />

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <CycleChart cycles={viewerSnapshot.snapshot.cycles} />
          <AnomalyAlert anomalies={viewerSnapshot.snapshot.anomalies} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <CalendarView
            cycles={viewerSnapshot.snapshot.cycles}
            metrics={viewerSnapshot.snapshot.metrics}
          />
          <div className="grid gap-6">
            <SymptomLogger
              symptoms={viewerSnapshot.snapshot.symptoms}
              readOnly
              ownerLabel={ownerName}
            />
            <MoodLogger
              moods={viewerSnapshot.snapshot.moods}
              readOnly
              ownerLabel={ownerName}
            />
          </div>
        </div>
      </div>
    );
  }

  if (params.mode === "viewer") {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
          <Badge className="w-fit">Partner companion</Badge>
          <div>
            <h1 className="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
              Connect with a user invite
            </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                Partner mode is read-only. Once a user shares their invite code with you, their
                analytics will appear here automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <PartnerJoinCard />
          <Card>
            <CardHeader>
              <CardTitle>What you&apos;ll be able to see</CardTitle>
              <CardDescription>
                Partner mode is intentionally scoped so support stays useful without overreaching.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[24px] bg-card p-4 text-sm text-foreground">
                Current cycle day, average cycle length, and current phase
              </div>
              <div className="rounded-[24px] bg-card p-4 text-sm text-foreground">
                Calendar timing, expected next period, estimated fertile window, and ovulation day
              </div>
              <div className="rounded-[24px] bg-card p-4 text-sm text-foreground">
                Shared symptom and mood logs, including intensity and shared notes
              </div>
              <div className="rounded-[24px] bg-card p-4 text-sm text-foreground">
                Gentle alerts for upcoming period timing and pattern-watch changes
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const snapshot = await getDashboardSnapshot(session?.user?.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <Badge className="w-fit">Partner companion</Badge>
          <div>
            <h1 className="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">Support without overstepping</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Create or join a companion link only when it feels useful. The model here is explicit
              consent, scoped visibility, and easy resets.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <PartnerConnectionCard connection={snapshot.partnerConnection} />

        <Card>
          <CardHeader>
            <CardTitle>What gets shared</CardTitle>
            <CardDescription>
              Shared access is consent-based and includes cycle context, check-ins, and notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[24px] bg-card p-4 text-sm text-foreground">
              Calendar timing, expected next period, estimated fertile window, and ovulation day
            </div>
            <div className="rounded-[24px] bg-card p-4 text-sm text-foreground">
              Symptom and mood logs with intensity and shared notes
            </div>
            <div className="rounded-[24px] bg-card p-4 text-sm text-foreground">
              Shared alerts for reminders and pattern-watch updates
            </div>
            <div className="rounded-[24px] bg-card p-4 text-sm text-foreground">
              A clean path to rotate invite codes whenever boundaries change
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
