import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb/mongoose";
import AIInsight from "@/models/AIInsight";
import Cycle from "@/models/Cycle";
import Message from "@/models/Message";
import Mood from "@/models/Mood";
import PartnerConnection from "@/models/PartnerConnection";
import Symptom from "@/models/Symptom";
import User from "@/models/User";

const settingsSchema = z.object({
  nickname: z.string().trim().max(24).optional(),
  themePreference: z.enum(["light", "dark"]),
});

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

  const payload = settingsSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid settings payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  await connectDB();

  const nickname = payload.data.nickname?.trim() || undefined;

  const user = await User.findByIdAndUpdate(
    session.user.id,
    {
      nickname,
      themePreference: payload.data.themePreference,
    },
    {
      returnDocument: "after",
    },
  ).select("_id nickname name themePreference");

  const response = NextResponse.json({
    success: true,
    profile: {
      id: user?.id ?? session.user.id,
      nickname: user?.nickname ?? null,
      name: user?.name ?? null,
      themePreference: user?.themePreference ?? payload.data.themePreference,
    },
  });

  response.cookies.set("ember-theme", payload.data.themePreference, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export async function DELETE() {
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

  await connectDB();

  const connections = await PartnerConnection.find({
    $or: [
      { primaryUserId: session.user.id },
      { partnerUserId: session.user.id },
    ],
  })
    .select("_id")
    .lean();

  const connectionIds = connections.map((connection) => connection._id);

  if (connectionIds.length) {
    await Message.deleteMany({ connectionId: { $in: connectionIds } });
  }

  await Promise.all([
    Cycle.deleteMany({ userId: session.user.id }),
    Symptom.deleteMany({ userId: session.user.id }),
    Mood.deleteMany({ userId: session.user.id }),
    AIInsight.deleteMany({ userId: session.user.id }),
    PartnerConnection.deleteMany({
      $or: [
        { primaryUserId: session.user.id },
        { partnerUserId: session.user.id },
      ],
    }),
    User.deleteOne({ _id: session.user.id }),
  ]);

  const response = NextResponse.json({ success: true });
  response.cookies.set("ember-mode", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  response.cookies.set("ember-theme", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  return response;
}
