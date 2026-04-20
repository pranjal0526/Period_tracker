import { differenceInCalendarDays, format } from "date-fns";
import { detectAnomalies } from "@/lib/ai/anomaly-detector";
import { decryptData, decryptMasterKey } from "@/lib/encryption/crypto";
import connectDB from "@/lib/mongodb/mongoose";
import { getDisplayName } from "@/lib/profile";
import {
  averageCycleLength,
  calculateCycleLength,
  calculatePeriodLength,
  cyclePhaseLabel,
  estimateFertileWindowFromNextPeriodStart,
  predictedNextPeriodDate,
  sanitizeCycleLength,
  sanitizePeriodLength,
  type CycleRecord,
} from "@/lib/utils/cycle-calculations";
import AIInsight from "@/models/AIInsight";
import Cycle from "@/models/Cycle";
import Mood from "@/models/Mood";
import PartnerConnection from "@/models/PartnerConnection";
import Symptom from "@/models/Symptom";
import User from "@/models/User";

export type DashboardSnapshot = {
  profile: {
    id: string;
    nickname?: string | null;
    name?: string | null;
    image?: string | null;
    displayName: string;
    themePreference: "light" | "dark";
  } | null;
  cycles: Array<{
    id: string;
    startDate: string;
    endDate?: string | null;
    cycleLength?: number | null;
    periodLength?: number | null;
    flowIntensity?: string | null;
  }>;
  symptoms: Array<{
    id: string;
    date: string;
    symptoms: string[];
    intensity: number;
    notes?: string | null;
  }>;
  moods: Array<{
    id: string;
    date: string;
    mood: string;
    intensity: number;
    notes?: string | null;
  }>;
  partnerConnection:
    | {
        id: string;
        accessCode: string;
        consentGiven: boolean;
      permissions: {
          canViewCalendar: boolean;
          canViewSymptoms: boolean;
          canViewMoods: boolean;
          canReceiveNotifications: boolean;
          canSendMessages: boolean;
        };
        primaryUserId?: string;
        partnerUserId?: string | null;
        partnerDisplayName?: string | null;
      }
    | null;
  latestInsight:
    | {
        summary: string;
        recommendations: string[];
        generatedAt: string;
      }
    | null;
  metrics: {
    averageCycleLength: number | null;
    currentCycleDay: number | null;
    currentPhase: string;
    nextPeriodDate: string | null;
    estimatedOvulationDate: string | null;
    fertileWindowStartDate: string | null;
    fertileWindowEndDate: string | null;
    fertileWindow: string | null;
  };
  anomalies: ReturnType<typeof detectAnomalies>;
  setupError?: string;
};

type SerializedProfile = NonNullable<DashboardSnapshot["profile"]>;

const emptySnapshot: DashboardSnapshot = {
  profile: null,
  cycles: [],
  symptoms: [],
  moods: [],
  partnerConnection: null,
  latestInsight: null,
  metrics: {
    averageCycleLength: null,
    currentCycleDay: null,
    currentPhase: "Waiting for first cycle",
    nextPeriodDate: null,
    estimatedOvulationDate: null,
    fertileWindowStartDate: null,
    fertileWindowEndDate: null,
    fertileWindow: null,
  },
  anomalies: [],
};

function filterPartnerSnapshotByPermissions(
  snapshot: DashboardSnapshot,
  permissions: NonNullable<DashboardSnapshot["partnerConnection"]>["permissions"],
): DashboardSnapshot {
  return {
    ...snapshot,
    cycles: permissions.canViewCalendar ? snapshot.cycles : [],
    symptoms: permissions.canViewSymptoms ? snapshot.symptoms : [],
    moods: permissions.canViewMoods ? snapshot.moods : [],
    latestInsight: permissions.canViewCalendar ? snapshot.latestInsight : null,
    metrics: permissions.canViewCalendar ? snapshot.metrics : emptySnapshot.metrics,
    anomalies: permissions.canViewCalendar ? snapshot.anomalies : [],
  };
}

function serializeDate(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function serializeProfile(user: {
  _id?: { toString(): string };
  id?: string;
  nickname?: string | null;
  name?: string | null;
  image?: string | null;
  themePreference?: "light" | "dark";
  encryptionKey?: string | null;
}): SerializedProfile {
  const id = user.id ?? user._id?.toString() ?? "";

  return {
    id,
    nickname: user.nickname ?? null,
    name: user.name ?? null,
    image: user.image ?? null,
    displayName: getDisplayName(user),
    themePreference: user.themePreference === "dark" ? "dark" : "light",
  };
}

export async function getDashboardSnapshot(
  userId?: string | null,
): Promise<DashboardSnapshot> {
  if (!userId) {
    return emptySnapshot;
  }

  if (!process.env.MONGODB_URI) {
    return {
      ...emptySnapshot,
      setupError:
        "Add MONGODB_URI in .env.local to unlock live tracking, sync, and AI insights.",
    };
  }

  try {
    await connectDB();

    const [userRaw, cyclesRaw, symptomsRaw, moodsRaw, partnerRaw, insightRaw] =
      await Promise.all([
        User.findById(userId)
          .select("_id name nickname image themePreference encryptionKey")
          .lean(),
        Cycle.find({ userId }).sort({ startDate: -1 }).limit(12).lean(),
        Symptom.find({ userId }).sort({ date: -1 }).limit(8).lean(),
        Mood.find({ userId }).sort({ date: -1 }).limit(8).lean(),
        PartnerConnection.findOne({ primaryUserId: userId, isActive: true }).lean(),
        AIInsight.findOne({ userId }).sort({ generatedAt: -1 }).lean(),
      ]);

    const partnerUserRaw =
      partnerRaw?.partnerUserId != null
        ? await User.findById(partnerRaw.partnerUserId)
            .select("_id name nickname")
            .lean()
        : null;
    const userEncryptionKey = (() => {
      if (!userRaw?.encryptionKey) {
        return null;
      }

      try {
        return decryptMasterKey(userRaw.encryptionKey, userId);
      } catch {
        return null;
      }
    })();

    const readStoredNote = (value?: string | null) => {
      if (!value) {
        return null;
      }

      if (!userEncryptionKey) {
        return value;
      }

      try {
        const decrypted = decryptData(value, userEncryptionKey);
        return decrypted || value;
      } catch {
        return value;
      }
    };

    const cycles = cyclesRaw.map((cycle, index) => {
      const startDate = new Date(cycle.startDate);
      const nextStartDate = cyclesRaw[index + 1]?.startDate
        ? new Date(cyclesRaw[index + 1].startDate)
        : undefined;
      const moreRecentStartDate = cyclesRaw[index - 1]?.startDate
        ? new Date(cyclesRaw[index - 1].startDate)
        : undefined;
      const derivedCycleLength = calculateCycleLength(startDate, nextStartDate);
      const validEndDate =
        cycle.endDate &&
        new Date(cycle.endDate) >= startDate &&
        (!moreRecentStartDate || new Date(cycle.endDate) < moreRecentStartDate)
          ? new Date(cycle.endDate)
          : null;
      const derivedPeriodLength = validEndDate
        ? calculatePeriodLength(startDate, validEndDate)
        : null;

      return {
        id: cycle._id.toString(),
        startDate: startDate.toISOString(),
        endDate: serializeDate(validEndDate),
        cycleLength: derivedCycleLength ?? sanitizeCycleLength(cycle.cycleLength),
        periodLength: derivedPeriodLength ?? sanitizePeriodLength(cycle.periodLength),
        flowIntensity: cycle.flowIntensity ?? null,
      };
    });

    const symptoms = symptomsRaw.map((entry) => ({
      id: entry._id.toString(),
      date: entry.date.toISOString(),
      symptoms: entry.symptoms ?? [],
      intensity: entry.intensity ?? 5,
      notes: readStoredNote(entry.notesEncrypted),
    }));

    const moods = moodsRaw.map((entry) => ({
      id: entry._id.toString(),
      date: entry.date.toISOString(),
      mood: entry.mood,
      intensity: entry.intensity ?? 5,
      notes: readStoredNote(entry.notesEncrypted),
    }));

    const cycleMetricsSource: CycleRecord[] = cycles.map((cycle) => ({
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      cycleLength: cycle.cycleLength,
      periodLength: cycle.periodLength,
    }));

    const hasAverageCycleHistory = cycleMetricsSource.some(
      (cycle) => sanitizeCycleLength(cycle.cycleLength) != null,
    );
    const averageLength = hasAverageCycleHistory
      ? averageCycleLength(cycleMetricsSource)
      : null;
    const nextPeriodDate = predictedNextPeriodDate(cycleMetricsSource);
    const latestStartedCycle =
      cycles.find((cycle) => new Date(cycle.startDate).getTime() <= Date.now()) ?? cycles[0];
    const currentCycleDay = latestStartedCycle
      ? Math.max(
          1,
          differenceInCalendarDays(new Date(), new Date(latestStartedCycle.startDate)) + 1,
        )
      : null;
    const latestPeriodLength =
      latestStartedCycle?.periodLength ??
      (latestStartedCycle?.endDate
        ? differenceInCalendarDays(
            new Date(latestStartedCycle.endDate),
            new Date(latestStartedCycle.startDate),
          ) + 1
        : null);
    const fertilityPrediction = nextPeriodDate
      ? estimateFertileWindowFromNextPeriodStart(nextPeriodDate)
      : null;
    const fertileWindow = fertilityPrediction
      ? `${format(fertilityPrediction.fertileStartDate, "MMM d")} - ${format(fertilityPrediction.ovulationDate, "MMM d")}`
      : null;

    return {
      profile: userRaw ? serializeProfile(userRaw) : null,
      cycles,
      symptoms,
      moods,
      partnerConnection: partnerRaw
        ? {
            id: partnerRaw._id.toString(),
            accessCode: partnerRaw.accessCode,
            consentGiven: partnerRaw.consentGiven,
            permissions: partnerRaw.permissions,
            primaryUserId: partnerRaw.primaryUserId?.toString(),
            partnerUserId: partnerRaw.partnerUserId?.toString() ?? null,
            partnerDisplayName: partnerUserRaw
              ? getDisplayName(partnerUserRaw)
              : null,
          }
        : null,
      latestInsight: insightRaw
        ? {
            summary: insightRaw.summary,
            recommendations: insightRaw.recommendations ?? [],
            generatedAt: insightRaw.generatedAt.toISOString(),
          }
        : null,
      metrics: {
        averageCycleLength: averageLength,
        currentCycleDay,
        currentPhase: currentCycleDay
          ? cyclePhaseLabel(currentCycleDay, {
              cycleLength: averageLength ?? undefined,
              periodLength: latestPeriodLength ?? undefined,
            })
          : "Waiting for first cycle",
        nextPeriodDate: nextPeriodDate ? nextPeriodDate.toISOString() : null,
        estimatedOvulationDate: fertilityPrediction
          ? fertilityPrediction.ovulationDate.toISOString()
          : null,
        fertileWindowStartDate: fertilityPrediction
          ? fertilityPrediction.fertileStartDate.toISOString()
          : null,
        fertileWindowEndDate: fertilityPrediction
          ? fertilityPrediction.fertileEndDate.toISOString()
          : null,
        fertileWindow,
      },
      anomalies: detectAnomalies(cycles),
    };
  } catch {
    return {
      ...emptySnapshot,
      setupError:
        "We scaffolded the experience, but the live MongoDB connection is not ready yet.",
    };
  }
}

export async function getUserEncryptionKey(userId: string) {
  if (!process.env.MONGODB_URI) {
    return null;
  }

  await connectDB();
  const user = await User.findById(userId).select("encryptionKey");

  if (!user?.encryptionKey) {
    return null;
  }

  return decryptMasterKey(user.encryptionKey, userId);
}

export async function getPartnerViewerConnection(userId?: string | null) {
  if (!userId || !process.env.MONGODB_URI) {
    return null;
  }

  await connectDB();

  const connection = await PartnerConnection.findOne({
    partnerUserId: userId,
    consentGiven: true,
    isActive: true,
  }).lean();

  if (!connection) {
    return null;
  }

  return {
    id: connection._id.toString(),
    primaryUserId: connection.primaryUserId.toString(),
    partnerUserId: connection.partnerUserId?.toString() ?? null,
  };
}

export async function getPartnerViewerSnapshot(userId?: string | null) {
  const connection = await getPartnerViewerConnection(userId);

  if (!connection) {
    return null;
  }

  const snapshot = await getDashboardSnapshot(connection.primaryUserId);
  return {
    connection,
    snapshot: snapshot.partnerConnection
      ? filterPartnerSnapshotByPermissions(snapshot, snapshot.partnerConnection.permissions)
      : snapshot,
  };
}
