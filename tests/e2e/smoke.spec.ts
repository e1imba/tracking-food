import { expect, test } from "@playwright/test";

test("protected home redirects to a responsive login page", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL("/login");
  await expect(page).toHaveTitle("Tracking Food");
  await expect(page.getByRole("heading", { name: "Tracking Food", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nastavi preko Google-a" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Odjavi se" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("public healthcheck returns only a static status", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ status: "ok" });
});
