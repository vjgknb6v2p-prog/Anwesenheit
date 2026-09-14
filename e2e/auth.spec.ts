import { expect, test } from "@playwright/test";

// Nutzt die Seed-Daten aus prisma/seed.ts (siehe PROMPT.md Abschnitt 10) —
// die Testsuite setzt eine migrierte + geseedete Datenbank voraus
// (`pnpm db:push && pnpm db:seed`), siehe README.md.

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

test.describe("Nicht angemeldet", () => {
  for (const path of ["/", "/staff", "/admin"]) {
    test(`Zugriff auf ${path} führt zu /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Login je Rolle", () => {
  test("Schüler landet nach Login auf /", async ({ page }) => {
    await login(page, "lena.b@internat.de", "Schueler!2026");
    await expect(page).toHaveURL("/");
    // lena.b ist laut Seed aktiv (rechtzeitig) abwesend — Dashboard-Inhalt
    // ist daher rollenspezifisch, nicht der Login-Rolle-Redirect-Test hier
    // relevant; nur das erfolgreiche Rendern des Schüler-Dashboards zählt.
    await expect(page.getByText("Lena", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Historie" })).toBeVisible();
  });

  test("Mitarbeiter landet nach Login auf /staff", async ({ page }) => {
    await login(page, "k.weber@internat.de", "Staff!2026");
    await expect(page).toHaveURL("/staff");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Überfällig" })).toBeVisible();
  });

  test("Admin landet nach Login auf /admin", async ({ page }) => {
    await login(page, "admin@internat.de", "Admin!2026");
    await expect(page).toHaveURL("/admin");
    await expect(
      page.getByRole("heading", { name: "Live-Übersicht" }),
    ).toBeVisible();
  });

  test("Falsches Passwort zeigt Fehlermeldung ohne Redirect", async ({
    page,
  }) => {
    await login(page, "lena.b@internat.de", "falsches-passwort");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText("E-Mail oder Passwort ist falsch."),
    ).toBeVisible();
  });
});

test.describe("RBAC: Schüler darf /admin nicht sehen", () => {
  test("Schüler wird von /admin weggeleitet, keine Admin-Inhalte im Response", async ({
    page,
  }) => {
    await login(page, "jonas.k@internat.de", "Schueler!2026");
    await expect(page).toHaveURL("/");

    const response = await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);

    // Kein Datenleck: Der tatsächlich ausgelieferte Response-Body darf keine
    // admin-spezifischen Inhalte enthalten (nicht nur clientseitig verstecken).
    const body = await response?.text();
    expect(body ?? "").not.toContain("Live-Übersicht");
    expect(body ?? "").not.toContain("Rolle: Admin");
  });
});
