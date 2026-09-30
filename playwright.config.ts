import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || "5199");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("E2E_PORT must be an integer between 1024 and 65535.");
const baseURL = `http://127.0.0.1:${port}/progress-tracker/`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: "**/mobile.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: [
        "**/mobile.spec.ts",
        "**/extra-topics.spec.ts",
        "**/careers.spec.ts",
        "**/advanced-careers.spec.ts",
      ],
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: baseURL,
    reuseExistingServer: false,
    env: {
      E2E_EMULATORS: process.env.E2E_EMULATORS || "false",
      E2E_PORT: String(port),
    },
    timeout: 120000,
  },
});
