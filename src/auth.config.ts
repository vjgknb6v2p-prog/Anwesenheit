import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import {
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_MAX_AGE_MS,
  isSessionExpired,
} from "@/domain/session";
import { roleHomePath } from "@/lib/roles";
import type { Role } from "@prisma/client";

// Konfiguration ohne den Credentials-Provider (der Prisma + Argon2 braucht):
// `middleware.ts` verwendet nur diesen Teil und läuft — wie die Middleware
// selbst — in der Edge-Runtime. Deshalb bleibt auch der `jwt`/`session`-Teil
// hier bewusst frei von Node-only APIs (kein Prisma, kein pino-Logger; ein
// Versuch, die Middleware auf die Node.js-Runtime umzustellen, führte in
// dieser Next.js-Version dazu, dass sie beim Build komplett verschwand —
// siehe docs/decisions.md). `auth.ts` erweitert diese Konfiguration um den
// Credentials-Provider.
const PUBLIC_PATHS = [
  "/login",
  "/passwort-vergessen",
  "/passwort-zuruecksetzen",
  // Kein Browser mit Session, sondern externe Aufrufer mit eigener Auth:
  // /api/v1/cron/tick prüft `CRON_SECRET` selbst (Abschnitt 8). PWA-Anlagen
  // (Manifest, Icons, Service Worker, Offline-Fallback) müssen unabhängig
  // vom Login-Status ladbar sein — u. a., damit der Service Worker sie beim
  // Installieren cachen kann, bevor überhaupt eine Session existiert.
  "/api/v1/cron",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/sw.js",
  "/offline",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * `role`/`loginAt`/`lastActiveAt` lassen sich nicht global per
 * `declare module "next-auth/jwt"` auf den JWT-Typ augmentieren (siehe
 * src/types/next-auth.d.ts) — daher hier lokal per Intersection-Type.
 */
interface SessionMeta {
  role: Role;
  loginAt: number;
  lastActiveAt: number;
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  // Selbst gehostet hinter einem beliebigen Reverse Proxy/ohne festes
  // AUTH_URL (docker-compose-Betrieb, siehe README.md) — Auth.js muss dem
  // eingehenden Host-Header vertrauen, um die richtige Basis-URL abzuleiten.
  // Unkritisch hier, da ausschließlich der Credentials-Provider verwendet
  // wird (kein OAuth-Redirect-Flow, bei dem Host-Spoofing relevant wäre).
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const user = auth?.user;

      if (isPublicPath(nextUrl.pathname)) {
        if (user && nextUrl.pathname === "/login") {
          return NextResponse.redirect(
            new URL(roleHomePath(user.role), nextUrl),
          );
        }
        return true;
      }

      if (!user) {
        return false; // Auth.js leitet automatisch zu `pages.signIn` weiter.
      }

      // Grobe, request-seitige Rollenprüfung (Abschnitt 5: "Middleware allein
      // reicht nicht") — die Seiten selbst prüfen zusätzlich per
      // `requireRole()` aus src/lib/authz.ts.
      if (nextUrl.pathname.startsWith("/admin") && user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", nextUrl));
      }

      if (
        nextUrl.pathname.startsWith("/staff") &&
        user.role !== "STAFF" &&
        user.role !== "ADMIN"
      ) {
        return NextResponse.redirect(new URL("/", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      const now = Date.now();
      const t = token as typeof token & Partial<SessionMeta>;

      if (user) {
        // Erstanmeldung: Rolle übernehmen, Session-Uhr auf null stellen.
        t.role = user.role as Role;
        t.loginAt = now;
        t.lastActiveAt = now;
        return t;
      }

      const loginAt = t.loginAt ?? now;
      const lastActiveAt = t.lastActiveAt ?? now;

      if (
        isSessionExpired(
          new Date(loginAt),
          new Date(lastActiveAt),
          new Date(now),
          { maxAgeMs: SESSION_MAX_AGE_MS, idleMs: SESSION_IDLE_TIMEOUT_MS },
        )
      ) {
        // Absolute 8h-Grenze oder 60min-Idle-Timeout überschritten -> Token
        // ungültig machen. `null` ist laut Auth.js-Typdefinition der
        // vorgesehene Weg, eine Session zu invalidieren. Kein Logging hier:
        // diese Datei muss Edge-tauglich bleiben (siehe Kommentar oben).
        return null;
      }

      t.loginAt = loginAt;
      t.lastActiveAt = now; // rollierendes Idle-Fenster bei jeder Aktivität
      return t;
    },
    async session({ session, token }) {
      const t = token as typeof token & Partial<SessionMeta>;
      session.user.id = t.sub ?? "";
      session.user.role = t.role ?? "STUDENT";
      return session;
    },
  },
} satisfies NextAuthConfig;
