import { expect, test } from "@playwright/test";

test("starter page renders without horizontal overflow", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Tracking Food");
  await expect(page.getByRole("heading", { name: "Tracking Food", level: 1 })).toBeVisible();
  await expect(page.getByText("The journal is in development.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("public healthcheck returns only a static status", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ status: "ok" });
});
