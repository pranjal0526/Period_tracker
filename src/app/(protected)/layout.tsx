import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { authOptions } from "@/lib/auth";
import { getPartnerViewerConnection } from "@/lib/server-data";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const modeIntent = cookieStore.get("ember-mode")?.value;
  const viewerConnection = await getPartnerViewerConnection(session.user.id);
  const displayName = session.user.nickname ?? session.user.name;
  const isPartnerExperience = Boolean(viewerConnection) || modeIntent === "partner";

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <div className="grid gap-3.5 sm:gap-4 lg:grid-cols-[290px_1fr] lg:gap-6">
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-48px)]">
          <AppSidebar
            name={displayName}
            isPartnerViewer={isPartnerExperience}
          />
        </div>

        <div className="min-w-0 space-y-3.5 sm:space-y-6">{children}</div>
      </div>
    </main>
  );
}
