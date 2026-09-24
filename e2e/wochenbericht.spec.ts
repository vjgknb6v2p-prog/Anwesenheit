import { expect, test, type Page } from "@playwright/test";

// Reiner Lese-Rauchtest (keine Mutationen an Seed-Nutzern), analog zu
// e2e/stats.spec.ts: prüft, dass die Wochenbericht-Seiten gegen die echte
// (geseedete) DB ohne Fehler rendern und die Rechte-Matrix (Mitarbeiter: nur
// eigener Wohnbereich, kein Wohnbereichs-Filter) eingehalten wird.

async function login(
  page: Page,
  email: string,
  password: string,
  expectedUrl: string,
) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(expectedUrl);
}

test.describe("Wochenbericht", () => {
  test("Admin sieht den Wochenbericht über alle Wohnbereiche mit Wohnbereichs-Filter", async ({
    page,
  }) => {
    await login(page, "admin@internat.de", "Admin!2026", "/admin");
    await page.goto("/admin/wochenbericht");

    await expect(
      page.getByRole("heading", { name: "Wochenbericht" }),
    ).toBeVisible();
    await expect(
      page.locator("p", { hasText: "Alle Wohnbereiche" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Abwesenheiten pro Tag" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Drucken / Als PDF speichern" }),
    ).toBeVisible();
    await expect(page.getByLabel("Wohnbereich")).toBeVisible();
  });

  test("Mitarbeiter sieht den Wochenbericht nur für den eigenen Wohnbereich, ohne Filter", async ({
    page,
  }) => {
    await login(page, "k.weber@internat.de", "Staff!2026", "/staff");
    await page.goto("/staff/wochenbericht");

    await expect(
      page.getByRole("heading", { name: "Wochenbericht" }),
    ).toBeVisible();
    await expect(page.getByText("Haus Nord")).toBeVisible();
    await expect(page.getByLabel("Wohnbereich")).toHaveCount(0);
  });

  test("Wochen-Navigation wechselt den Zeitraum", async ({ page }) => {
    await login(page, "admin@internat.de", "Admin!2026", "/admin");
    await page.goto("/admin/wochenbericht");

    const weekLabelLocator = page.locator("p", {
      hasText: /Alle Wohnbereiche/,
    });
    const initialLabel = await weekLabelLocator.textContent();

    await page.getByRole("link", { name: "← Vorherige Woche" }).click();
    await expect(weekLabelLocator).not.toHaveText(initialLabel ?? "");
  });
});
