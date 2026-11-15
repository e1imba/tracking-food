import { expect, test, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { SESSION_MAX_AGE_SECONDS } from "../../src/lib/auth/config";
import { AUTH_TEST_COOKIE, AUTH_TEST_ORIGIN, AUTH_TEST_SECRET } from "../auth-test-env";

async function setSession(context: BrowserContext, subject: string, maxAge = SESSION_MAX_AGE_SECONDS) {
  const value = await encode({
    secret: AUTH_TEST_SECRET,
    salt: AUTH_TEST_COOKIE,
    maxAge,
    token: { sub: subject, name: "Test User", email: `${subject}@example.test` },
  });
  await context.addCookies([{
    name: AUTH_TEST_COOKIE,
    value,
    url: AUTH_TEST_ORIGIN,
    httpOnly: true,
    sameSite: "Lax",
    // Send even expired JWTs to verify server validation independently of the browser.
    expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  }]);
}

test("two accounts have independent sessions that survive refresh and logout", async ({ page, context, browser, isMobile }) => {
  await setSession(context, "account-a");
  const otherContext = await browser.newContext({ baseURL: AUTH_TEST_ORIGIN, viewport: { width: 1280, height: 900 } });
  try {
    await setSession(otherContext, "account-b");
    const otherPage = await otherContext.newPage();
    await page.goto("/");
    await otherPage.goto("/");
    await expect(page).toHaveURL("/meals");
    if (isMobile) await page.getByRole("button", { name: "Otvori meni" }).click();
    await expect(page.getByText("account-a@example.test").filter({ visible: true })).toBeVisible();
    await expect(otherPage.getByText("account-b@example.test")).toBeVisible();

    await page.reload();
    if (isMobile) await page.getByRole("button", { name: "Otvori meni" }).click();
    await expect(page.getByRole("button", { name: "Odjavi se" }).filter({ visible: true })).toBeVisible();
    await page.goto("/login");
    await expect(page).toHaveURL("/meals");

    const sessionResponse = await context.request.get("/api/auth/session");
    const session = await sessionResponse.json();
    expect(session.user.id).toBe("account-a");
    expect(session).not.toHaveProperty("access_token");
    expect(new Date(session.expires).getTime() - Date.now()).toBeGreaterThan((SESSION_MAX_AGE_SECONDS - 60) * 1000);
    expect(new Date(session.expires).getTime() - Date.now()).toBeLessThanOrEqual(SESSION_MAX_AGE_SECONDS * 1000);
    const cookie = (await context.cookies()).find(({ name }) => name === AUTH_TEST_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");

    if (isMobile) await page.getByRole("button", { name: "Otvori meni" }).click();
    await page.getByRole("button", { name: "Odjavi se" }).filter({ visible: true }).click();
    await expect(page).toHaveURL("/login");
    expect((await context.cookies()).some(({ name }) => name === AUTH_TEST_COOKIE)).toBe(false);
    await page.goto("/");
    await expect(page).toHaveURL("/login");
    await page.reload();
    await expect(page.getByRole("button", { name: "Nastavi preko Google-a" })).toBeVisible();
    await otherPage.reload();
    await expect(otherPage.getByText("account-b@example.test")).toBeVisible();

    // Repeated access uses the same verified Google identity.
    await setSession(context, "account-a");
    await page.goto("/");
    if (isMobile) await page.getByRole("button", { name: "Otvori meni" }).click();
    await expect(page.getByText("account-a@example.test").filter({ visible: true })).toBeVisible();
  } finally {
    await otherContext.close();
  }
});

test("expired and forged sessions cannot open the home page", async ({ page, context }) => {
  await setSession(context, "expired", -60);
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  expect(await (await context.request.get("/api/auth/session")).json()).toBeNull();

  await context.addCookies([{ name: AUTH_TEST_COOKIE, value: "forged-session", url: AUTH_TEST_ORIGIN }]);
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  expect(await (await context.request.get("/api/auth/session")).json()).toBeNull();
});

test("login errors are recoverable and do not expose provider details", async ({ page }) => {
  await page.goto("/login?error=synthetic-private-provider-detail");
  await expect(page.getByRole("alert").filter({ hasText: "Prijava nije uspela." })).toHaveText("Prijava nije uspela. Pokušajte ponovo.");
  await expect(page.getByRole("button", { name: "Nastavi preko Google-a" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("synthetic-private-provider-detail");
});
