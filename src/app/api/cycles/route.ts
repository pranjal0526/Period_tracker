import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { encryptData } from "@/lib/encryption/crypto";
import { getDashboardSnapshot, getUserEncryptionKey } from "@/lib/server-data";
import connectDB from "@/lib/mongodb/mongoose";
import {
  calculateCycleLength,
  calculatePeriodLength,
  MAX_LOGICAL_PERIOD_DAYS,
} from "@/lib/utils/cycle-calculations";
import { getLocalDateInputValue } from "@/lib/utils/date-helpers";
import Cycle from "@/models/Cycle";

const cycleSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  flowIntensity: z.enum(["Light", "Medium", "Heavy"]).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  clientToday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const cycleUpdateSchema = z.object({
  id: z.string().min(1),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  clientToday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function parseDateInput(dateValue: string) {
  const parsed = new Date(`${dateValue}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

async function validateCycleWindow(params: {
  userId: string;
  startDate: Date;
  endDate?: Date | null;
  excludeId?: string;
}) {
  const { userId, startDate, endDate = null, excludeId } = params;
  const filter = excludeId ? { $ne: excludeId } : undefined;

  const [moreRecentCycle, olderCycle] = await Promise.all([
    Cycle.findOne({
      userId,
      ...(filter ? { _id: filter } : {}),
      startDate: { $gt: startDate },
    })
      .sort({ startDate: 1 })
      .select("_id startDate"),
    Cycle.findOne({
      userId,
      ...(filter ? { _id: filter } : {}),
      startDate: { $lt: startDate },
    })
      .sort({ startDate: -1 })
      .select("_id startDate endDate"),
  ]);

  if (endDate && moreRecentCycle?.startDate && endDate >= moreRecentCycle.startDate) {
    return "End date must be before your next logged period start.";
  }

  if (olderCycle?.endDate && olderCycle.endDate >= startDate) {
    return "Start date overlaps with an earlier logged period. Delete or adjust the older entry first.";
  }

  return null;
}

async function recalculateCycleData(userId: string) {
  const allCycles = await Cycle.find({ userId })
    .sort({ startDate: -1 })
    .select("_id startDate endDate");

  const updates = allCycles.map((entry, index) => {
    const nextStart = allCycles[index + 1]?.startDate;
    const moreRecentStart = allCycles[index - 1]?.startDate;
    const validEndDate =
      entry.endDate &&
      entry.endDate >= entry.startDate &&
      (!moreRecentStart || entry.endDate < moreRecentStart)
        ? entry.endDate
        : null;

    return {
      updateOne: {
        filter: { _id: entry._id },
        update: {
          $set: {
            cycleLength: calculateCycleLength(entry.startDate, nextStart),
            periodLength: calculatePeriodLength(entry.startDate, validEndDate),
            endDate: validEndDate,
          },
        },
      },
    };
  });

  if (updates.length) {
    await Cycle.bulkWrite(updates);
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getDashboardSnapshot(session.user.id);
  return NextResponse.json({ cycles: snapshot.cycles, metrics: snapshot.metrics });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MONGODB_URI is missing from .env.local" },
      { status: 503 },
    );
  }

  const payload = cycleSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid cycle payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  await connectDB();

  const startDate = parseDateInput(payload.data.startDate);
  const endDate = payload.data.endDate ? parseDateInput(payload.data.endDate) : null;

  if (!startDate || (payload.data.endDate && !endDate)) {
    return NextResponse.json(
      { error: "Invalid date format. Please use a valid calendar date." },
      { status: 400 },
    );
  }

  const todayISO = payload.data.clientToday ?? getLocalDateInputValue();

  if (payload.data.startDate > todayISO) {
    return NextResponse.json(
      { error: "Start date cannot be in the future." },
      { status: 400 },
    );
  }

  if (payload.data.endDate && payload.data.endDate > todayISO) {
    return NextResponse.json(
      { error: "End date cannot be in the future." },
      { status: 400 },
    );
  }

  if (endDate && endDate < startDate) {
    return NextResponse.json(
      { error: "End date cannot be earlier than start date." },
      { status: 400 },
    );
  }

  const periodLength = calculatePeriodLength(startDate, endDate);

  if (periodLength && periodLength > MAX_LOGICAL_PERIOD_DAYS) {
    return NextResponse.json(
      {
        error: `Period length looks too long (${periodLength} days). Please verify start and end dates.`,
      },
      { status: 400 },
    );
  }

  const duplicateCycle = await Cycle.findOne({
    userId: session.user.id,
    startDate,
  }).select("_id");

  if (duplicateCycle) {
    return NextResponse.json(
      { error: "A cycle with this start date already exists." },
      { status: 409 },
    );
  }

  const logicalError = await validateCycleWindow({
    userId: session.user.id,
    startDate,
    endDate,
  });

  if (logicalError) {
    return NextResponse.json({ error: logicalError }, { status: 400 });
  }

  const userKey = await getUserEncryptionKey(session.user.id);

  const cycle = await Cycle.create({
    userId: session.user.id,
    startDate,
    endDate,
    cycleLength: null,
    periodLength,
    flowIntensity:
      payload.data.flowIntensity && userKey
        ? encryptData(payload.data.flowIntensity, userKey)
        : payload.data.flowIntensity,
    notesEncrypted:
      payload.data.notes && userKey
        ? encryptData(payload.data.notes, userKey)
        : payload.data.notes,
  });
  await recalculateCycleData(session.user.id);

  return NextResponse.json({ success: true, cycleId: cycle.id });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MONGODB_URI is missing from .env.local" },
      { status: 503 },
    );
  }

  const payload = cycleUpdateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid cycle update payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  await connectDB();

  const cycle = await Cycle.findOne({
    _id: payload.data.id,
    userId: session.user.id,
  }).select("_id startDate endDate");

  if (!cycle) {
    return NextResponse.json({ error: "Cycle entry not found." }, { status: 404 });
  }

  const nextEndDate = payload.data.endDate ? parseDateInput(payload.data.endDate) : null;

  if (payload.data.endDate && !nextEndDate) {
    return NextResponse.json(
      { error: "Invalid end date format. Please use a valid calendar date." },
      { status: 400 },
    );
  }

  const todayISO = payload.data.clientToday ?? getLocalDateInputValue();

  if (payload.data.endDate && payload.data.endDate > todayISO) {
    return NextResponse.json(
      { error: "End date cannot be in the future." },
      { status: 400 },
    );
  }

  if (nextEndDate && nextEndDate < cycle.startDate) {
    return NextResponse.json(
      { error: "End date cannot be earlier than start date." },
      { status: 400 },
    );
  }

  const periodLength = calculatePeriodLength(cycle.startDate, nextEndDate);

  if (periodLength && periodLength > MAX_LOGICAL_PERIOD_DAYS) {
    return NextResponse.json(
      {
        error: `Period length looks too long (${periodLength} days). Please verify the dates.`,
      },
      { status: 400 },
    );
  }

  const logicalError = await validateCycleWindow({
    userId: session.user.id,
    startDate: cycle.startDate,
    endDate: nextEndDate,
    excludeId: cycle.id,
  });

  if (logicalError) {
    return NextResponse.json({ error: logicalError }, { status: 400 });
  }

  cycle.endDate = nextEndDate;
  cycle.periodLength = periodLength;
  await cycle.save();
  await recalculateCycleData(session.user.id);

  return NextResponse.json({ success: true, cycleId: cycle.id });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "MONGODB_URI is missing from .env.local" },
      { status: 503 },
    );
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Cycle id is required." }, { status: 400 });
  }

  await connectDB();

  const result = await Cycle.deleteOne({ _id: id, userId: session.user.id });

  if (!result.deletedCount) {
    return NextResponse.json({ error: "Cycle entry not found." }, { status: 404 });
  }

  await recalculateCycleData(session.user.id);

  return NextResponse.json({ success: true });
}
