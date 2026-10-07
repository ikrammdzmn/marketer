import "./globals.css";
import Link from "next/link";
import { auth, signOut } from "../../auth";
import { isBootstrapAdmin, normalizeEmail } from "@/lib/allowlist-store";

export const metadata = { title: "GMV Max Online" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  const isAdmin = !!email && isBootstrapAdmin(email);

  async function logOut() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <nav className="border-b border-zinc-800">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-2 text-sm">
            <Link href="/" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">Dashboard</Link>
            <Link href="/presets" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">Presets</Link>
            {isAdmin && <Link href="/access" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">Access</Link>}
            <span className="ml-auto px-2 text-xs text-zinc-400">{email || ""}</span>
            {email ? (
              <form action={logOut}>
                <button className="rounded-lg px-3 py-1.5 text-zinc-300 hover:bg-zinc-800">Sign out</button>
              </form>
            ) : (
              <Link href="/sign-in" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">Sign in</Link>
            )}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
