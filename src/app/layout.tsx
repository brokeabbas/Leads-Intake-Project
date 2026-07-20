import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Lead Intake & Qualification",
  description: "Lead intake, enrichment, scoring, dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Lead Intake
            </Link>

            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                Submit
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
