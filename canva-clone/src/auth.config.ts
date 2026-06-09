import { z } from "zod";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import { eq } from "drizzle-orm";
import { JWT } from "next-auth/jwt";
import type { AdapterAccountType } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { db } from "@/db/drizzle";
import { accounts, users } from "@/db/schema";

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  remember: z.union([z.literal("1"), z.literal("0")]).optional(),
});

declare module "next-auth/jwt" {
  interface JWT {
    id: string | undefined;
    rememberMe?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string | undefined;
    rememberMe?: boolean;
  }
}

type AuthorizedUser = {
  id: string;
  rememberMe?: boolean;
};

const DEMO_ACCOUNTS = [
  { email: "demo.a@canvar.com", password: "demo123", name: "Demo Account A" },
  { email: "demo.b@canvar.com", password: "demo123", name: "Demo Account B" },
];

export default {
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(credentials) {
        const validatedFields = CredentialsSchema.safeParse(credentials);
        if (!validatedFields.success) return null;

        const { email, password, remember } = validatedFields.data;
        const rememberMe = remember !== "0";

        // Auto-create demo accounts on first login
        const demo = DEMO_ACCOUNTS.find((d) => d.email === email);
        if (demo && password === demo.password) {
          const existing = await db.select().from(users).where(eq(users.email, email));
          if (!existing[0]) {
            const hashed = await bcrypt.hash(demo.password, 12);
            await db.insert(users).values({ email: demo.email, name: demo.name, password: hashed });
          }
        }

        const query = await db.select().from(users).where(eq(users.email, email));
        const user = query[0];

        if (!user || !user.password) return null;

        const passwordsMatch = await bcrypt.compare(password, user.password);
        if (!passwordsMatch) return null;

        // Auto-link a Google account record with the same email for profile connectivity.
        await db
          .insert(accounts)
          .values({
            userId: user.id,
            type: "oauth" as AdapterAccountType,
            provider: "google",
            providerAccountId: email,
          })
          .onConflictDoNothing();

        return {
          ...user,
          rememberMe,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        const authorizedUser = user as AuthorizedUser;
        if (typeof authorizedUser.rememberMe === "boolean") {
          token.rememberMe = authorizedUser.rememberMe;
          token.exp = Math.floor(Date.now() / 1000) + (authorizedUser.rememberMe ? 30 : 1) * 24 * 60 * 60;
        }
      }

      if (!token.id && token.email) {
        const query = await db.select().from(users).where(eq(users.email, token.email));
        if (query[0]) {
          token.id = query[0].id;
        }
      }

      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      return token;
    },
  },
} satisfies NextAuthConfig;
