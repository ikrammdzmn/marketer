import "./globals.css";
import { Suspense } from "react";
import Shell from "./Shell";
import { auth } from "../../auth";
import { isBootstrapAdmin, normalizeEmail } from "@/lib/allowlist-store";

export const metadata = { title: "GMV Max Online" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  const isAdmin = !!email && isBootstrapAdmin(email);

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <Suspense>
          <Shell email={email} isAdmin={isAdmin}>
            {children}
          </Shell>
        </Suspense>
      </body>
    </html>
  );
}
