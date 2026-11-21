import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { AUTH_TEST_COOKIE, AUTH_TEST_ORIGIN, AUTH_TEST_SECRET } from "../auth-test-env";

async function openEntry(page: Page) { await page.getByRole("button", { name: "Dodaj obrok", exact: true }).click(); }

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: AUTH_TEST_COOKIE, value: await encode({ secret: AUTH_TEST_SECRET, salt: AUTH_TEST_COOKIE,
    token: { sub: `synthetic-layout-${randomUUID()}`, email: "dnevnik@example.test" } }), url: AUTH_TEST_ORIGIN }]);
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
  await openEntry(page);
  const name = page.getByLabel("Naziv obroka");
  await expect(page.getByRole("heading", { name: "Novi obrok" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Zatvori unos" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dodaj obrok", exact: true })).toBeFocused();
  await openEntry(page);
  await name.fill("Sačuvaj moj unos");
  page.once("dialog", dialog => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(name).toHaveValue("Sačuvaj moj unos");
  await page.getByLabel("Napomena (opciono)").fill("Sintetička napomena");
  await page.route("**/meals", route => route.request().method() === "POST" ? route.abort() : route.continue());
  await page.getByRole("button", { name: "Sačuvaj obrok" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText("Obrok nije sačuvan");
  await expect(name).toHaveValue("Sačuvaj moj unos");
  await expect(page.getByLabel("Napomena (opciono)")).toHaveValue("Sintetička napomena");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Zatvori unos" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const width of [360, 390, 768, 1440]) {
  test(`overview and entry fit ${width}px with long content and reduced viewport`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/meals");
    await openEntry(page);
    await page.getByLabel("Naziv obroka").fill("Sintetički ručak — " + "dugačaknaziv".repeat(12));
    await page.getByLabel("Datum i vreme", { exact: true }).fill("2026-01-10T12:30");
    await page.getByLabel("Pretraži ili dodaj namirnicu").fill("Pirinač i povrće");
    await page.getByRole("button", { name: "Dodaj namirnicu" }).click();
    const note = "Duga sintetička napomena bez privatnih podataka. ".repeat(12);
    await page.getByLabel("Napomena (opciono)").fill(note);
    // A reduced viewport exercises the layout without a native software keyboard.
    await page.setViewportSize({ width, height: 480 });
    await page.getByLabel("Napomena (opciono)").focus();
    await expect(page.getByRole("button", { name: "Sačuvaj obrok" })).toBeInViewport();
    const save = await page.getByRole("button", { name: "Sačuvaj obrok" }).boundingBox();
    const dialog = await page.getByRole("dialog").boundingBox();
    expect(save!.y + save!.height).toBeLessThanOrEqual(480);
    if (width < 640) {
      expect(dialog).toMatchObject({ x: 0, y: 0, width, height: 480 });
      expect(save!.y).toBeLessThan(64);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Sačuvaj obrok" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("Obrok je sačuvan.");
    const overview = page.locator(width >= 1024 ? ".desktop-history" : ".mobile-history");
    await overview.getByText("Prikaži više", { exact: true }).click();
    await expect(overview).toContainText(note.trim());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const action = page.getByRole("button", { name: "Dodaj obrok", exact: true });
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
      await page.screenshot({ path: `docs/screenshots/issue-13-${width}.png`, fullPage: true });
      await openEntry(page);
      await page.screenshot({ path: `docs/screenshots/issue-13-form-${width}.png` });
    }
  });
}
