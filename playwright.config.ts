import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:5187";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ...devices["Desktop Chrome"],
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
      ...(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {}),
    },
  },
  webServer: {
    command: "npm run dev -- --mode e2e --host 127.0.0.1 --port 5187",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_E2E_TEST_ADAPTERS: "true" },
  },
});
