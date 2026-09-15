/**
 * Lasttest-Skript für den Alltags-Spitzenfall (PROMPT.md Abschnitt 1: "ca.
 * 150 Schüler", Abschnitt 9 Phase 8: "Lasttest-Notiz"). Kein synthetischer
 * HTTP-Benchmark gegen die komplette Next.js/Auth.js-Kette (dafür bräuchte
 * es eine echte Session pro virtuellem Nutzer inkl. CSRF-Handling), sondern
 * eine direkte, realistische Messung der eigentlich kritischen Ressource:
 * PostgreSQL unter der Schreiblast, die `checkOutAction`/`checkInAction`
 * (src/actions/absences.ts) und `getLiveOverviewSnapshot`
 * (src/lib/admin-queries.ts) tatsächlich erzeugen — dieselben Prisma-Calls,
 * nur ohne den (für die DB-Last irrelevanten) Auth-Overhead drumherum. Siehe
 * docs/decisions.md ("Phase 8") und docs/lasttest.md für die Ergebnisse.
 *
 * Aufruf: `pnpm exec tsx scripts/lasttest.ts` (optional: `LASTTEST_COUNT=300`).
 * Räumt alle selbst angelegten Testdaten am Ende wieder auf — verändert die
 * Seed-/Demo-Daten aus `prisma/seed.ts` nicht.
 */
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { getLiveOverviewSnapshot } from "../src/lib/admin-queries";

const COUNT = Number(process.env.LASTTEST_COUNT ?? 150);
const ADMIN_POLL_CLIENTS = 10;
const EMAIL_PREFIX = "lasttest-";
const UNIQUE_VIOLATION = "P2002";

interface Timing {
  ok: boolean;
  ms: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[index]!;
}

function report(label: string, timings: Timing[]) {
  const ok = timings.filter((t) => t.ok);
  const failed = timings.length - ok.length;
  const durations = ok.map((t) => t.ms).sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  console.log(`\n--- ${label} ---`);
  console.log(
    `  n=${timings.length}  erfolgreich=${ok.length}  fehler=${failed}`,
  );
  if (durations.length > 0) {
    console.log(
      `  p50=${percentile(durations, 50).toFixed(1)}ms  p95=${percentile(durations, 95).toFixed(1)}ms  p99=${percentile(durations, 99).toFixed(1)}ms  max=${durations[durations.length - 1]!.toFixed(1)}ms  avg=${(sum / durations.length).toFixed(1)}ms`,
    );
  }
}

async function timed(fn: () => Promise<void>): Promise<Timing> {
  const start = performance.now();
  try {
    await fn();
    return { ok: true, ms: performance.now() - start };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      return { ok: false, ms: performance.now() - start };
    }
    throw error;
  }
}

async function main() {
  console.log(
    `Lasttest: ${COUNT} Schüler (Checkout/Checkin-Burst) + ${ADMIN_POLL_CLIENTS} parallele Live-Übersicht-Snapshots\n`,
  );

  console.log("Lege temporäre Testnutzer an …");
  const passwordHash = await hashPassword("Lasttest!2026");
  await db.user.createMany({
    data: Array.from({ length: COUNT }, (_, i) => ({
      firstName: "Lasttest",
      lastName: `Schüler ${i}`,
      email: `${EMAIL_PREFIX}${i}@lasttest.local`,
      passwordHash,
      role: "STUDENT" as const,
    })),
  });
  const users = await db.user.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });

  // Ein eigener, kleiner Nutzer-Pool für den Contention-Test (Schritt 2) —
  // die müssen beim Doppel-Tap noch *keine* aktive Abwesenheit haben, sonst
  // scheitern beide gleichzeitigen Versuche an one_active_absence statt nur
  // einer davon (das wäre ein falsch-positiver Fehlschlag dieses Tests).
  const contentionSubset = users.slice(0, Math.min(30, users.length));
  const burstUsers = users.slice(contentionSubset.length);

  try {
    // 1) Checkout-Burst: alle übrigen Schüler checken im selben Moment aus
    // (schlimmster realistischer Fall — Ausgang nach Unterricht/am Wochenende).
    const checkoutTimings = await Promise.all(
      burstUsers.map((user) =>
        timed(async () => {
          await db.absence.create({
            data: {
              userId: user.id,
              checkedOutAt: new Date(),
              plannedReturnAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
              reason: "EINKAUF_STADT",
              destination: "Lasttest-Ziel",
              status: "ACTIVE",
            },
          });
          await db.auditLog.create({
            data: {
              actorId: user.id,
              action: "CHECK_OUT",
              targetUserId: user.id,
              targetType: "Absence",
            },
          });
        }),
      ),
    );
    report(
      `Checkout-Burst (${burstUsers.length} gleichzeitig, je 1 Absence-Insert + 1 Audit-Log-Insert)`,
      checkoutTimings,
    );

    // 2) Contention-Burst: ein separater Teil der Schüler versucht (z. B.
    // Doppel-Tap durch eine wackelige Verbindung) zweimal gleichzeitig
    // auszuchecken. Erwartung: pro Nutzer genau 1 Erfolg, 1 kontrollierter
    // P2002-Fehler (one_active_absence hält auch unter echter Nebenläufigkeit).
    const contentionResults = await Promise.all(
      contentionSubset.map(async (user) => {
        const [a, b] = await Promise.all([
          timed(() =>
            db.absence
              .create({
                data: {
                  userId: user.id,
                  checkedOutAt: new Date(),
                  plannedReturnAt: new Date(Date.now() + 60 * 60 * 1000),
                  reason: "SPORT_VEREIN",
                  destination: "Lasttest-Doppel-Tap",
                  status: "ACTIVE",
                },
              })
              .then(() => undefined),
          ),
          timed(() =>
            db.absence
              .create({
                data: {
                  userId: user.id,
                  checkedOutAt: new Date(),
                  plannedReturnAt: new Date(Date.now() + 60 * 60 * 1000),
                  reason: "SPORT_VEREIN",
                  destination: "Lasttest-Doppel-Tap",
                  status: "ACTIVE",
                },
              })
              .then(() => undefined),
          ),
        ]);
        return [a, b];
      }),
    );
    const flatContention = contentionResults.flat();
    const contentionOk = flatContention.filter((t) => t.ok).length;
    console.log(
      `\n--- Contention-Burst (${contentionSubset.length} Schüler × 2 gleichzeitige Auscheck-Versuche) ---`,
    );
    console.log(
      `  erwartet: ${contentionSubset.length} Erfolge, ${contentionSubset.length} kontrollierte Fehler — gemessen: ${contentionOk} Erfolge, ${flatContention.length - contentionOk} Fehler`,
    );
    if (contentionOk !== contentionSubset.length) {
      throw new Error(
        "one_active_absence hat unter Nebenläufigkeit nicht wie erwartet gehalten — siehe Contention-Burst-Ausgabe.",
      );
    }

    // 3) Admin-Live-Übersicht: mehrere Admin-Sessions pollen gleichzeitig
    // (SSE-Handler pollt alle 1,5s serverseitig, siehe
    // src/app/api/v1/stream/route.ts) — genau jetzt ist die absences-Tabelle
    // durch Schritt 1+2 auf Spitzenlast.
    const overviewTimings = await Promise.all(
      Array.from({ length: ADMIN_POLL_CLIENTS }, () =>
        timed(async () => {
          await getLiveOverviewSnapshot();
        }),
      ),
    );
    report(
      `Admin-Live-Übersicht (${ADMIN_POLL_CLIENTS} gleichzeitige getLiveOverviewSnapshot()-Aufrufe)`,
      overviewTimings,
    );

    // 4) Checkin-Burst: alle N Schüler kommen im selben Moment zurück
    // (Nachtruhe-Deadline).
    const activeAbsences = await db.absence.findMany({
      where: { userId: { in: users.map((u) => u.id) }, status: "ACTIVE" },
      select: { id: true, userId: true },
    });
    const checkinTimings = await Promise.all(
      activeAbsences.map((absence) =>
        timed(async () => {
          await db.absence.update({
            where: { id: absence.id },
            data: { checkedInAt: new Date(), status: "COMPLETED" },
          });
          await db.auditLog.create({
            data: {
              actorId: absence.userId,
              action: "CHECK_IN",
              targetUserId: absence.userId,
              targetType: "Absence",
              targetId: absence.id,
            },
          });
        }),
      ),
    );
    report(
      `Checkin-Burst (${activeAbsences.length} gleichzeitig, je 1 Absence-Update + 1 Audit-Log-Insert)`,
      checkinTimings,
    );
  } finally {
    console.log("\nRäume temporäre Testdaten auf …");
    const userIds = users.map((u) => u.id);
    await db.auditLog.deleteMany({
      where: {
        OR: [{ actorId: { in: userIds } }, { targetUserId: { in: userIds } }],
      },
    });
    await db.absence.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    console.log("Aufgeräumt.");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
