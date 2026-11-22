import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { AUTH_TEST_COOKIE, AUTH_TEST_ORIGIN, AUTH_TEST_SECRET } from "../auth-test-env";

async function signIn(context: BrowserContext) {
  await context.addCookies([{ name: AUTH_TEST_COOKIE, value: await encode({
    secret: AUTH_TEST_SECRET, salt: AUTH_TEST_COOKIE, token: { sub: `synthetic-food-catalog-${randomUUID()}` },
  }), url: AUTH_TEST_ORIGIN }]);
}

async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Otvori meni" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Glavna navigacija" }).getByRole("link", { name, exact: true }).click();
}

async function save(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

function row(page: Page, name: string) {
  return page.locator(".catalog-row").filter({ has: page.getByRole("heading", { name, exact: true }) });
}

test("catalog, groups and local rules update a previously logged meal across the journal", async ({ page, context, browser }, testInfo) => {
  await page.setViewportSize({ width: testInfo.project.name === "mobile-chromium" ? 390 : 1440, height: 844 });
  await page.goto("/foods");
  await expect(page).toHaveURL("/login");
  await signIn(context);
  await page.goto("/meals");
  await navigate(page, "Namirnice");
  await expect(page).toHaveURL("/foods");
  await expect(page.getByRole("heading", { name: "Katalog je prazan" })).toBeVisible();
  const add = page.getByRole("button", { name: "Dodaj namirnicu", exact: true });
  for (const name of ["Jogurt", "  ＪOGURT  ", "Pirinač"]) {
    await add.click();
    await page.getByLabel("Naziv namirnice").fill(name);
    await save(page, "Sačuvaj namirnicu");
    await expect(page.getByText("Namirnica je u katalogu.")).toBeVisible();
  }
  await expect(row(page, "Jogurt")).toContainText("Nije ocenjeno");
  await expect(page.locator(".catalog-row")).toHaveCount(2);

  await navigate(page, "Obroci");
  await page.getByRole("button", { name: "Dodaj obrok", exact: true }).click();
  await page.getByLabel("Naziv obroka").fill("Retroaktivni obrok");
  await page.getByLabel("Datum i vreme", { exact: true }).fill("2026-01-15T00:15");
  await page.getByLabel("Tip obroka").selectOption("lunch");
  const pick = page.getByRole("combobox", { name: "Pretraži ili dodaj namirnicu" });
  for (const name of ["Jogurt", "Pirinač"]) {
    await pick.fill(name);
    await page.getByRole("option", { name, exact: true }).click();
  }
  await pick.fill("Krastavac");
  await page.getByRole("button", { name: "Dodaj namirnicu", exact: true }).click();
  await save(page, "Sačuvaj obrok");
  const rating = page.locator(".meal-rating:visible");
  await expect(rating).toContainText("Nije ocenjeno");

  await navigate(page, "Namirnice");
  await expect(row(page, "Krastavac")).toBeVisible();
  await page.getByRole("searchbox", { name: "Pretraži namirnice" }).fill("  ＰIRINAČ  ");
  const filter = page.getByRole("combobox", { name: "Prikaži", exact: true });
  await filter.selectOption("unrated");
  await expect(page.locator(".catalog-row")).toHaveCount(1);
  const editRice = row(page, "Pirinač").getByRole("button", { name: "Uredi namirnicu Pirinač" });
  await editRice.focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Osnovna ocena").selectOption("2");
  await page.getByRole("button", { name: "Dodaj interval" }).click();
  await save(page, "Sačuvaj namirnicu");
  await expect(page.getByRole("heading", { name: "Nema rezultata" })).toBeVisible();
  await expect(filter).toBeFocused();

  await page.getByRole("tab", { name: "Sve namirnice" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Grupe" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Još nema grupa" })).toBeVisible();
  await page.getByRole("button", { name: "Dodaj grupu" }).click();
  await page.getByLabel("Naziv grupe").fill("Mlečni proizvodi");
  await page.getByLabel("Opis (opciono)").fill("Sintetička grupa");
  await page.getByLabel("Osnovna ocena").selectOption("3");
  await page.getByRole("button", { name: "Dodaj interval" }).click();
  const interval = page.getByRole("group", { name: "Interval 1", exact: true });
  await interval.getByRole("combobox", { name: "Od", exact: true }).selectOption("17");
  await interval.getByRole("combobox", { name: "Do", exact: true }).selectOption("4");
  await interval.getByRole("combobox", { name: "Ocena", exact: true }).selectOption("5");
  await pick.fill("Jogu");
  await page.getByRole("option", { name: "Jogurt", exact: true }).click();
  await pick.fill("Sir");
  await page.getByRole("button", { name: "Dodaj namirnicu u grupu" }).click();
  await expect(page.getByRole("button", { name: "Ukloni Sir" })).toBeVisible();
  if (process.env.CAPTURE_FOOD_UI) {
    await page.locator(".form-scroll").evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: testInfo.outputPath("group-form.png") });
  }
  await save(page, "Sačuvaj grupu");
  await expect(row(page, "Mlečni proizvodi")).toContainText("17:00–04:00 · 5/5");
  await expect(row(page, "Mlečni proizvodi")).toContainText("Broj namirnica 2");
  if (process.env.CAPTURE_FOOD_UI) await page.screenshot({ path: testInfo.outputPath("groups.png") });

  await navigate(page, "Obroci");
  await expect(rating).toContainText("3,5/5 · 2/3 ocenjenih");
  await expect(page.getByText("Ručak", { exact: true }).filter({ visible: true })).toBeVisible();
  if (process.env.CAPTURE_FOOD_UI) await page.screenshot({ path: testInfo.outputPath("meal-rating.png") });

  await navigate(page, "Namirnice");
  await page.getByRole("tab", { name: "Grupe" }).click();
  await row(page, "Mlečni proizvodi").getByRole("button", { name: "Uredi grupu Mlečni proizvodi" }).click();
  await interval.getByRole("combobox", { name: "Ocena", exact: true }).selectOption("1");
  await save(page, "Sačuvaj grupu");
  await navigate(page, "Obroci");
  await expect(rating).toContainText("1,5/5 · 2/3 ocenjenih");

  await navigate(page, "Namirnice");
  await page.getByRole("tab", { name: "Sve namirnice" }).click();
  await page.getByRole("searchbox").clear();
  await page.getByRole("combobox", { name: "Prikaži", exact: true }).selectOption({ label: "Mlečni proizvodi" });
  await expect(page.locator(".catalog-row")).toHaveCount(2);
  await expect(row(page, "Jogurt")).toContainText("Nasleđena ocena");
  if (process.env.CAPTURE_FOOD_UI) await page.screenshot({ path: testInfo.outputPath("catalog.png") });
  const editJogurt = row(page, "Jogurt").getByRole("button", { name: "Uredi namirnicu Jogurt" });
  await editJogurt.click();
  await expect(page.getByLabel("Osnovna ocena")).toHaveCount(0);
  const group = page.getByRole("combobox", { name: "Grupa", exact: true });
  await group.selectOption("");
  await page.getByLabel("Osnovna ocena").selectOption("4");
  await save(page, "Sačuvaj namirnicu");
  await expect(editJogurt).toHaveCount(0);
  await expect(filter).toBeFocused();
  await filter.selectOption("all");
  await expect(row(page, "Jogurt")).toContainText("Osnovna ocena 4/5");

  await editRice.click();
  await group.selectOption({ label: "Mlečni proizvodi" });
  await expect(page.getByLabel("Osnovna ocena")).toHaveCount(0);
  await group.selectOption("");
  await expect(page.getByLabel("Osnovna ocena")).toHaveValue("2");
  await expect(interval.getByRole("combobox", { name: "Od", exact: true })).toHaveValue("4");
  await expect(interval.getByRole("combobox", { name: "Do", exact: true })).toHaveValue("12");
  await expect(interval.getByRole("combobox", { name: "Ocena", exact: true })).toHaveValue("3");
  await save(page, "Sačuvaj namirnicu");
  await expect(editRice).toBeFocused();
  await expect(row(page, "Pirinač")).toContainText("Osnovna ocena 2/5");
  await expect(row(page, "Pirinač")).toContainText("04:00–12:00 · 3/5");
  await navigate(page, "Obroci");
  await expect(rating).toContainText("3/5 · 2/3 ocenjenih");
  await expect(page.locator(".meal-name:visible, .meal-row h3:visible")).toContainText("Retroaktivni obrok");
  await expect(page.getByText(/Jogurt.*Krastavac.*Pirinač/).filter({ visible: true })).toBeVisible();

  await navigate(page, "Namirnice");
  await editRice.click();
  await group.selectOption({ label: "Mlečni proizvodi" });
  await save(page, "Sačuvaj namirnicu");
  await expect(row(page, "Pirinač")).toContainText("Nasleđena ocena");
  await editRice.click();
  await group.selectOption("");
  await expect(page.getByLabel("Osnovna ocena")).toHaveValue("");
  await expect(interval).toHaveCount(0);
  await save(page, "Sačuvaj namirnicu");
  await expect(row(page, "Pirinač")).toContainText("Nije ocenjeno");

  const other = await browser.newContext({ baseURL: AUTH_TEST_ORIGIN });
  try {
    await signIn(other);
    const second = await other.newPage();
    await second.goto("/foods");
    await expect(second.getByRole("heading", { name: "Katalog je prazan" })).toBeVisible();
    await second.getByRole("tab", { name: "Grupe" }).click();
    await expect(second.getByRole("heading", { name: "Još nema grupa" })).toBeVisible();
    await second.goto("/meals");
    await expect(second.getByText("Još nema sačuvanih obroka.")).toBeVisible();
  } finally {
    await other.close();
  }
});

test("catalog editors fit supported widths and keep invalid changes available", async ({ page, context }) => {
  await signIn(context);
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/foods");
    const trigger = page.getByRole("button", { name: "Dodaj namirnicu", exact: true });
    await trigger.click();
    await expect(width < 640 ? page.getByRole("heading", { name: "Nova namirnica" }) : page.getByLabel("Naziv namirnice")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByLabel("Naziv namirnice").fill("Dugačaknazivbezrazmaka".repeat(8));
    await page.setViewportSize({ width, height: 480 });
    await expect(page.getByRole("button", { name: "Sačuvaj namirnicu" })).toBeInViewport();
    await save(page, "Sačuvaj namirnicu");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

  await page.getByRole("tab", { name: "Grupe" }).click();
  await page.getByRole("button", { name: "Dodaj grupu" }).click();
  await page.getByLabel("Naziv grupe").fill("Zadržite izmenu");
  await page.getByLabel("Osnovna ocena").selectOption("3");
  for (let index = 0; index < 2; index++) await page.getByRole("button", { name: "Dodaj interval" }).click();
  await page.getByRole("button", { name: "Sačuvaj grupu" }).click();
  await expect(page.getByRole("alert")).toHaveText("Vremenski intervali ne smeju da se preklapaju.");
  await expect(page.getByLabel("Naziv grupe")).toHaveValue("Zadržite izmenu");
  page.once("dialog", dialog => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Zatvori unos" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
