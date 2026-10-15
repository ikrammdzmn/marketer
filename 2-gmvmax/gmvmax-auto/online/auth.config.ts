import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  cookies: {
    sessionToken: {
      options: { maxAge: 30 * 24 * 60 * 60 },
    },
  },
  pages: { signIn: "/sign-in" },
  trustHost: true,
} satisfies NextAuthConfig;
