import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

// Reiner API-Test (kein Browser nötig) gegen /api/v1/cron/tick — verifiziert
// PROMPT.md Abschnitt 8/9 (Phase 6 DoD): "Cron-Tick zweimal hintereinander
// aufgerufen erzeugt keine Duplikate." jonas.k@internat.de ist laut Seed
// bereits deutlich überfällig (plannedReturnAt = Seed-Zeit - 2h), das reicht
// bei jeder plausiblen Karenzzeit (Default 10 min) aus, um deterministisch
// eine OVERDUE-Benachrichtigung sowie die Mitarbeiter-Sammelmeldung
// auszulösen — unabhängig davon, wann genau der Test läuft.
const db = new PrismaClient();

test.afterAll(async () => {
  await db.$disconnect();
});

test.describe("Cron-Tick", () => {
  test("lehnt Aufrufe ohne gültigen CRON_SECRET ab", async ({ request }) => {
    const withoutHeader = await request.get("/api/v1/cron/tick");
    expect(withoutHeader.status()).toBe(401);

    const wrongSecret = await request.get("/api/v1/cron/tick", {
      headers: { "x-cron-secret": "definitiv-falsch" },
    });
    expect(wrongSecret.status()).toBe(401);
  });

  test("zweimal hintereinander aufgerufen erzeugt keine Duplikate", async ({
    request,
  }) => {
    const secret = process.env.CRON_SECRET;
    test.skip(!secret, "CRON_SECRET nicht gesetzt (siehe .env.local)");

    const jonas = await db.user.findUniqueOrThrow({
      where: { email: "jonas.k@internat.de" },
    });

    const first = await request.get("/api/v1/cron/tick", {
      headers: { "x-cron-secret": secret! },
    });
    expect(first.ok()).toBeTruthy();

    const overdueAfterFirst = await db.notification.count({
      where: { userId: jonas.id, type: "OVERDUE" },
    });
    expect(overdueAfterFirst).toBe(1);

    const second = await request.get("/api/v1/cron/tick", {
      headers: { "x-cron-secret": secret! },
    });
    expect(second.ok()).toBeTruthy();
    const secondBody = (await second.json()) as {
      overdueNoticesSent: number;
    };
    // Der zweite Durchlauf darf für denselben Anlass nichts mehr anlegen.
    expect(secondBody.overdueNoticesSent).toBe(0);

    const overdueAfterSecond = await db.notification.count({
      where: { userId: jonas.id, type: "OVERDUE" },
    });
    expect(overdueAfterSecond).toBe(1);
  });
});
