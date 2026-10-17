import "./globals.css";
import { Suspense } from "react";
import Shell from "./Shell";
import { auth } from "../../auth";
import { getDisplayName, isBootstrapAdmin, normalizeEmail } from "@/lib/allowlist-store";

export const metadata = { title: "GMV Max Online" };
export const viewport = { themeColor: "#09090b" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  const isAdmin = !!email && isBootstrapAdmin(email);
  const displayName = email ? await getDisplayName(email) : null;

  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body className="bg-zinc-950 text-zinc-100">
        <Suspense>
          <Shell email={email} displayName={displayName} isAdmin={isAdmin}>
            {children}
          </Shell>
        </Suspense>
      </body>
    </html>
  );
}
