import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const authConfig = {
  providers: [
    Google({
      authorization: {
        params: { scope: "openid email profile", prompt: "select_account" },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/login", error: "/login" },
  logger: {
    error(error) {
      // Auth.js error causes may include token claims or provider responses.
      const category = "type" in error && typeof error.type === "string" ? error.type : "AuthError";
      console.error(`[auth] ${category}`);
    },
  },
  callbacks: {
    jwt({ token, account }) {
      // Without an adapter Auth.js generates a new user UUID on each login.
      // Keep the verified Google subject stable across first/repeated access.
      if (account?.provider === "google") token.sub = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      // Google subject identifies the account; email is only for display.
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
