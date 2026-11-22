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
  await expect(page.getByRole("heading", { name: "Novi simptom" })).toBeFocused();
  await page.keyboard.press("Tab");
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
    const name = page.getByLabel("Naziv simptoma");
    if (width >= 640) await expect(name).toBeFocused();
    await name.fill("Sintetički simptom — " + "dugačaknaziv".repeat(12));
    await page.getByLabel("Datum i vreme početka", { exact: true }).fill("2026-01-10T12:30");
    await page.getByLabel("Jačina (opciono)").fill("7");
    const note = "Duga sintetička napomena bez privatnih podataka. ".repeat(12);
    await page.getByLabel("Napomena (opciono)").fill(note);
    // A smaller window exercises the layout without a native software keyboard.
    await page.setViewportSize({ width, height: 480 });
    await page.getByLabel("Napomena (opciono)").focus();
    await expect(page.getByRole("button", { name: "Sačuvaj simptom" })).toBeInViewport();
    const save = await page.getByRole("button", { name: "Sačuvaj simptom" }).boundingBox();
    expect(save!.y + save!.height).toBeLessThanOrEqual(480);
    if (width < 640) {
      const dialog = page.getByRole("dialog", { name: "Novi simptom" });
      expect(await dialog.boundingBox()).toMatchObject({ x: 0, y: 0, width, height: 480 });
      expect(save!.y).toBeLessThan(64);
    }
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

test("mobile entry keeps the focused note and header actions visible above the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/symptoms");
  await openEntry(page);
  const dialog = page.getByRole("dialog", { name: "Novi simptom" });
  await dialog.getByLabel("Naziv simptoma").fill("Sintetički simptom sa napomenom");
  const note = dialog.getByLabel("Napomena (opciono)");
  await note.fill("Sintetička napomena");
  // Simulate a keyboard shrinking and panning the visual viewport only.
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperties(viewport, {
      height: { value: 300 },
      offsetTop: { value: 0, configurable: true },
    });
    viewport.dispatchEvent(new Event("resize"));
    Object.defineProperty(viewport, "offsetTop", { value: 28 });
    viewport.dispatchEvent(new Event("scroll"));
  });
  await expect.poll(() => dialog.boundingBox()).toMatchObject({ x: 0, y: 28, width: 390, height: 300 });
  await expect(note).toBeFocused();
  await expect(note).toBeInViewport({ ratio: 1 });
  const header = dialog.locator("header");
  await expect(header.getByRole("button", { name: "Zatvori unos" })).toBeInViewport({ ratio: 1 });
  const save = header.getByRole("button", { name: "Sačuvaj simptom" });
  await expect(save).toBeInViewport({ ratio: 1 });
  await save.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Simptom je sačuvan.");
});

test.describe("landscape phone entry", () => {
  test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });

  for (const { path, add, title, name, field, value, save, status } of [
    { path: "/symptoms", add: "Dodaj simptom", title: "Novi simptom", name: "Naziv simptoma",
      field: "Jačina (opciono)", value: "7", save: "Sačuvaj simptom", status: "Simptom je sačuvan." },
    { path: "/meals", add: "Dodaj obrok", title: "Novi obrok", name: "Naziv obroka",
      field: "Pretraži ili dodaj namirnicu", value: "Sintetička namirnica", save: "Sačuvaj obrok", status: "Obrok je sačuvan." },
  ]) {
    test(`${title} keeps the focused field and header actions visible at 168px`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole("button", { name: add, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: title });
      await expect(dialog.getByRole("heading", { name: title })).toBeFocused();
      await dialog.getByLabel(name).fill("Sintetički unos");
      const focusedField = dialog.getByLabel(field, { exact: true });
      await focusedField.fill(value);

      // The keyboard leaves just 168px without changing the layout viewport.
      await page.evaluate(() => {
        const viewport = window.visualViewport!;
        Object.defineProperties(viewport, { height: { value: 168 }, offsetTop: { value: 24 } });
        viewport.dispatchEvent(new Event("resize"));
      });

      await expect.poll(() => dialog.boundingBox()).toMatchObject({ x: 0, y: 24, width: 844, height: 168 });
      await expect(focusedField).toBeFocused();
      await expect(focusedField).toBeInViewport({ ratio: 1 });
      const header = dialog.locator("header");
      await expect(header.getByRole("button", { name: "Zatvori unos" })).toBeInViewport({ ratio: 1 });
      const saveButton = header.getByRole("button", { name: save });
      await expect(saveButton).toBeInViewport({ ratio: 1 });
      await saveButton.click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("status")).toHaveText(status);
    });
  }
});

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
