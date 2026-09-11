import { NextRequest, NextResponse } from "next/server";
import { getSession, getMemberSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  // Uploading a photo file is allowed for the admin OR any logged-in member.
  // (What a member can DO with the resulting URL is restricted separately: a member
  // can only set it as their OWN photo - see /api/member/photo.)
  const admin = await getSession();
  const member = admin ? null : await getMemberSession();
  if (!admin && !member) {
    return NextResponse.json({ error: "You must be logged in to upload a photo." }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("photo");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No photo file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Photo must be JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo must be under 5MB." }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;

  // On Vercel, the filesystem is read-only/ephemeral, so uploaded files must go to
  // Vercel Blob instead. Locally (no BLOB_READ_WRITE_TOKEN configured), fall back to
  // writing into /public so local dev works with zero extra setup.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const arrayBuffer = await file.arrayBuffer();
    const blob = await put(`players/${filename}`, Buffer.from(arrayBuffer), {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ photoUrl: blob.url }, { status: 201 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "players");
  await mkdir(uploadDir, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, filename), Buffer.from(arrayBuffer));

  return NextResponse.json({ photoUrl: `/uploads/players/${filename}` }, { status: 201 });
}
