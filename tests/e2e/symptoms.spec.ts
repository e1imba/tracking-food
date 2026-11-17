import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { AUTH_TEST_COOKIE, AUTH_TEST_ORIGIN, AUTH_TEST_SECRET } from "../auth-test-env";

async function openEntry(page: Page) { await page.getByRole("button", { name: "Dodaj simptom", exact: true }).click(); }

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: AUTH_TEST_COOKIE, value: await encode({ secret: AUTH_TEST_SECRET, salt: AUTH_TEST_COOKIE,
    token: { sub: `synthetic-symptoms-${randomUUID()}`, email: "dnevnik@example.test" } }), url: AUTH_TEST_ORIGIN }]);
});

test("drawer, modal focus, Escape, discard and failed save retain input", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page).toHaveURL("/meals");
  const menu = page.getByRole("button", { name: "Otvori meni" });
  await menu.click();
  await expect(page.getByRole("dialog", { name: "Navigacija" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Obroci" })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await page.goto("/symptoms");
  await openEntry(page);
  const name = page.getByLabel("Naziv simptoma");
  await expect(name).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Zatvori unos" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dodaj simptom", exact: true })).toBeFocused();
  await openEntry(page);
  await name.fill("Sačuvaj moj unos");
  page.once("dialog", dialog => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(name).toHaveValue("Sačuvaj moj unos");
  await page.getByLabel("Napomena (opciono)").fill("Sintetička napomena");
  await page.route("**/symptoms", route => route.request().method() === "POST" ? route.abort() : route.continue());
  await page.getByRole("button", { name: "Sačuvaj simptom" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText("Simptom nije sačuvan");
  await expect(name).toHaveValue("Sačuvaj moj unos");
  await expect(page.getByLabel("Napomena (opciono)")).toHaveValue("Sintetička napomena");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Zatvori unos" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const width of [360, 390, 768, 1440]) {
  test(`overview and entry fit ${width}px with long content and reduced viewport`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/symptoms");
    await expect(page.getByText("Još nema sačuvanih simptoma.")).toBeVisible();
    await openEntry(page);
    await page.getByLabel("Naziv simptoma").fill("Sintetički ručak — " + "dugačaknaziv".repeat(12));
    await page.getByLabel("Datum i vreme početka", { exact: true }).fill("2026-01-10T12:30");
    await page.getByLabel("Jačina (opciono)").fill("7");
    const note = "Duga sintetička napomena bez privatnih podataka. ".repeat(12);
    await page.getByLabel("Napomena (opciono)").fill(note);
    // A reduced viewport exercises the same footer layout used with a keyboard.
    await page.setViewportSize({ width, height: 480 });
    await page.getByLabel("Napomena (opciono)").focus();
    await expect(page.getByRole("button", { name: "Sačuvaj simptom" })).toBeInViewport();
    const footer = await page.getByRole("button", { name: "Sačuvaj simptom" }).boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(480);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Sačuvaj simptom" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("Simptom je sačuvan.");
    await page.reload();
    const navigation = width >= 1024 ? page.locator(".desktop-sidebar") : page.getByRole("dialog", { name: "Navigacija" });
    if (width < 1024) await page.getByRole("button", { name: "Otvori meni" }).click();
    await expect(navigation.getByRole("link", { name: "Simptomi", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("link", { name: "Obroci", exact: true })).not.toHaveAttribute("aria-current");
    if (width < 1024) await page.keyboard.press("Escape");
    const overview = page.locator(width >= 1024 ? ".desktop-history" : ".mobile-history");
    await expect(overview).toContainText("7/10");
    await expect(overview.locator("time").first()).toHaveAttribute("datetime", "2026-01-10T11:30:00.000Z");
    await overview.getByText("Prikaži više", { exact: true }).click();
    await expect(overview).toContainText(note.trim());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const action = page.getByRole("button", { name: "Dodaj simptom", exact: true });
    await expect(action).toBeInViewport();
    const last = await overview.boundingBox();
    const fab = await action.boundingBox();
    expect(last!.y + last!.height).toBeLessThan(fab!.y);
    await action.focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
    if (process.env.CAPTURE_UI && testInfo.project.name === "desktop-chromium" && [390, 1440].includes(width)) {
      await overview.getByText("Prikaži manje", { exact: true }).click();
      await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `docs/screenshots/issue-18-${width}.png`, fullPage: true });
      await openEntry(page);
      await page.screenshot({ path: `docs/screenshots/issue-18-form-${width}.png` });
    }
  });
}

test("protects symptoms from unauthenticated access and a second account", async ({ page, browser }) => {
  await page.goto("/symptoms");
  await openEntry(page);
  await page.getByLabel("Naziv simptoma").fill("Samo prvi sintetički nalog");
  await page.getByRole("button", { name: "Sačuvaj simptom" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await second.goto(AUTH_TEST_ORIGIN + "/symptoms");
    await expect(second).toHaveURL(/\/login$/);
    await other.addCookies([{ name: AUTH_TEST_COOKIE, value: await encode({ secret: AUTH_TEST_SECRET, salt: AUTH_TEST_COOKIE, token: { sub: `synthetic-second-${randomUUID()}`, email: "dnevnik@example.test" } }), url: AUTH_TEST_ORIGIN }]);
    await second.goto(AUTH_TEST_ORIGIN + "/symptoms");
    await expect(second.getByText("Još nema sačuvanih simptoma.")).toBeVisible();
    await expect(second.getByText("Samo prvi sintetički nalog")).toHaveCount(0);
  } finally { await other.close(); }
});
