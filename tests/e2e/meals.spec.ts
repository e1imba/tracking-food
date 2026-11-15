import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { AUTH_TEST_COOKIE, AUTH_TEST_ORIGIN, AUTH_TEST_SECRET } from "../auth-test-env";

test("meal entry and history require a valid session", async ({ page }) => {
  await page.goto("/meals");
  await expect(page).toHaveURL("/login");
});

test("empty catalog, multi-food entry, plain-text note, local time and refresh", async ({ page, context, browser }) => {
  await context.addCookies([{ name: AUTH_TEST_COOKIE, value: await encode({
    secret: AUTH_TEST_SECRET, salt: AUTH_TEST_COOKIE, token: { sub: `synthetic-meals-${randomUUID()}` },
  }), url: AUTH_TEST_ORIGIN }]);
  await page.goto("/meals");
  await expect(page.getByText("Još nema sačuvanih obroka.")).toBeVisible();
  await page.getByRole("button", { name: "Dodaj obrok", exact: true }).click();
  const expectedLocal = await page.evaluate(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  await expect(page.getByLabel("Datum i vreme", { exact: true })).toHaveValue(expectedLocal);
  await page.getByLabel("Naziv obroka").fill("Sintetički ručak");
  await page.getByLabel("Datum i vreme", { exact: true }).fill("2026-01-10T12:30");
  for (const food of ["Pirinač", "Paradajz"]) {
    await page.getByLabel("Pretraži ili dodaj namirnicu", { exact: true }).fill(food);
    await page.getByRole("button", { name: "Dodaj namirnicu" }).click();
  }
  const note = "Sintetička napomena\n<script>window.syntheticXss = true</script>";
  await page.getByLabel("Napomena (opciono)").fill(note);
  await page.getByRole("button", { name: "Sačuvaj obrok" }).click();
  await expect(page.getByRole("status")).toHaveText("Obrok je sačuvan.");
  await page.reload();
  const article = page.locator(".mobile-history article:visible, .desktop-history tbody tr:visible").filter({ hasText: "Sintetički ručak" });
  await expect(article).toContainText(note);
  await expect(article).toContainText("Pirinač");
  await expect(article).toContainText("Paradajz");
  await expect(article.locator("time")).toContainText("12:30");
  expect(await page.evaluate(() => "syntheticXss" in window)).toBe(false);
  await page.getByRole("button", { name: "Dodaj obrok", exact: true }).click();
  await page.getByLabel("Pretraži ili dodaj namirnicu").fill("Pir");
  await expect(page.getByLabel("Pirinač", { exact: true })).toBeVisible();

  // Reuse one existing food and save another entry without a note.
  await page.getByLabel("Naziv obroka").fill("Noviji obrok");
  await page.getByLabel("Datum i vreme", { exact: true }).fill("2026-02-10T08:00");
  await page.getByLabel("Pirinač", { exact: true }).check();
  await page.getByRole("button", { name: "Sačuvaj obrok" }).click();
  await expect(page.getByRole("status")).toHaveText("Obrok je sačuvan.");
  await page.reload();
  await expect(page.locator(".mobile-history article:visible, .desktop-history tbody tr:visible").first()).toContainText("Noviji obrok");
  await expect(page.locator(".mobile-history article:visible, .desktop-history tbody tr:visible").first()).toContainText("Pirinač");
  await expect(page.locator(".mobile-history article:visible, .desktop-history tbody tr:visible").first()).not.toContainText("Paradajz");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const otherContext = await browser.newContext();
  try {
    await otherContext.addCookies([{ name: AUTH_TEST_COOKIE, value: await encode({
      secret: AUTH_TEST_SECRET, salt: AUTH_TEST_COOKIE, token: { sub: `synthetic-other-${randomUUID()}` },
    }), url: AUTH_TEST_ORIGIN }]);
    const otherPage = await otherContext.newPage();
    await otherPage.goto(`${AUTH_TEST_ORIGIN}/meals`);
    await expect(otherPage.getByText("Još nema sačuvanih obroka.")).toBeVisible();
    await expect(otherPage.getByLabel("Pirinač", { exact: true })).toHaveCount(0);
  } finally { await otherContext.close(); }
});
