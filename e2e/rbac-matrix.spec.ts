import { expect, test, type Page } from "@playwright/test";

// PROMPT.md Abschnitt 9 (Phase 7 DoD): "Test, der für jede Rolle jeden
// geschützten Endpunkt durchprobiert und die Matrix aus Abschnitt 5
// verifiziert." Deckt alle Seiten aller drei Rollenbereiche ab und prüft
// pro Rolle (inkl. nicht angemeldet), ob genau die laut Rechte-Matrix
// erlaubten Seiten erreichbar sind — alle anderen müssen kontrolliert
// weggeleitet werden (nie ein Datenleck über eine gerenderte, eigentlich
// verbotene Seite).

type Role = "STUDENT" | "STAFF" | "ADMIN";

interface ProtectedRoute {
  path: string;
  allowedRoles: Role[];
}

const ROUTES: ProtectedRoute[] = [
  // Schüler
  { path: "/", allowedRoles: ["STUDENT"] },
  { path: "/abwesenheiten", allowedRoles: ["STUDENT"] },
  { path: "/nachrichten", allowedRoles: ["STUDENT"] },
  { path: "/benachrichtigungen", allowedRoles: ["STUDENT"] },
  { path: "/profil", allowedRoles: ["STUDENT"] },
  // Mitarbeiter (Admin hat laut Rechte-Matrix überall denselben Zugriff)
  { path: "/staff", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/abwesend", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/ueberfaellig", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/schueler", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/historie", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/kalender", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/statistiken", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/wochenbericht", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/suche", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/nachrichten", allowedRoles: ["STAFF", "ADMIN"] },
  { path: "/staff/benachrichtigungen", allowedRoles: ["STAFF", "ADMIN"] },
  // Admin
  { path: "/admin", allowedRoles: ["ADMIN"] },
  { path: "/admin/schueler", allowedRoles: ["ADMIN"] },
  { path: "/admin/mitarbeiter", allowedRoles: ["ADMIN"] },
  { path: "/admin/abwesenheiten", allowedRoles: ["ADMIN"] },
  { path: "/admin/kalender", allowedRoles: ["ADMIN"] },
  { path: "/admin/statistiken", allowedRoles: ["ADMIN"] },
  { path: "/admin/wochenbericht", allowedRoles: ["ADMIN"] },
  { path: "/admin/suche", allowedRoles: ["ADMIN"] },
  { path: "/admin/nachrichten", allowedRoles: ["ADMIN"] },
  { path: "/admin/benachrichtigungen", allowedRoles: ["ADMIN"] },
  { path: "/admin/audit", allowedRoles: ["ADMIN"] },
  { path: "/admin/wohnbereiche", allowedRoles: ["ADMIN"] },
  { path: "/admin/einstellungen", allowedRoles: ["ADMIN"] },
];

const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  STUDENT: { email: "lena.b@internat.de", password: "Schueler!2026" },
  STAFF: { email: "k.weber@internat.de", password: "Staff!2026" },
  ADMIN: { email: "admin@internat.de", password: "Admin!2026" },
};

async function login(page: Page, role: Role) {
  const { email, password } = CREDENTIALS[role];
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  // Warten, bis die Session tatsächlich steht (Redirect auf den
  // Rollen-Startbereich), bevor die eigentliche Matrix durchprobiert wird.
  await expect(page).not.toHaveURL(/\/login/);
}

function pathOf(page: Page): string {
  return new URL(page.url()).pathname;
}

async function assertRouteAccess(
  page: Page,
  route: ProtectedRoute,
  role: Role | null,
) {
  const response = await page.goto(route.path);
  const allowed = role !== null && route.allowedRoles.includes(role);

  if (allowed) {
    expect(pathOf(page), `${role} sollte ${route.path} erreichen können`).toBe(
      route.path,
    );
    expect(response?.status()).toBeLessThan(400);
  } else {
    expect(
      pathOf(page),
      `${role ?? "nicht angemeldet"} sollte von ${route.path} weggeleitet werden`,
    ).not.toBe(route.path);
  }
}

test.describe("RBAC-Matrix (PROMPT.md Abschnitt 5)", () => {
  test("nicht angemeldet: jede geschützte Seite führt zu /login", async ({
    page,
  }) => {
    for (const route of ROUTES) {
      await assertRouteAccess(page, route, null);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  for (const role of ["STUDENT", "STAFF", "ADMIN"] as const) {
    test(`${role}: nur laut Rechte-Matrix erlaubte Seiten sind erreichbar`, async ({
      page,
    }) => {
      await login(page, role);
      for (const route of ROUTES) {
        await assertRouteAccess(page, route, role);
      }
    });
  }
});
