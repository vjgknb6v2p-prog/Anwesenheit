import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

/**
 * Manche CI-/Sandbox-Umgebungen stellen eine vorinstallierte
 * Chromium-Revision unter `$PLAYWRIGHT_BROWSERS_PATH` bereit, die von der
 * hier gepinnten @playwright/test-Version abweichen und einen (dort ggf.
 * blockierten) Download auslösen kann. Falls die konkrete Revision 1194
 * dort vorhanden ist, wird sie explizit verwendet — auf einer normalen
 * Entwicklungsmaschine (kein `PLAYWRIGHT_BROWSERS_PATH` oder andere
 * Revision) bleibt es beim Standardverhalten von Playwright.
 */
function findSandboxChromiumExecutable(): string | undefined {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath) {
    return undefined;
  }
  const candidate = path.join(
    browsersPath,
    "chromium-1194/chrome-linux/chrome",
  );
  return existsSync(candidate) ? candidate : undefined;
}

const sandboxChromiumExecutable = findSandboxChromiumExecutable();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(sandboxChromiumExecutable && {
          launchOptions: { executablePath: sandboxChromiumExecutable },
        }),
      },
    },
  ],
  webServer: {
    command: "pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
