import "./globals.css";
import Link from "next/link";

export const metadata = { title: "GMV Max Online" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <nav className="border-b border-zinc-800">
          <div className="mx-auto flex max-w-6xl gap-1 px-4 py-2 text-sm">
            <Link href="/" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">Dashboard</Link>
            <Link href="/presets" className="rounded-lg px-3 py-1.5 hover:bg-zinc-800">Presets</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
