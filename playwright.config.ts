import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5178/progress-tracker/",
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
      testMatch: "**/mobile.spec.ts",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://127.0.0.1:5178/progress-tracker/",
    reuseExistingServer: false,
    env: { E2E_EMULATORS: process.env.E2E_EMULATORS || "false" },
    timeout: 120000,
  },
});
