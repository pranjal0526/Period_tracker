import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { generateAccessCode } from "@/lib/encryption/crypto";
import { getDashboardSnapshot } from "@/lib/server-data";
import connectDB from "@/lib/mongodb/mongoose";
import PartnerConnection from "@/models/PartnerConnection";

const partnerSchema = z.object({
  action: z.enum(["create", "connect"]).default("create"),
  accessCode: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getDashboardSnapshot(session.user.id);
  return NextResponse.json({ partnerConnection: snapshot.partnerConnection });
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

  const payload = partnerSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid partner payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  await connectDB();

  if (payload.data.action === "connect" && payload.data.accessCode) {
    const existingPartnerLink = await PartnerConnection.findOne({
      partnerUserId: session.user.id,
      consentGiven: true,
      isActive: true,
    });
    const connection = await PartnerConnection.findOne({
      accessCode: payload.data.accessCode,
      isActive: true,
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Invite code not found or inactive." },
        { status: 404 },
      );
    }

    if (connection.primaryUserId.toString() === session.user.id) {
      return NextResponse.json(
        { error: "You cannot connect to your own invite code." },
        { status: 400 },
      );
    }

    if (
      existingPartnerLink &&
      existingPartnerLink._id.toString() !== connection._id.toString()
    ) {
      return NextResponse.json(
        { error: "This account is already connected to another user." },
        { status: 409 },
      );
    }

    if (
      connection.partnerUserId &&
      connection.partnerUserId.toString() !== session.user.id
    ) {
      return NextResponse.json(
        { error: "This user already has a connected partner." },
        { status: 409 },
      );
    }

    connection.partnerUserId = session.user.id;
    connection.consentGiven = true;
    connection.consentDate = new Date();
    connection.permissions.canViewCalendar = true;
    connection.permissions.canViewSymptoms = true;
    connection.permissions.canViewMoods = true;
    await connection.save();

    return NextResponse.json({ success: true, partnerConnectionId: connection.id });
  }

  const connection = await PartnerConnection.findOneAndUpdate(
    { primaryUserId: session.user.id },
    {
      primaryUserId: session.user.id,
      accessCode: generateAccessCode(),
      isActive: true,
      permissions: {
        canViewCalendar: true,
        canViewSymptoms: true,
        canViewMoods: true,
        canReceiveNotifications: true,
        canSendMessages: true,
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
      returnDocument: "after",
    },
  );

  return NextResponse.json({ success: true, partnerConnectionId: connection.id });
}
