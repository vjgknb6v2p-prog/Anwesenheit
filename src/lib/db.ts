import { PrismaClient } from "@prisma/client";

// Next.js lädt Module im Dev-Server bei jedem Hot-Reload neu ein. Ohne dieses
// globalThis-Caching würde jede Änderung eine neue PrismaClient-Instanz (und
// damit einen neuen Connection-Pool) erzeugen, bis die DB-Verbindungen
// erschöpft sind. In Produktion existiert genau eine Instanz pro Prozess.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
