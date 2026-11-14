import { defineConfig, devices } from "@playwright/test";
import { AUTH_TEST_ORIGIN, AUTH_TEST_SECRET } from "./tests/auth-test-env";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl || !new URL(testDatabaseUrl).pathname.endsWith("_test")) {
  throw new Error("Set TEST_DATABASE_URL to a disposable database ending in _test");
}

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: AUTH_TEST_ORIGIN,
    timezoneId: "Europe/Belgrade",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1",
    url: AUTH_TEST_ORIGIN,
    // Own the server so tests cannot use real credentials or a different secret.
    reuseExistingServer: false,
    env: {
      DATABASE_URL: testDatabaseUrl,
      AUTH_SECRET: AUTH_TEST_SECRET,
      AUTH_URL: AUTH_TEST_ORIGIN,
      AUTH_TRUST_HOST: "true",
      AUTH_GOOGLE_ID: "synthetic-google-client",
      AUTH_GOOGLE_SECRET: "synthetic-google-secret",
    },
    timeout: 60_000,
  },
});
