import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

// Erweiterung "Beurlaubungsschein-PDF". Rein lesender Test — nutzt die
// aktiven Abwesenheiten der Seed-Schüler lena.b (rechtzeitig abwesend) und
// jonas.k (überfällig), ohne sie zu verändern, daher unabhängig von der
// Ausführungsreihenfolge anderer Spec-Dateien sicher.
const db = new PrismaClient();

test.afterAll(async () => {
  await db.$disconnect();
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe("Beurlaubungsschein", () => {
  test("Mitarbeiter kann den Schein eines beliebigen Schülers öffnen", async ({
    page,
  }) => {
    const lena = await db.user.findUniqueOrThrow({
      where: { email: "lena.b@internat.de" },
    });
    const absence = await db.absence.findFirstOrThrow({
      where: { userId: lena.id, status: "ACTIVE" },
    });

    await login(page, "k.weber@internat.de", "Staff!2026");
    await page.goto(`/beurlaubungsschein/${absence.id}`);

    await expect(
      page.getByRole("heading", { name: "Beurlaubungsschein" }),
    ).toBeVisible();
    await expect(page.getByText("Lena Bauer")).toBeVisible();
  });

  test("Schüler kann den eigenen Schein öffnen", async ({ page }) => {
    const lena = await db.user.findUniqueOrThrow({
      where: { email: "lena.b@internat.de" },
    });
    const absence = await db.absence.findFirstOrThrow({
      where: { userId: lena.id, status: "ACTIVE" },
    });

    await login(page, "lena.b@internat.de", "Schueler!2026");
    await page.goto(`/beurlaubungsschein/${absence.id}`);

    await expect(
      page.getByRole("heading", { name: "Beurlaubungsschein" }),
    ).toBeVisible();
    await expect(page.getByText("Lena Bauer")).toBeVisible();
  });

  test("Schüler wird von einem fremden Schein weggeleitet", async ({
    page,
  }) => {
    const jonas = await db.user.findUniqueOrThrow({
      where: { email: "jonas.k@internat.de" },
    });
    const absence = await db.absence.findFirstOrThrow({
      where: { userId: jonas.id, status: "ACTIVE" },
    });

    await login(page, "lena.b@internat.de", "Schueler!2026");
    await page.goto(`/beurlaubungsschein/${absence.id}`);

    await expect(page).toHaveURL("/");
  });
});
