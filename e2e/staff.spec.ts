import { Prisma, PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

// Nutzt die Seed-Daten aus prisma/seed.ts. Ergänzend werden Audit-Log-
// Einträge direkt per Prisma verifiziert, da eine Admin-Audit-Log-Ansicht
// laut PROMPT.md Abschnitt 6 erst in Phase 4 vorgesehen ist (siehe
// docs/decisions.md).
const db = new PrismaClient();

test.afterAll(async () => {
  await db.$disconnect();
});

/** Pollt kurz, um unter Last (paralleler Testlauf) keine Flakiness durch
 * minimale Verzögerung zwischen Server-Action-Antwort und DB-Sichtbarkeit
 * für die separate Test-Verbindung zu riskieren. */
async function waitForAuditLog(where: Prisma.AuditLogWhereInput) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const row = await db.auditLog.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });
    if (row) {
      return row;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL("/staff");
}

test.describe("Übersicht abwesend/überfällig", () => {
  test("überfällige Schüler erscheinen nur in der Überfällig-Liste", async ({
    page,
  }) => {
    await login(page, "k.weber@internat.de", "Staff!2026");

    await page.goto("/staff/ueberfaellig");
    await expect(page.getByText("Jonas Klein")).toBeVisible();

    await page.goto("/staff/abwesend");
    await expect(page.getByText("Jonas Klein")).toHaveCount(0);
    // lena.b ist laut Seed rechtzeitig abwesend (nicht überfällig).
    await expect(page.getByText("Lena Bauer")).toBeVisible();
  });
});

test.describe("Korrektur mit Audit-Log", () => {
  test("Mitarbeiter korrigiert eine Rückkehrzeit → Audit-Log enthält Vorher/Nachher", async ({
    page,
  }) => {
    const lena = await db.user.findUniqueOrThrow({
      where: { email: "lena.b@internat.de" },
    });
    const absenceBefore = await db.absence.findFirstOrThrow({
      where: { userId: lena.id, status: "ACTIVE" },
    });

    await login(page, "k.weber@internat.de", "Staff!2026");
    await page.goto(`/staff/schueler/${lena.id}`);
    // Lena hat laut Seed zusätzlich zufällige historische Abwesenheiten mit
    // jeweils eigenem "Bearbeiten"-Button — deshalb gezielt auf den Button
    // innerhalb des "Aktuelle Abwesenheit"-Abschnitts eingrenzen statt auf
    // den ersten Treffer der ganzen Seite zu vertrauen.
    const activeSection = page
      .locator("section", { hasText: "Aktuelle Abwesenheit" })
      .first();
    await expect(activeSection).toBeVisible();

    await activeSection.getByRole("button", { name: "Bearbeiten" }).click();

    // `<input type="datetime-local">` hat nur Minutenauflösung — die
    // erwartete neue Zeit muss dieselbe Rundung erfahren wie der Wert, der
    // tatsächlich durchs Formular geht.
    const basePlanned = new Date(absenceBefore.plannedReturnAt);
    basePlanned.setSeconds(0, 0);
    const newReturn = new Date(basePlanned.getTime() + 60 * 60 * 1000);
    const localValue = new Date(
      newReturn.getTime() - newReturn.getTimezoneOffset() * 60 * 1000,
    )
      .toISOString()
      .slice(0, 16);

    await page.getByLabel("Geplante Rückkehr").fill(localValue);
    await page.getByRole("button", { name: "Korrektur speichern" }).click();

    // Sheet schließt sich nach Erfolg.
    await expect(
      page.getByRole("button", { name: "Korrektur speichern" }),
    ).toHaveCount(0);

    const auditLog = await waitForAuditLog({
      action: "CORRECT_ABSENCE",
      targetId: absenceBefore.id,
    });

    expect(auditLog).not.toBeNull();
    const metadata = auditLog?.metadata as {
      before: { plannedReturnAt: string };
      after: { plannedReturnAt: string };
    };
    expect(metadata.before.plannedReturnAt).toBe(
      absenceBefore.plannedReturnAt.toISOString(),
    );
    expect(new Date(metadata.after.plannedReturnAt).getTime()).toBe(
      newReturn.getTime(),
    );
  });
});

test.describe("Fremd-Einchecken", () => {
  test("Mitarbeiter checkt einen Schüler stellvertretend ein", async ({
    page,
  }) => {
    // mia.h wird in keinem anderen E2E-Test verändert (finn.r z. B. wird
    // bereits von e2e/absences.spec.ts mutiert) — eigener Schüler pro Test
    // vermeidet Seiteneffekte zwischen parallel laufenden Testdateien.
    const mia = await db.user.findUniqueOrThrow({
      where: { email: "mia.h@internat.de" },
    });
    // mia.h ist laut Seed initial ANWESEND — für diesen Test aktiv auschecken.
    const absence = await db.absence.create({
      data: {
        userId: mia.id,
        checkedOutAt: new Date(),
        plannedReturnAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        reason: "SPORT_VEREIN",
        destination: "Sportplatz",
        status: "ACTIVE",
      },
    });

    await login(page, "k.weber@internat.de", "Staff!2026");
    await page.goto(`/staff/schueler/${mia.id}`);
    await expect(page.getByText("Aktuelle Abwesenheit")).toBeVisible();
    await page.getByRole("button", { name: "Einchecken" }).click();

    await expect(page.getByText("Aktuelle Abwesenheit")).toHaveCount(0);
    await expect(page.getByText("Anwesend", { exact: true })).toBeVisible();

    const updated = await db.absence.findUniqueOrThrow({
      where: { id: absence.id },
    });
    expect(updated.status).toBe("COMPLETED");
    expect(updated.checkedInById).not.toBeNull();
  });
});
