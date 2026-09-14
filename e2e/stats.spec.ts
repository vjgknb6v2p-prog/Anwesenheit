import { expect, test, type Page } from "@playwright/test";

// Reiner Lese-Rauchtest (keine Mutationen an Seed-Nutzern) — PROMPT.md
// Abschnitt 9 (Phase 5) verlangt für die DoD nur Unit-Tests gegen
// src/domain/stats.ts und "Diagramme responsiv"; dieser Test prüft
// zusätzlich, dass die Statistik-Seiten gegen die echte (geseedete) DB ohne
// Fehler rendern und die Rechte-Matrix (Mitarbeiter: nur eigener
// Wohnbereich) eingehalten wird.

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

test.describe("Statistiken", () => {
  test("Admin sieht Statistiken über alle Wohnbereiche mit Diagrammen", async ({
    page,
  }) => {
    await login(page, "admin@internat.de", "Admin!2026", "/admin");
    await page.goto("/admin/statistiken?from=2000-01-01&to=2100-01-01");

    await expect(
      page.getByRole("heading", { name: "Statistiken" }),
    ).toBeVisible();
    await expect(page.getByText("Abwesenheiten gesamt")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Abwesenheiten pro/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Häufigste Gründe" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ausgänge pro Schüler" }),
    ).toBeVisible();
    await expect(page.getByLabel("Wohnbereich")).toBeVisible();
  });

  test("Mitarbeiter sieht Statistiken nur für den eigenen Wohnbereich, ohne Filter-Dropdown", async ({
    page,
  }) => {
    await login(page, "k.weber@internat.de", "Staff!2026", "/staff");
    await page.goto("/staff/statistiken?from=2000-01-01&to=2100-01-01");

    await expect(
      page.getByRole("heading", { name: "Statistiken" }),
    ).toBeVisible();
    await expect(page.getByText("Wohnbereich: Haus Nord")).toBeVisible();
    await expect(page.getByLabel("Wohnbereich")).toHaveCount(0);
  });
});
