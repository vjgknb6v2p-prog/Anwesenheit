import { expect, test, type Page } from "@playwright/test";

// Nutzt die Seed-Daten aus prisma/seed.ts. finn.r@internat.de ist laut Seed
// initial ANWESEND und wird in e2e/absences.spec.ts am Ende des dortigen
// Tests wieder eingecheckt (also ebenfalls ANWESEND) — mit `workers: 1`
// (playwright.config.ts) laufen alle Tests strikt nacheinander, sodass
// finn.r zu Beginn dieses Tests garantiert ANWESEND ist, unabhängig davon,
// ob e2e/absences.spec.ts bereits gelaufen ist oder nicht.

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

async function readKpi(page: Page, testId: string): Promise<number> {
  const text = await page.getByTestId(testId).locator("p").last().innerText();
  return Number(text);
}

test.describe("Admin-Live-Übersicht", () => {
  test("Schüler checkt aus → Admin-KPI erhöht sich ohne Reload innerhalb von 2 s", async ({
    browser,
  }) => {
    const adminContext = await browser.newContext();
    const studentContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const studentPage = await studentContext.newPage();

    await login(adminPage, "admin@internat.de", "Admin!2026");
    await expect(adminPage).toHaveURL("/admin");
    await expect(
      adminPage.getByRole("heading", { name: "Live-Übersicht" }),
    ).toBeVisible();

    const abwesendBefore = await readKpi(adminPage, "kpi-abwesend");
    const anwesendBefore = await readKpi(adminPage, "kpi-anwesend");

    await login(studentPage, "finn.r@internat.de", "Schueler!2026");
    await expect(studentPage).toHaveURL("/");
    await expect(
      studentPage.getByText("Anwesend", { exact: true }),
    ).toBeVisible();

    await studentPage.getByRole("button", { name: "AUSCHECKEN" }).click();
    await studentPage
      .getByRole("button", { name: "Sportverein", exact: true })
      .click();
    await studentPage.getByLabel("Ziel").fill("Sporthalle Internat");
    await studentPage.getByRole("button", { name: "+2 h" }).click();
    await studentPage
      .getByRole("button", { name: "Auschecken bestätigen" })
      .click();
    await expect(
      studentPage.getByText("Abwesend", { exact: true }),
    ).toBeVisible();

    // Kein page.reload()/goto() auf der Admin-Seite — die Aktualisierung
    // muss allein über SSE erfolgen. `toPass` pollt die Assertion, bis sie
    // zutrifft oder das Timeout erreicht ist (PROMPT.md Abschnitt 7: "...
    // innerhalb von 2 Sekunden").
    await expect(async () => {
      expect(await readKpi(adminPage, "kpi-abwesend")).toBe(abwesendBefore + 1);
      expect(await readKpi(adminPage, "kpi-anwesend")).toBe(anwesendBefore - 1);
    }).toPass({ timeout: 2000 });

    await expect(
      adminPage.getByRole("cell", { name: "Finn Richter" }),
    ).toBeVisible();

    await adminContext.close();
    await studentContext.close();
  });
});
