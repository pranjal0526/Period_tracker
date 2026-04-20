import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { buildNotifications } from "@/lib/notifications";
import { getDashboardSnapshot, getPartnerViewerConnection } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const modeIntent = cookieStore.get("ember-mode")?.value;
  const viewerConnection = await getPartnerViewerConnection(session?.user?.id);
  const displayName = session?.user?.nickname ?? session?.user?.name;

  if (viewerConnection || modeIntent === "partner") {
    redirect("/partner?mode=viewer");
  }

  const snapshot = await getDashboardSnapshot(session?.user?.id);
  const notifications = buildNotifications(snapshot, { audience: "user" });

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="glass-panel relative z-30 flex flex-col gap-4 overflow-visible rounded-[28px] border border-line/70 p-4 sm:rounded-[30px] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Badge className="w-fit">Protected space</Badge>
          <div className="mt-3 space-y-2">
            <h1 className="text-[1.4rem] font-semibold tracking-tight text-foreground sm:text-[1.6rem]">
              Your private cycle space
            </h1>
            <p className="max-w-[34ch] text-sm leading-6 text-muted">
              A calm place for quick check-ins, trend tracking, and support that stays easy to use.
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-3 lg:w-auto lg:flex-nowrap lg:justify-end">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[24px] border border-line/60 bg-card-strong px-3.5 py-3 sm:flex-initial sm:rounded-full sm:px-4">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={displayName ?? "User avatar"}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {session?.user?.name?.slice(0, 1) ?? "E"}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-foreground">
                {displayName ?? "Ember user"}
              </p>
              <p className="truncate text-xs text-muted">{session?.user?.email}</p>
            </div>
          </div>
          <NotificationBell notifications={notifications} />
        </div>
      </header>

      <DashboardHome
        snapshot={snapshot}
        userName={snapshot.profile?.displayName ?? session?.user?.nickname ?? session?.user?.name}
      />
    </div>
  );
}
