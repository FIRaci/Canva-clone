import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/db/drizzle";
import { accounts, users } from "@/db/schema";

type Language = "en" | "vi" | "jp";

export const runtime = "nodejs";

async function getUserId() {
  const session = await auth();
  return session?.user?.id;
}

async function getProfileData(userId: string) {
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      language: users.language,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRows[0]) {
    return null;
  }

  const googleRows = await db
    .select({
      provider: accounts.provider,
      accountId: accounts.providerAccountId,
    })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")))
    .limit(1);

  return {
    name: userRows[0].name ?? "",
    email: userRows[0].email,
    image: userRows[0].image,
    language: (userRows[0].language as Language) ?? "en",
    google: {
      connected: !!googleRows[0],
      accountLabel: userRows[0].name?.trim() || userRows[0].email,
    },
  };
}

export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getProfileData(userId);

  if (!data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    image?: string | null;
    language?: Language;
  };

  const values: {
    name?: string;
    email?: string;
    image?: string | null;
    language?: Language;
  } = {};

  if (typeof body.name === "string") {
    values.name = body.name.trim();
  }

  if (typeof body.email === "string") {
    const nextEmail = body.email.trim().toLowerCase();
    if (!nextEmail) {
      return NextResponse.json({ error: "Email cannot be empty" }, { status: 400 });
    }

    const duplicate = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, nextEmail), ne(users.id, userId)))
      .limit(1);

    if (duplicate[0]) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    values.email = nextEmail;
  }

  if (body.image === null || typeof body.image === "string") {
    values.image = body.image;
  }

  if (body.language && ["en", "vi", "jp"].includes(body.language)) {
    values.language = body.language;
  }

  await db.update(users).set(values).where(eq(users.id, userId));

  const data = await getProfileData(userId);
  return NextResponse.json({ data });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (provider !== "google") {
    return NextResponse.json({ error: "Only google disconnect is supported" }, { status: 400 });
  }

  await db
    .delete(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "google")));

  return NextResponse.json({ ok: true });
}
