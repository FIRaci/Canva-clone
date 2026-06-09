import { z } from "zod";
import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { AdapterAccountType } from "next-auth/adapters";

import { db } from "@/db/drizzle";
import { accounts, users, verificationTokens } from "@/db/schema";
import { sendForgotPasswordOtpEmail } from "@/lib/mailer";

const app = new Hono()
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(3).max(20),
        language: z.string().optional(),
      })
    ),
    async (c) => {
      const { name, email, password, language } = c.req.valid("json");

      const hashedPassword = await bcrypt.hash(password, 12);

      const query = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (query[0]) {
        return c.json({ error: "Email already in use" }, 400);
      }

      const createdUsers = await db.insert(users).values({
        email,
        name,
        password: hashedPassword,
        language: language ?? "en",
      }).returning({ id: users.id });

      const createdUser = createdUsers[0];

      if (createdUser?.id) {
        await db
          .insert(accounts)
          .values({
            userId: createdUser.id,
            type: "oauth" as AdapterAccountType,
            provider: "google",
            providerAccountId: email,
          })
          .onConflictDoNothing();
      }
      
      return c.json(null, 200);
    },
  )
  .post(
    "/forgot-password",
    zValidator("json", z.object({ email: z.string().email() })),
    async (c) => {
      const { email } = c.req.valid("json");

      const query = await db.select().from(users).where(eq(users.email, email));
      if (!query[0]) {
        // Don't reveal if email exists
        return c.json({ ok: true }, 200);
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
      await db.insert(verificationTokens).values({ identifier: email, token: otp, expires });

      try {
        await sendForgotPasswordOtpEmail(email, otp);
      } catch (error) {
        console.error("Failed to send OTP email:", error);
        return c.json({ error: "Could not send OTP email" }, 500);
      }

      return c.json({ ok: true }, 200);
    },
  )
  .post(
    "/reset-password",
    zValidator("json", z.object({
      email: z.string().email(),
      otp: z.string().length(6),
      newPassword: z.string().min(3).max(20),
    })),
    async (c) => {
      const { email, otp, newPassword } = c.req.valid("json");

      const record = await db.select().from(verificationTokens).where(
        and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, otp))
      );

      if (!record[0]) return c.json({ error: "Mã OTP không hợp lệ" }, 400);
      if (record[0].expires < new Date()) return c.json({ error: "Mã OTP đã hết hạn" }, 400);

      const hashed = await bcrypt.hash(newPassword, 12);
      await db.update(users).set({ password: hashed }).where(eq(users.email, email));
      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

      return c.json({ ok: true }, 200);
    },
  );

export default app;
