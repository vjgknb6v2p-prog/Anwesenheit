import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

// Erweiterung "Gruppen-Sammelaktionen": eigene, im Test selbst angelegte
// Schüler (statt der 5 fixen Seed-Schüler, die bereits je einem anderen
// Spec "gehören", siehe e2e/staff.spec.ts) — vermeidet Seiteneffekte mit
// anderen Testdateien vollständig. Die Testnutzer werden am Ende soft-
// gelöscht (wie die Anwendung selbst löscht, siehe src/actions/admin-users.ts),
// kein Hard-Delete nötig.
const db = new PrismaClient();

test.afterAll(async () => {
  await db.$disconnect();
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL("/staff");
}

test.describe("Gruppen-Sammelaktionen", () => {
  test("Mitarbeiter checkt eine Gruppe gemeinsam aus und wieder ein", async ({
    page,
  }) => {
    const residentialArea = await db.residentialArea.findFirstOrThrow();
    const suffix = Date.now();
    const [studentA, studentB] = await Promise.all([
      db.user.create({
        data: {
          firstName: "Gruppentest",
          lastName: `A-${suffix}`,
          email: `gruppentest-a-${suffix}@internat.de`,
          passwordHash: "unused-e2e-fixture",
          role: "STUDENT",
          residentialAreaId: residentialArea.id,
        },
      }),
      db.user.create({
        data: {
          firstName: "Gruppentest",
          lastName: `B-${suffix}`,
          email: `gruppentest-b-${suffix}@internat.de`,
          passwordHash: "unused-e2e-fixture",
          role: "STUDENT",
          residentialAreaId: residentialArea.id,
        },
      }),
    ]);

    try {
      await login(page, "k.weber@internat.de", "Staff!2026");
      await page.goto("/staff/schueler?q=Gruppentest");

      await expect(page.getByText(`Gruppentest A-${suffix}`)).toBeVisible();
      await expect(page.getByText(`Gruppentest B-${suffix}`)).toBeVisible();

      await page.getByLabel(`Gruppentest A-${suffix} auswählen`).check();
      await page.getByLabel(`Gruppentest B-${suffix} auswählen`).check();

      await page.getByRole("button", { name: "Gruppen-Ausgang" }).click();
      await page.getByLabel("Ziel").fill("Sporthalle");
      const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
      const localValue = new Date(
        inOneHour.getTime() - inOneHour.getTimezoneOffset() * 60 * 1000,
      )
        .toISOString()
        .slice(0, 16);
      await page.getByLabel("Geplante Rückkehr").fill(localValue);
      await page.getByRole("button", { name: /Schüler auschecken/ }).click();

      await expect(
        page.getByText("2 Schüler erfolgreich bearbeitet."),
      ).toBeVisible();

      const rowA = page.getByRole("link", {
        name: new RegExp(`Gruppentest A-${suffix}`),
      });
      const rowB = page.getByRole("link", {
        name: new RegExp(`Gruppentest B-${suffix}`),
      });
      await expect(rowA.getByText("Abwesend")).toBeVisible();
      await expect(rowB.getByText("Abwesend")).toBeVisible();

      await page.getByLabel(`Gruppentest A-${suffix} auswählen`).check();
      await page.getByLabel(`Gruppentest B-${suffix} auswählen`).check();
      await page.getByRole("button", { name: "Gruppen-Rückkehr" }).click();
      await page.getByRole("button", { name: /Schüler einchecken/ }).click();

      await expect(
        page.getByText("2 Schüler erfolgreich bearbeitet."),
      ).toBeVisible();
      await expect(rowA.getByText("Anwesend")).toBeVisible();
      await expect(rowB.getByText("Anwesend")).toBeVisible();
    } finally {
      await db.user.updateMany({
        where: { id: { in: [studentA.id, studentB.id] } },
        data: { active: false, deletedAt: new Date() },
      });
    }
  });
});
