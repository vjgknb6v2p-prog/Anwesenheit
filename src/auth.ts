import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { SESSION_MAX_AGE_MS } from "@/domain/session";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    ...authConfig.session,
    maxAge: SESSION_MAX_AGE_MS / 1000,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.active || user.deletedAt) {
          return null;
        }

        const validPassword = await verifyPassword(
          user.passwordHash,
          parsed.data.password,
        );

        if (!validPassword) {
          return null;
        }

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
