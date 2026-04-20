"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  HeartPulse,
  LayoutDashboard,
  MessageCircleHeart,
  Settings,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/ai-assistant", label: "AI Assistant", icon: HeartPulse },
  { href: "/partner", label: "Partner", icon: MessageCircleHeart },
  { href: "/settings", label: "Settings", icon: Settings },
];

type AppSidebarProps = {
  name?: string | null;
  isPartnerViewer?: boolean;
};

export function AppSidebar({ name, isPartnerViewer = false }: AppSidebarProps) {
  const pathname = usePathname();
  const visibleNavItems = isPartnerViewer
    ? navItems.filter((item) => item.href === "/partner" || item.href === "/settings")
    : navItems;
  const viewLabel = isPartnerViewer ? "Partner view" : "Personal view";
  const mobileSubtitle = isPartnerViewer
    ? "Shared analytics and support tools."
    : "Jump into tracking, insights, and support fast.";

  return (
    <>
      <aside className="glass-panel rounded-[28px] border border-line/70 p-4 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Ember</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Quick access</h2>
          </div>
          <div className="shrink-0 rounded-full border border-line/60 bg-card-strong px-3 py-1.5 text-[11px] font-medium text-muted">
            {viewLabel}
          </div>
        </div>

        <p className="mt-3 max-w-[30ch] text-sm leading-6 text-muted">
          {name ? `Hi ${name}. ${mobileSubtitle}` : mobileSubtitle}
        </p>

        <nav className="mt-4 grid grid-cols-2 gap-2.5">
          {visibleNavItems.map(({ href, icon: Icon, label }, index) => {
            const isActive = pathname === href;
            const isLastOddItem =
              visibleNavItems.length % 2 === 1 && index === visibleNavItems.length - 1;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-w-0 flex-col items-start gap-3 rounded-[22px] border px-3.5 py-3.5 text-sm font-medium transition",
                  isLastOddItem && "col-span-2",
                  isActive
                    ? "border-primary/18 bg-primary text-primary-foreground shadow-[0_16px_30px_rgba(227,112,77,0.22)]"
                    : "border-line/70 bg-card-strong text-foreground hover:border-primary/20 hover:bg-card",
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    isActive ? "bg-white/18" : "bg-card text-primary",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{label}</span>
                  <span
                    className={cn(
                      "mt-1 block text-xs",
                      isActive ? "text-primary-foreground/78" : "text-muted",
                    )}
                  >
                    Open {label.toLowerCase()}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-line/70 pt-3">
          <SignOutButton
            variant="outline"
            className="w-full justify-start rounded-[20px] border-line/70 bg-card-strong py-3"
          />
        </div>
      </aside>

      <aside className="glass-panel hidden h-full flex-col gap-4 rounded-[24px] border border-line/70 p-5 lg:flex">
        <div className="space-y-2 border-b border-line/70 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Ember</p>
            <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            {name
              ? `Signed in as ${name}.`
              : isPartnerViewer
                ? "Read-only partner analytics."
                : "Track cycles, signals, and support."}
          </p>
        </div>

        <nav className="mt-1 flex flex-1 flex-col gap-1.5">
          {visibleNavItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_16px_30px_rgba(227,112,77,0.22)]"
                    : "text-muted hover:bg-card-strong hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line/70 pt-3">
          <SignOutButton className="w-full justify-start" />
        </div>
      </aside>
    </>
  );
}
