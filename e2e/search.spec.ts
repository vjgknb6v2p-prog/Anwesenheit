import { expect, test, type Page } from "@playwright/test";

// Reiner Lese-Rauchtest (keine Mutationen an Seed-Nutzern) für die
// Erweiterung "Globale Suche".

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

test.describe("Globale Suche", () => {
  test("Mitarbeiter findet einen Schüler über die Kopfzeilen-Suche", async ({
    page,
  }) => {
    await login(page, "k.weber@internat.de", "Staff!2026", "/staff");

    await page.getByLabel("Globale Suche").fill("Lena");
    await page.getByLabel("Globale Suche").press("Enter");

    await expect(page).toHaveURL(/\/staff\/suche\?q=Lena/);
    await expect(page.getByRole("link", { name: /Lena Bauer/ })).toBeVisible();

    await page.getByRole("link", { name: /Lena Bauer/ }).click();
    await expect(page).toHaveURL(/\/staff\/schueler\//);
  });

  test("Admin findet Schüler und Mitarbeiter gruppiert", async ({ page }) => {
    await login(page, "admin@internat.de", "Admin!2026", "/admin");

    await page.getByLabel("Globale Suche").fill("a");
    await page.getByLabel("Globale Suche").press("Enter");

    await expect(page).toHaveURL(/\/admin\/suche\?q=a/);
    await expect(
      page.getByRole("heading", { name: /^Schüler \(\d+\)$/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Mitarbeiter \(\d+\)$/ }),
    ).toBeVisible();
  });

  test("leere Suche zeigt einen Hinweis statt aller Nutzer", async ({
    page,
  }) => {
    await login(page, "admin@internat.de", "Admin!2026", "/admin");
    await page.goto("/admin/suche");

    await expect(page.getByText("Suche nach Name oder E-Mail")).toBeVisible();
  });
});
