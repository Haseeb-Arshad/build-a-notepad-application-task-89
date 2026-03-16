import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Notepad Workspace",
    template: "%s | Notepad Workspace",
  },
  description:
    "A modern, clean notepad foundation built with Next.js for creating, editing, and managing text documents.",
  applicationName: "Notepad Workspace",
  keywords: [
    "notepad",
    "text editor",
    "notes",
    "next.js",
    "local files",
    "rtf",
    "txt",
  ],
  authors: [{ name: "Notepad Workspace" }],
  creator: "Notepad Workspace",
  metadataBase: new URL("http://localhost:3000"),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} app-body`}>
        <div className="app-shell">
          <header className="app-header" role="banner">
            <div className="app-header__inner">
              <div className="app-branding">
                <p className="app-branding__eyebrow">Production Scaffold</p>
                <h1 className="app-branding__title">Notepad Workspace</h1>
              </div>
              <p className="app-header__meta" aria-label="Application status">
                Ready for editor features
              </p>
            </div>
          </header>

          <main className="app-main" role="main">
            {children}
          </main>

          <footer className="app-footer" role="contentinfo">
            <p>
              Built with Next.js App Router · Responsive shell · Accessible design
              baseline
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
