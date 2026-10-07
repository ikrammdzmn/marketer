import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { isBootstrapAdmin, isAllowlistedEmail, normalizeEmail } from "@/lib/allowlist-store";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return false;
      const googleProfile = profile as { email_verified?: boolean } | undefined;
      if (googleProfile?.email_verified !== true) return false;

      const email = normalizeEmail(user.email);
      if (!email) return false;
      return isBootstrapAdmin(email) || isAllowlistedEmail(email);
    },
  },
});
