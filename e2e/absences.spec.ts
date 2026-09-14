import { expect, test, type Page } from "@playwright/test";
import { formatTime } from "../src/lib/time";
import { getQuickReturnOptions } from "../src/domain/quick-return-times";

// Nutzt die Seed-Daten aus prisma/seed.ts — die Testsuite setzt eine
// migrierte + geseedete Datenbank voraus (`pnpm db:push && pnpm db:seed`).
// Das Setting `curfewTime` ist im Seed auf "22:00" gesetzt (Default).
const CURFEW_TIME = "22:00";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("Schüler-Flow: Auschecken → Verlängern → Einchecken", () => {
  test("kompletter Ablauf inkl. Historie mit korrekter Dauer", async ({
    page,
  }) => {
    // finn.r@internat.de ist laut Seed initial ANWESEND.
    await login(page, "finn.r@internat.de", "Schueler!2026");
    await expect(page.getByText("Anwesend")).toBeVisible();

    // --- Auschecken ---
    const beforeCheckOut = new Date();
    await page.getByRole("button", { name: "AUSCHECKEN" }).click();
    await page.getByRole("button", { name: "Einkauf/Stadt" }).click();
    await page.getByLabel("Ziel").fill("Testcenter Stadtmitte");
    await page.getByRole("button", { name: "+2 h" }).click();
    await page.getByRole("button", { name: "Auschecken bestätigen" }).click();

    await expect(page.getByText("Abwesend", { exact: true })).toBeVisible();
    const expectedFirstReturn = getQuickReturnOptions(
      beforeCheckOut,
      CURFEW_TIME,
    )[0]!.value;
    await expect(
      page.getByText(`${formatTime(expectedFirstReturn)} Uhr`),
    ).toBeVisible();

    // Zweites Auschecken darf über die UI nicht möglich sein, solange die
    // Abwesenheit aktiv ist — der Button existiert dann schlicht nicht.
    await expect(page.getByRole("button", { name: "AUSCHECKEN" })).toHaveCount(
      0,
    );

    // --- Verlängern ---
    const beforeExtend = new Date();
    await page.getByRole("button", { name: "Abwesenheit verlängern" }).click();
    await page.getByRole("button", { name: "+4 h" }).click();
    await page.getByRole("button", { name: "Verlängern bestätigen" }).click();

    const expectedExtendedReturn = getQuickReturnOptions(
      beforeExtend,
      CURFEW_TIME,
    )[1]!.value;
    await expect(
      page.getByText(`${formatTime(expectedExtendedReturn)} Uhr`),
    ).toBeVisible();

    // --- Einchecken (ein Tap, keine Rückfrage) ---
    await page.getByRole("button", { name: "EINCHECKEN" }).click();
    await expect(
      page.getByText("Du bist erfolgreich eingecheckt."),
    ).toBeVisible();
    await expect(page.getByText("Anwesend", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "AUSCHECKEN" }),
    ).toBeVisible();

    // --- Historie: Eintrag mit korrekter Dauer ---
    await page.goto("/abwesenheiten");
    const entry = page.locator("li", { hasText: "Testcenter Stadtmitte" });
    await expect(entry.getByText("Abgeschlossen")).toBeVisible();
    await expect(entry.getByText(/Dauer: \d+min/)).toBeVisible();
  });
});

test.describe("Domänenregel: maximal eine aktive Abwesenheit", () => {
  test("zweites Auschecken bei aktiver Abwesenheit schlägt kontrolliert fehl", async ({
    context,
  }) => {
    // sara.l@internat.de ist laut Seed initial ANWESEND. Zwei Tabs mit
    // derselben (per Cookie geteilten) Sitzung simulieren zwei Geräte/Reiter,
    // von denen eines noch den veralteten ANWESEND-Zustand zeigt, nachdem im
    // anderen bereits ausgecheckt wurde — damit wird der serverseitige
    // Schutz (partieller Unique-Index) tatsächlich getestet, nicht nur das
    // Ausblenden des Buttons im UI.
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await login(pageA, "sara.l@internat.de", "Schueler!2026");
    await pageB.goto("/");
    await expect(
      pageB.getByRole("button", { name: "AUSCHECKEN" }),
    ).toBeVisible();

    await pageA.getByRole("button", { name: "AUSCHECKEN" }).click();
    await pageA.getByRole("button", { name: "Arzt", exact: true }).click();
    await pageA.getByLabel("Ziel").fill("Zahnarzt Nebenan");
    await pageA.getByRole("button", { name: "+2 h" }).click();
    await pageA.getByRole("button", { name: "Auschecken bestätigen" }).click();
    await expect(pageA.getByText("Abwesend", { exact: true })).toBeVisible();

    // pageB zeigt noch den alten ANWESEND-Stand und versucht ebenfalls
    // auszuchecken -> muss kontrolliert fehlschlagen, keine Exception.
    await pageB.getByRole("button", { name: "AUSCHECKEN" }).click();
    await pageB.getByRole("button", { name: "Heimfahrt" }).click();
    await pageB.getByLabel("Ziel").fill("Elternhaus");
    await pageB.getByRole("button", { name: "+2 h" }).click();
    await pageB.getByRole("button", { name: "Auschecken bestätigen" }).click();

    await expect(
      pageB.getByText("Du bist bereits abwesend gemeldet."),
    ).toBeVisible();

    await pageA.close();
    await pageB.close();
  });
});
