import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { CycleLogger } from "@/components/dashboard/cycle-logger";
import { CycleMonthCalendar } from "@/components/dashboard/cycle-month-calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getDashboardSnapshot, getPartnerViewerConnection } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
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
          <Badge className="w-fit">Calendar overview</Badge>
          <div>
            <h1 className="font-display text-3xl text-foreground sm:text-4xl lg:text-5xl">Your timing map</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              This page keeps the rhythm view focused: start dates, expected next period, and the
              estimated fertile and ovulation windows that adapt as your data improves.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <CycleLogger cycles={snapshot.cycles} />
        <CycleMonthCalendar cycles={snapshot.cycles} />
      </div>

      <CalendarView cycles={snapshot.cycles} metrics={snapshot.metrics} />

      <Card>
        <CardHeader>
          <CardTitle>How predictions improve</CardTitle>
          <CardDescription>
            Ember starts with standard cycle assumptions and personalizes timing as your own data grows.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[24px] bg-card p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Best next move</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              Log your next start date as soon as bleeding begins.
            </p>
          </div>
          <div className="rounded-[24px] bg-card p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Why it matters</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              That single data point helps cycle-length forecasting more than any other entry.
            </p>
          </div>
          <div className="rounded-[24px] bg-card p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Partner mode</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              Share calendar access only if it feels helpful and the permissions still fit.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
