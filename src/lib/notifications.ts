import { differenceInCalendarDays, parseISO } from "date-fns";
import type { DashboardSnapshot } from "@/lib/server-data";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  tone: "default" | "secondary" | "warning" | "success";
  syncKey?: string;
  countsTowardBadge?: boolean;
};

type NotificationAudience = "user" | "partner";

type BuildNotificationOptions = {
  audience?: NotificationAudience;
  ownerName?: string | null;
};

type CareNote = {
  title: string;
  message: string;
};

type RecentSignal = {
  kind: "symptom" | "mood";
  intensity: number;
  date: string;
};

function daysUntil(dateValue?: string | null) {
  if (!dateValue) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return differenceInCalendarDays(parseISO(dateValue), today);
}

function buildReminderMessage(days: number, audience: NotificationAudience, ownerName?: string | null) {
  if (audience === "partner") {
    const name = ownerName ?? "Your partner";

    if (days === 0) {
      return `${name}'s next period may start today. A gentle check-in, comfort snack, or slower plans could help.`;
    }

    if (days === 1) {
      return `${name}'s next period may start tomorrow. A kind heads-up or a little extra care could go a long way.`;
    }

    return `${name}'s next period may start in about ${days} days. This is a nice time to check in softly and be a bit extra thoughtful.`;
  }

  if (days === 0) {
    return "Your next period may start today. Keep your comfort essentials close and let the day be a little softer if you need it.";
  }

  if (days === 1) {
    return "Your next period may start tomorrow. It may help to keep pads, hydration, and a gentler schedule in mind.";
  }

  return `Your next period may start in about ${days} days. A small prep now can make the week feel lighter later.`;
}

export function buildCareNote(
  snapshot: DashboardSnapshot,
  options: BuildNotificationOptions = {},
): CareNote {
  const audience = options.audience ?? "user";
  const ownerName = options.ownerName ?? snapshot.profile?.displayName ?? "your partner";
  const hasCycles = snapshot.cycles.length > 0;
  const hasSymptoms = snapshot.symptoms.length > 0;
  const hasMoods = snapshot.moods.length > 0;
  const hasAnyTracking = hasCycles || hasSymptoms || hasMoods;
  const nextPeriodInDays = daysUntil(snapshot.metrics.nextPeriodDate);
  const recentSignals: RecentSignal[] = [
    ...snapshot.symptoms.map((entry) => ({
      kind: "symptom" as const,
      intensity: entry.intensity,
      date: entry.date,
    })),
    ...snapshot.moods.map((entry) => ({
      kind: "mood" as const,
      intensity: entry.intensity,
      date: entry.date,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const highIntensitySignal = recentSignals.find((signal) => signal.intensity >= 7);

  if (!hasAnyTracking) {
    return audience === "partner"
      ? {
          title: "Support cue",
          message: `${ownerName}'s shared tracking is still just getting started. Keeping support warm, open, and low-pressure is already a meaningful start.`,
        }
      : {
          title: "A gentle start",
          message: "You are just getting started, and that is already progress. Add a period start or a quick check-in, and this space will become more personal to your data.",
        };
  }

  if (!hasCycles && (hasSymptoms || hasMoods)) {
    return audience === "partner"
      ? {
          title: "Support cue",
          message: `${ownerName} has started sharing symptom or mood check-ins. Even this early data helps build context, and a calm check-in can keep support feeling easy.`,
        }
      : {
          title: "Your baseline is building",
          message: "Your recent symptom and mood check-ins are already creating useful context. Adding a period start date will make these notes even more tailored to your cycle.",
        };
  }

  if (snapshot.anomalies.length) {
    return audience === "partner"
      ? {
          title: "Support cue",
          message: `Recent shared data suggests a pattern worth noticing for ${ownerName}. Staying calm, practical, and gently supportive is already the right direction while they keep tracking.`,
        }
      : {
          title: "You are noticing early",
          message: "Recent tracking suggests a pattern worth watching, and noticing it early is a strong step. You do not need to panic; steady logging and timely care are already useful.",
        };
  }

  if (nextPeriodInDays != null && nextPeriodInDays >= 0 && nextPeriodInDays <= 3) {
    return audience === "partner"
      ? {
          title: "Support cue",
          message: `${ownerName}'s shared cycle timing suggests their next period may be close. A soft check-in or a little extra thoughtfulness may land well over the next few days.`,
        }
      : {
          title: "Gentle prep can help",
          message: "Your recent cycle timing suggests your next period may be close. A little preparation now, like comfort supplies or a lighter plan, can make the coming days feel easier.",
        };
  }

  if (highIntensitySignal) {
    return audience === "partner"
      ? {
          title: "Support cue",
          message: `${ownerName}'s recent ${highIntensitySignal.kind} check-in looked more intense than usual. A little extra gentleness and fewer assumptions may help them feel better supported today.`,
        }
      : {
          title: "A softer day is okay",
          message: `Your recent ${highIntensitySignal.kind} check-in looked more intense than usual. Let today be simpler if needed, and trust that even small forms of care still count.`,
        };
  }

  switch (snapshot.metrics.currentPhase) {
    case "Menstrual phase":
      return audience === "partner"
        ? {
            title: "Support cue",
            message: `${ownerName}'s cycle timing suggests a menstrual phase right now. Quiet support, rest, and small practical help can make this stretch feel more manageable.`,
          }
        : {
            title: "Go gently today",
            message: "Your cycle timing suggests you are in a menstrual phase right now. Rest counts, warmth helps, and a slower pace can still be a very good rhythm.",
          };
    case "Follicular phase":
      return audience === "partner"
        ? {
            title: "Support cue",
            message: `${ownerName}'s recent cycle timing points to a steadier rebuilding phase. Encouragement and light, flexible plans may feel especially supportive right now.`,
          }
        : {
            title: "A steadier stretch",
            message: "Your recent cycle timing points to a rebuilding phase. If your energy agrees, this can be a nice moment for small routines, gentle movement, or a simple reset.",
          };
    case "Fertile window":
      return audience === "partner"
        ? {
            title: "Support cue",
            message: `${ownerName}'s shared timing places them in an estimated fertile window. Body cues can feel a little more noticeable here, so calm curiosity usually helps more than over-reading every signal.`,
          }
        : {
            title: "Stay curious",
            message: "Your cycle timing places you in an estimated fertile window. You may notice stronger body cues, and simple observation is enough; you do not need to decode everything at once.",
          };
    case "Ovulation day (estimated)":
      return audience === "partner"
        ? {
            title: "Support cue",
            message: `${ownerName}'s shared timing suggests an estimated ovulation day around now. It is only an estimate, but calm kindness and low-pressure support can still be especially helpful.`,
          }
        : {
            title: "Estimated high-signal day",
            message: "Your cycle timing suggests an estimated ovulation day around now. It is only an estimate, but your body may feel a little more noticeable today, and soft awareness is enough.",
          };
    default:
      return audience === "partner"
        ? {
            title: "Support cue",
            message: `${ownerName}'s recent cycle history is starting to form a clearer rhythm. Low-pressure check-ins and steady support can help that rhythm feel easier to move through.`,
          }
        : {
            title: "Your rhythm is taking shape",
            message: "Your recent cycle history is starting to form a clearer rhythm. Keeping routines gentle and consistent can help you notice what supports you best.",
          };
  }
}

export function buildNotifications(
  snapshot: DashboardSnapshot,
  options: BuildNotificationOptions = {},
): AppNotification[] {
  const audience = options.audience ?? "user";
  const ownerName = options.ownerName ?? snapshot.profile?.displayName ?? "Your partner";
  const notifications: AppNotification[] = [];
  const nextPeriodInDays = daysUntil(snapshot.metrics.nextPeriodDate);

  if (nextPeriodInDays != null && nextPeriodInDays >= 0 && nextPeriodInDays <= 3) {
    notifications.push({
      id: "next-period-reminder",
      title: nextPeriodInDays === 0 ? "Period reminder for today" : "Period reminder",
      message: buildReminderMessage(nextPeriodInDays, audience, ownerName),
      tone: "secondary",
      syncKey: `next-period-reminder:${snapshot.metrics.nextPeriodDate ?? "unknown"}`,
    });
  }

  if (snapshot.metrics.currentPhase === "Menstrual phase") {
    notifications.push({
      id: "current-phase-menstrual",
      title: audience === "partner" ? "Tender-days heads-up" : "Period-day care note",
      message:
        audience === "partner"
          ? `${ownerName} is likely in a period phase right now. Warmth, patience, and practical help can feel especially meaningful.`
          : "You are in your menstrual phase right now. Warm drinks, rest, and a softer pace are all valid choices today.",
      tone: "success",
      syncKey: `menstrual-phase:${snapshot.cycles[0]?.startDate ?? "unknown"}`,
    });
  }

  snapshot.anomalies.slice(0, 2).forEach((anomaly, index) => {
    notifications.push({
      id: `anomaly-${index}-${anomaly.type}`,
      title: audience === "partner" ? "Pattern watch" : "Cycle alert",
      message:
        audience === "partner"
          ? `${anomaly.message} A gentle check-in could help, and medical care is worth encouraging if this repeats.`
          : `${anomaly.message} This is not a diagnosis, but it is worth keeping an eye on and following the care advice if it repeats.`,
      tone: anomaly.severity === "info" ? "default" : "warning",
      syncKey: `anomaly:${index}:${anomaly.type}:${anomaly.severity}:${anomaly.message}`,
    });
  });

  const highIntensitySymptom = snapshot.symptoms.find((entry) => entry.intensity >= 7);
  const highIntensityMood = snapshot.moods.find((entry) => entry.intensity >= 7);

  if (highIntensitySymptom || highIntensityMood) {
    notifications.push({
      id: "high-intensity-day",
      title: audience === "partner" ? "Support cue" : "Higher-intensity check-in",
      message:
        audience === "partner"
          ? `${ownerName} has logged a higher-intensity symptom or mood recently. Today may be a good day for extra gentleness and fewer assumptions.`
          : "A recent check-in looks more intense than usual. Be extra kind to yourself and notice what helps, even if it is something small.",
      tone: "warning",
      syncKey: `high-intensity-day:${highIntensitySymptom?.date ?? highIntensityMood?.date ?? "unknown"}:${highIntensitySymptom?.intensity ?? highIntensityMood?.intensity ?? "unknown"}`,
    });
  }

  if (
    audience === "user" &&
    snapshot.partnerConnection?.consentGiven &&
    snapshot.partnerConnection.permissions.canReceiveNotifications
  ) {
    notifications.push({
      id: "partner-connected",
      title: "Partner sync is on",
      message: "Your connected partner can see shared alerts and cycle updates, so support can stay timely without extra explaining.",
      tone: "default",
      syncKey: `partner-shared-alerts:${snapshot.partnerConnection.id}`,
    });
  }

  if (
    audience === "partner" &&
    snapshot.partnerConnection?.consentGiven &&
    snapshot.partnerConnection.permissions.canReceiveNotifications
  ) {
    notifications.push({
      id: "partner-alerts-active",
      title: "Shared alerts are active",
      message: `You'll see gentle cycle alerts here for ${ownerName}, including period reminders and pattern-watch notices when something needs attention.`,
      tone: "default",
      syncKey: `partner-shared-alerts:${snapshot.partnerConnection.id}`,
    });
  }

  if (snapshot.latestInsight?.generatedAt) {
    notifications.push({
      id: "fresh-ai-insight",
      title: audience === "partner" ? "Fresh insight available" : "Fresh AI insight available",
      message:
        audience === "partner"
          ? `A recent AI summary is available for ${ownerName}'s shared tracking data.`
          : "Your latest AI summary is ready if you want a calmer, high-level read on this cycle.",
      tone: "success",
      syncKey: `fresh-ai-insight:${snapshot.latestInsight.generatedAt}`,
    });
  }

  if (!notifications.length) {
    notifications.push({
      id: "all-quiet",
      title: "All quiet for now",
      message:
        audience === "partner"
          ? `No urgent shared alerts for ${ownerName} right now. Gentle consistency still matters.`
          : "No urgent alerts right now. Keep listening to your body and logging the little things that stand out.",
      tone: "success",
      syncKey: `all-quiet:${snapshot.metrics.nextPeriodDate ?? "none"}:${snapshot.latestInsight?.generatedAt ?? "none"}:${snapshot.anomalies.length}`,
      countsTowardBadge: false,
    });
  }

  return notifications.slice(0, 6);
}
