import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { encryptData } from "@/lib/encryption/crypto";
import { getDashboardSnapshot, getUserEncryptionKey } from "@/lib/server-data";
import connectDB from "@/lib/mongodb/mongoose";
import Symptom from "@/models/Symptom";

const symptomSchema = z.object({
  symptoms: z.array(z.string()).min(1),
  intensity: z.number().min(1).max(10),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getDashboardSnapshot(session.user.id);
  return NextResponse.json({ symptoms: snapshot.symptoms });
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

  const payload = symptomSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid symptom payload", details: payload.error.flatten() },
      { status: 400 },
    );
  }

  await connectDB();
  const userKey = await getUserEncryptionKey(session.user.id);

  const entry = await Symptom.create({
    userId: session.user.id,
    symptoms: payload.data.symptoms,
    intensity: payload.data.intensity,
    notesEncrypted:
      payload.data.notes && userKey
        ? encryptData(payload.data.notes, userKey)
        : payload.data.notes,
  });

  return NextResponse.json({ success: true, symptomId: entry.id });
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
    return NextResponse.json({ error: "Symptom id is required." }, { status: 400 });
  }

  await connectDB();

  const result = await Symptom.deleteOne({ _id: id, userId: session.user.id });

  if (!result.deletedCount) {
    return NextResponse.json({ error: "Symptom log not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
