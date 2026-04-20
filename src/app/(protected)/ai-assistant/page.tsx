import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AnomalyAlert } from "@/components/ai/anomaly-alert";
import { Chatbot } from "@/components/ai/chatbot";
import { InsightGenerator } from "@/components/ai/insight-generator";
import { PhaseSupportCard } from "@/components/ai/phase-support-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getDashboardSnapshot, getPartnerViewerConnection } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function AIAssistantPage() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const modeIntent = cookieStore.get("ember-mode")?.value;
  const viewerConnection = await getPartnerViewerConnection(session?.user?.id);

  if (viewerConnection || modeIntent === "partner") {
    redirect("/partner?mode=viewer");
  }

  const snapshot = await getDashboardSnapshot(session?.user?.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <Badge className="w-fit">AI assistant</Badge>
          <div>
            <h1 className="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">
              A gentler second set of eyes
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Ember summarizes your tracking data, spots rhythm shifts, and helps you ask better
              questions without pretending to replace medical care. Fertile and ovulation timing
              are treated as estimates, not certainties.
            </p>
          </div>
        </CardContent>
      </Card>

      <PhaseSupportCard snapshot={snapshot} />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <InsightGenerator
          anomalyCount={snapshot.anomalies.length}
          initialInsight={snapshot.latestInsight}
        />
        <Chatbot />
      </div>

      <AnomalyAlert anomalies={snapshot.anomalies} />
    </div>
  );
}
