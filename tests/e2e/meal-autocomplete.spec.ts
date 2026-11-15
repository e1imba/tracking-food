import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { AUTH_TEST_COOKIE, AUTH_TEST_ORIGIN, AUTH_TEST_SECRET } from "../auth-test-env";

const open = (page: Page) => page.getByRole("button", { name: "Dodaj obrok", exact: true }).click();
const save = async (page: Page) => {
  await page.getByRole("button", { name: "Sačuvaj obrok" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
};
const addFood = async (page: Page, name: string) => {
  await page.getByLabel("Pretraži ili dodaj namirnicu").fill(name);
  await page.getByRole("button", { name: "Dodaj namirnicu" }).click();
};
test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{ name: AUTH_TEST_COOKIE, value: await encode({ secret: AUTH_TEST_SECRET, salt: AUTH_TEST_COOKIE,
    token: { sub: `synthetic-autocomplete-${randomUUID()}` } }), url: AUTH_TEST_ORIGIN }]);
  await page.goto("/meals");
});

test("local time follows automatic type, manual choice persists, new form resets and manual choice is dirty", async ({ page }) => {
  await open(page);
  const time = page.getByLabel("Datum i vreme", { exact: true });
  const type = page.getByLabel("Tip obroka", { exact: true });
  await expect(type.locator("option")).toHaveText(["Doručak", "Ručak", "Večera", "Užina", "Ostalo"]);
  for (const [clock, expected] of [["00:00", "other"], ["03:59", "other"], ["04:00", "breakfast"], ["11:59", "breakfast"], ["12:00", "lunch"], ["16:59", "lunch"], ["17:00", "dinner"], ["23:59", "dinner"]]) {
    await time.fill(`2026-01-10T${clock}`);
    await expect(type).toHaveValue(expected);
  }
  await type.selectOption("snack");
  await time.fill("2026-01-10T04:00");
  await expect(type).toHaveValue("snack");
  await page.getByLabel("Naziv obroka").fill("Ručni tip");
  await save(page);
  await page.reload();
  await expect(page.locator(".mobile-history article:visible, .desktop-history tbody tr:visible")).toContainText("Užina");
  await open(page);
  await time.fill("2026-01-10T12:00");
  await expect(type).toHaveValue("lunch");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Zatvori unos" }).click();
  await open(page);
  // Selecting even the current suggested type explicitly counts as an edit.
  await type.selectOption(await type.inputValue());
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "Zatvori unos" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("deduplicated prefix selects latest eaten foods, replaces tags, keeps other fields and saves independently", async ({ page, browser }, testInfo) => {
  await open(page);
  await page.getByLabel("Naziv obroka").fill("Sendvič");
  await page.getByLabel("Datum i vreme", { exact: true }).fill("2026-01-12T12:00");
  await addFood(page, "Kečap");
  await save(page);
  // A later recorded retroactive meal must not replace the latest eaten one.
  await open(page);
  await page.getByLabel("Naziv obroka").fill("  ＳENDVIČ  ");
  await page.getByLabel("Datum i vreme", { exact: true }).fill("2026-01-10T12:00");
  await addFood(page, "Pavlaka");
  await save(page);
  await open(page);
  await page.getByLabel("Naziv obroka").fill("Sendvič prazan");
  await save(page);
  await open(page);
  await addFood(page, "Privremeno");
  const name = page.getByRole("combobox", { name: "Naziv obroka" });
  await name.fill("Sen");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveText(["Sendvič prazan", "Sendvič"]);
  await expect(page.getByRole("button", { name: "Ukloni Privremeno" })).toBeVisible();
  await page.getByRole("listbox").getByRole("option", { name: "Sendvič prazan", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Ukloni / })).toHaveCount(0);
  await name.fill("Sen");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(name).toHaveAttribute("aria-activedescendant", /option-1$/);
  await page.keyboard.press("Enter");
  await expect(name).toHaveValue("Sendvič");
  await expect(page.getByRole("button", { name: "Ukloni Kečap" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ukloni Pavlaka" })).toHaveCount(0);
  await page.getByLabel("Tip obroka").selectOption("snack");
  await page.getByLabel("Datum i vreme", { exact: true }).fill("2026-01-15T07:00");
  await page.getByLabel("Napomena (opciono)").fill("Samo novi obrok");
  await name.fill("Sen");
  await page.getByRole("listbox").getByRole("option", { name: "Sendvič", exact: true }).click();
  await expect(page.getByLabel("Tip obroka")).toHaveValue("snack");
  await expect(page.getByLabel("Datum i vreme", { exact: true })).toHaveValue("2026-01-15T07:00");
  await expect(page.getByLabel("Napomena (opciono)")).toHaveValue("Samo novi obrok");
  await name.fill("Sendvič novi");
  await expect(page.getByRole("button", { name: "Ukloni Kečap" })).toBeVisible();
  await page.getByRole("button", { name: "Ukloni Kečap" }).click();
  const food = page.getByRole("combobox", { name: "Pretraži ili dodaj namirnicu" });
  await food.fill("pav");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Ukloni Pavlaka" })).toBeVisible();
  await food.fill("pav");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(food).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("dialog")).toBeVisible();
  await food.fill("");
  await addFood(page, "Salata");
  if (process.env.CAPTURE_UI_ISSUE16 && testInfo.project.name === "desktop-chromium") {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await name.fill("Sen");
      await page.locator(".form-scroll").evaluate(element => { element.scrollTop = 0; });
      await page.screenshot({ path: `docs/screenshots/issue-16-form-${width}.png` });
    }
    await name.fill("Sendvič novi");
  }
  // Failure preserves the selected type, fields and tags.
  await page.route("**/meals", route => route.request().method() === "POST" ? route.abort() : route.continue());
  await page.getByRole("button", { name: "Sačuvaj obrok" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText("Obrok nije sačuvan");
  await expect(page.getByRole("button", { name: "Ukloni Pavlaka" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ukloni Salata" })).toBeVisible();
  await expect(page.getByLabel("Tip obroka")).toHaveValue("snack");
  await page.unroute("**/meals");
  await save(page);
  await page.reload();
  const rows = page.locator(".mobile-history article:visible, .desktop-history tbody tr:visible");
  await expect(rows.filter({ hasText: "Sendvič novi" })).toContainText("Pavlaka");
  await expect(rows.filter({ hasText: "Sendvič novi" })).toContainText("Salata");
  await expect(rows.filter({ hasText: "Sendvič novi" })).toContainText("Užina");
  await expect(rows.filter({ hasText: "Sendvič novi" })).not.toContainText("Kečap");
  const original = rows.filter({ hasText: "Kečap" });
  await expect(original).toHaveCount(1);
  await expect(original).not.toContainText("Pavlaka");
  const other = await browser.newContext();
  try {
    await other.addCookies([{ name: AUTH_TEST_COOKIE, value: await encode({ secret: AUTH_TEST_SECRET, salt: AUTH_TEST_COOKIE,
      token: { sub: `synthetic-other-${randomUUID()}` } }), url: AUTH_TEST_ORIGIN }]);
    const otherPage = await other.newPage();
    await otherPage.goto(`${AUTH_TEST_ORIGIN}/meals`);
    await open(otherPage);
    await otherPage.getByLabel("Naziv obroka").fill("Sen");
    await expect(otherPage.getByRole("listbox").getByRole("option")).toHaveCount(0);
  } finally { await other.close(); }
});

test("new food action works by keyboard inside the modal and Escape closes its popup first", async ({ page }) => {
  await open(page);
  await page.getByLabel("Naziv obroka").fill("Novi obrok tastaturom");
  const food = page.getByRole("combobox", { name: "Pretraži ili dodaj namirnicu" });
  await food.fill("Nova namirnica");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ukloni Nova namirnica" })).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Dodaj namirnicu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(food).toBeFocused();
  await expect(food).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Ukloni Nova namirnica" })).toBeVisible();
  await save(page);
});
