import { differenceInCalendarDays, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/lib/server-data";

type PhaseSupportCardProps = {
  snapshot: DashboardSnapshot;
};

type SupportContent = {
  title: string;
  intro: string;
  tips: string[];
  note?: string;
};

function daysUntil(dateValue?: string | null) {
  if (!dateValue) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return differenceInCalendarDays(parseISO(dateValue), today);
}

function hasRecentCrampSignal(snapshot: DashboardSnapshot) {
  return snapshot.symptoms.some((entry) =>
    entry.symptoms.some((symptom) => /cramp|pelvic|back pain|ache/i.test(symptom)),
  );
}

function hasHighIntensitySignal(snapshot: DashboardSnapshot) {
  return (
    snapshot.symptoms.some((entry) => entry.intensity >= 7) ||
    snapshot.moods.some((entry) => entry.intensity >= 7)
  );
}

function buildSupportContent(snapshot: DashboardSnapshot): SupportContent {
  const phase = snapshot.metrics.currentPhase;
  const nextPeriodInDays = daysUntil(snapshot.metrics.nextPeriodDate);
  const hasCycleData = snapshot.cycles.length > 0;
  const recentCrampSignal = hasRecentCrampSignal(snapshot);
  const highIntensitySignal = hasHighIntensitySignal(snapshot);

  if (!hasCycleData) {
    return {
      title: "Simple comfort while your rhythm builds",
      intro:
        "Once you log a little more cycle history, Ember will tailor these suggestions more closely. For now, keep things easy and practical.",
      tips: [
        "Keep a heating pad or warm bottle nearby so comfort is easy when cramps start.",
        "Sip water or something warm through the day. Small steady hydration often feels better than catching up later.",
        "Make a quick note about what helped today so Ember can learn your patterns with you.",
      ],
    };
  }

  if (phase === "Menstrual phase") {
    return {
      title: highIntensitySignal
        ? "Extra-gentle ideas for intense period days"
        : "Gentle support for period days",
      intro: recentCrampSignal
        ? "Your recent logs suggest cramps or body tension may be part of this stretch, so these are meant to be practical and easy to use."
        : "Your cycle timing points to a menstrual phase, so the goal here is comfort, warmth, and less friction.",
      tips: [
        "Use heat on your lower belly or lower back for 15 to 20 minutes when cramps build.",
        "Try a short walk, child’s pose, or gentle hip stretch if movement feels better than staying still.",
        "Keep meals simple and regular, and let your schedule be a little softer if your body asks for it.",
      ],
      note:
        "If pain feels suddenly stronger than usual, very heavy, or hard to get through day-to-day tasks, it is worth checking in with a clinician.",
    };
  }

  if (phase === "Follicular phase") {
    return {
      title: "Light support while energy rebuilds",
      intro:
        "This phase often feels steadier. The best support here is usually simple habits that keep your body feeling even.",
      tips: [
        recentCrampSignal
          ? "If cramps are lingering, a warm pad and a few minutes of gentle stretching can still help."
          : "Use this steadier stretch for light movement, even if that just means a short walk.",
        "Keep hydration and meals steady so energy feels less up-and-down.",
        "Notice whether your body is feeling clearer or lighter than last week. Small shifts are useful data too.",
      ],
    };
  }

  if (phase === "Fertile window" || phase === "Ovulation day (estimated)") {
    return {
      title: "Body-aware support for higher-signal days",
      intro:
        "Around this time, body cues can feel a little more noticeable. The aim is to stay comfortable without overthinking every change.",
      tips: [
        "If you feel pelvic twinges or lower-back tightness, try warmth and a gentle hip-opening stretch.",
        "Keep water nearby and avoid long gaps between meals if your body feels a bit more sensitive.",
        "Leave a little breathing room in the day so discomfort does not have to compete with a packed schedule.",
      ],
    };
  }

  return {
    title:
      nextPeriodInDays != null && nextPeriodInDays <= 3
        ? "Soft prep for the days ahead"
        : "Low-pressure support for the slower stretch",
    intro:
      nextPeriodInDays != null && nextPeriodInDays <= 3
        ? "Your recent cycle timing suggests your next period may be close, so a little prep now can make the next few days feel easier."
        : "This part of the cycle can feel slower, heavier, or more inward. Keeping things gentle usually helps more than pushing through.",
    tips: [
      "Keep period supplies, a warm layer, and your easiest comfort option within reach.",
      "Choose one calming reset for the day, like an earlier bedtime, a warm shower, or ten quiet minutes off your feet.",
      recentCrampSignal
        ? "If cramps or tension are already starting, heat and light movement usually work better together than either one alone."
        : "If your body starts to feel heavier or tighter, try heat or a short walk before discomfort fully builds.",
    ],
  };
}

export function PhaseSupportCard({ snapshot }: PhaseSupportCardProps) {
  const content = buildSupportContent(snapshot);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="w-fit">Gentle support</Badge>
          <p className="text-sm text-muted">A few phase-aware ideas to keep comfort practical.</p>
        </div>

        <div className="rounded-2xl bg-card-strong p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-foreground sm:text-2xl">{content.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">{content.intro}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {content.tips.map((tip) => (
              <div
                key={tip}
                className="rounded-[22px] border border-line/70 bg-card px-4 py-3 text-sm leading-6 text-foreground"
              >
                {tip}
              </div>
            ))}
          </div>

          {content.note ? (
            <p className="mt-4 text-sm leading-6 text-muted">{content.note}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
