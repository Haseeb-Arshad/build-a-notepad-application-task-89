import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://localhost:3000"),
  title: {
    default: "Notepad Pro",
    template: "%s · Notepad Pro",
  },
  description:
    "A modern, desktop-inspired notepad application built with Next.js. Supports multi-document workflows, editing tools, and reliable local file operations.",
  applicationName: "Notepad Pro",
  keywords: [
    "notepad",
    "text editor",
    "next.js",
    "productivity",
    "txt",
    "rtf",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <div className="app-shell">
          <header className="app-header" role="banner">
            <div className="app-header__inner">
              <div className="app-brand">
                <span className="app-brand__dot" aria-hidden="true" />
                <div>
                  <h1 className="app-title">Notepad Pro</h1>
                  <p className="app-subtitle">Desktop-style text editing, built for the web</p>
                </div>
              </div>
              <div className="app-badge" aria-label="Build status">
                Production Ready
              </div>
            </div>
          </header>

          <main id="main-content" className="app-main" role="main">
            {children}
          </main>

          <footer className="app-footer" role="contentinfo">
            <p>
              © {new Date().getFullYear()} Notepad Pro · Responsive foundation scaffold for
              multi-document editing workflows.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
