"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Heart, Sparkles, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/notifications";

type NotificationBellProps = {
  notifications: AppNotification[];
  className?: string;
};

const SEEN_STORAGE_KEY = "ember-notifications-seen";
const DISMISSED_STORAGE_KEY = "ember-notifications-dismissed";

const toneBadgeVariant = {
  default: "outline",
  secondary: "secondary",
  warning: "warning",
  success: "success",
} as const;

const toneLabel = {
  default: "Note",
  secondary: "Reminder",
  warning: "Watch",
  success: "Comfort",
} as const;

function iconForTone(tone: AppNotification["tone"]) {
  if (tone === "warning") {
    return TriangleAlert;
  }

  if (tone === "success") {
    return Heart;
  }

  return Sparkles;
}

function notificationSignature(notification: AppNotification) {
  return `${notification.id}::${notification.title}::${notification.message}`;
}

function notificationStorageKey(notification: AppNotification) {
  return notification.syncKey ?? notificationSignature(notification);
}

function readStoredList(key: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function NotificationBell({
  notifications,
  className,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [seenNotifications, setSeenNotifications] = useState<string[]>(() =>
    readStoredList(SEEN_STORAGE_KEY),
  );
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(() =>
    readStoredList(DISMISSED_STORAGE_KEY),
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const notificationItems = useMemo(
    () =>
      notifications.map((notification) => ({
        ...notification,
        signature: notificationSignature(notification),
        storageKey: notificationStorageKey(notification),
      })),
    [notifications],
  );
  const visibleNotifications = notificationItems.filter(
    (notification) => !dismissedNotifications.includes(notification.storageKey),
  );
  const unreadCount = visibleNotifications.filter(
    (notification) =>
      notification.countsTowardBadge !== false &&
      !seenNotifications.includes(notification.storageKey),
  ).length;
  const markVisibleAsSeen = () => {
    if (!visibleNotifications.length) {
      return;
    }

    setSeenNotifications((current) => {
      const next = new Set(current);
      let changed = false;

      visibleNotifications.forEach((notification) => {
        if (!next.has(notification.storageKey)) {
          next.add(notification.storageKey);
          changed = true;
        }
      });

      return changed ? [...next] : current;
    });
  };

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === SEEN_STORAGE_KEY) {
        setSeenNotifications(readStoredList(SEEN_STORAGE_KEY));
      }

      if (event.key === DISMISSED_STORAGE_KEY) {
        setDismissedNotifications(readStoredList(DISMISSED_STORAGE_KEY));
      }
    }

    function syncFromStorage() {
      setSeenNotifications(readStoredList(SEEN_STORAGE_KEY));
      setDismissedNotifications(readStoredList(DISMISSED_STORAGE_KEY));
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncFromStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SEEN_STORAGE_KEY,
      JSON.stringify(seenNotifications.slice(-120)),
    );
  }, [seenNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      DISMISSED_STORAGE_KEY,
      JSON.stringify(dismissedNotifications.slice(-120)),
    );
  }, [dismissedNotifications]);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative z-[60] size-14 shrink-0 rounded-[28px] border-line/70 bg-card-strong shadow-[0_18px_38px_rgba(96,55,38,0.14)] sm:size-12 sm:rounded-[24px]"
        aria-label="Open notifications"
        onClick={() => {
          const nextOpen = !isOpen;

          if (nextOpen) {
            markVisibleAsSeen();
          }

          setIsOpen(nextOpen);
        }}
      >
        <Bell className="size-6 sm:size-5" />
        {!isOpen && unreadCount ? (
          <span className="absolute -right-1 -top-1 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground shadow-[0_10px_22px_rgba(227,112,77,0.28)] sm:h-6 sm:min-w-6">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 bg-foreground/8 backdrop-blur-[4px] lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="glass-panel fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-[30px] border border-line/70 bg-card shadow-[0_22px_44px_rgba(64,36,29,0.16)] lg:absolute lg:right-0 lg:bottom-auto lg:left-auto lg:top-[calc(100%+14px)] lg:w-[min(92vw,380px)] lg:max-w-[calc(100vw-1.5rem)]">
            <div className="px-4 pt-3 lg:hidden">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-line/70" />
            </div>

            <div className="flex flex-col gap-3 border-b border-line/70 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground">Notifications</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Gentle updates that are worth noticing.
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-2">
                <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                  {visibleNotifications.length} alerts
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-full"
                  aria-label="Close notifications"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="size-5" />
                </Button>
              </div>
            </div>

            <div className="touch-scroll max-h-[min(68vh,460px)] overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
              <div className="space-y-3">
                {visibleNotifications.length ? (
                  visibleNotifications.map((notification) => {
                    const Icon = iconForTone(notification.tone);

                    return (
                      <div
                        key={notification.storageKey}
                        className="rounded-[22px] border border-line/70 bg-card-strong p-3.5 sm:p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 rounded-2xl p-2.5",
                              notification.tone === "warning"
                                ? "bg-warning/12 text-warning"
                                : notification.tone === "success"
                                  ? "bg-success/12 text-success"
                                  : notification.tone === "secondary"
                                    ? "bg-secondary/12 text-secondary"
                                    : "bg-primary/12 text-primary",
                            )}
                          >
                            <Icon className="size-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <p className="min-w-0 break-words text-sm font-semibold leading-6 text-foreground">
                                {notification.title}
                              </p>
                              <div className="flex shrink-0 items-center gap-2 self-start">
                                <Badge
                                  variant={toneBadgeVariant[notification.tone]}
                                  className="shrink-0 whitespace-nowrap"
                                >
                                  {toneLabel[notification.tone]}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-full"
                                  aria-label={`Dismiss ${notification.title}`}
                                  onClick={() =>
                                    setDismissedNotifications((current) => {
                                      const next = new Set(current);
                                      next.add(notification.storageKey);
                                      return [...next];
                                    })
                                  }
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="mt-2 break-words text-sm leading-6 text-muted">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[22px] border border-dashed border-line/70 bg-card-strong px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-foreground">All caught up</p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      You&apos;ve cleared the current notifications. New reminders will show up here when something important changes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
