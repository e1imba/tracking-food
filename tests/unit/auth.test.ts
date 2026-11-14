import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("redirect"); }),
}));

import { auth } from "../../src/lib/auth";
import { requireUser } from "../../src/lib/auth/require-user";
import { redirect } from "next/navigation";
import { authConfig, SESSION_MAX_AGE_SECONDS } from "../../src/lib/auth/config";

describe("protected access", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([null, {}, { user: {} }, { message: "configuration error" }])("fails closed for an absent identity: %j", async (session) => {
    vi.mocked(auth).mockResolvedValue(session as never);
    await expect(requireUser()).rejects.toThrow("redirect");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("returns the server-authenticated identity", async () => {
    const user = { id: "synthetic-subject", email: "person@example.test" };
    vi.mocked(auth).mockResolvedValue({ user } as never);
    expect(await requireUser()).toEqual(user);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("Google and session policy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses a seven-day JWT session and only basic identity scopes with an account chooser", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(604800);
    expect(authConfig.session).toEqual({ strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS });
    expect(authConfig.providers).toHaveLength(1);
    const provider = authConfig.providers[0];
    expect(provider.id).toBe("google");
    expect(provider.options?.authorization).toEqual({
      params: { scope: "openid email profile", prompt: "select_account" },
    });
  });

  it("uses the verified subject as identity and exposes no Google tokens", () => {
    const session = { user: { id: "", name: "Test", email: "test@example.test", emailVerified: null }, expires: new Date() };
    const result = authConfig.callbacks.session({
      session,
      token: { sub: "google-subject", access_token: "synthetic-token" },
    } as unknown as Parameters<typeof authConfig.callbacks.session>[0]);
    expect(result.user.id).toBe("google-subject");
    expect(result).not.toHaveProperty("access_token");
  });

  it("keeps the same Google identity across logins and session reads", () => {
    const jwt = authConfig.callbacks.jwt;
    const first = jwt({ token: { sub: "random-uuid-1" }, account: { provider: "google", providerAccountId: "google-subject" } } as Parameters<typeof jwt>[0]);
    const repeat = jwt({ token: { sub: "random-uuid-2" }, account: { provider: "google", providerAccountId: "google-subject" } } as Parameters<typeof jwt>[0]);
    const read = jwt({ token: first, account: null } as Parameters<typeof jwt>[0]);
    const other = jwt({ token: {}, account: { provider: "google", providerAccountId: "other-subject" } } as Parameters<typeof jwt>[0]);
    expect(first.sub).toBe("google-subject");
    expect(repeat.sub).toBe(first.sub);
    expect(read.sub).toBe(first.sub);
    expect(other.sub).not.toBe(first.sub);
  });

  it("logs only the error category, without token claims or provider details", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("synthetic-private-token-claims"), {
      type: "JWTSessionError", cause: { payload: "synthetic-private-profile" },
    });
    authConfig.logger.error(error);
    expect(log).toHaveBeenCalledExactlyOnceWith("[auth] JWTSessionError");
  });
});
