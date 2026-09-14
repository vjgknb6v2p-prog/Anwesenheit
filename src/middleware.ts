import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Nutzt bewusst nur `authConfig` (ohne Credentials-Provider), damit Prisma
// und Argon2 nicht unnötig ins Middleware-Bundle gezogen werden. Middleware
// läuft in der Edge-Runtime, daher enthält `authConfig` (inkl. der
// `jwt`/`session`-Callbacks) ausschließlich Edge-taugliche Logik.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
