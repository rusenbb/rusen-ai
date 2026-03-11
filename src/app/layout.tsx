import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import DataBackground from "./components/DataBackground";
import SiteTerminal from "./components/SiteTerminal";
import { THEME_STORAGE_KEY } from "./components/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rusen.ai"),
  title: "Rusen.ai - AI & Data Engineering Portfolio",
  description: "Interactive AI demos and experiments by Rusen Birben. Explore machine learning tools that run in your browser.",
  openGraph: {
    title: "Rusen.ai - AI & Data Engineering Portfolio",
    description:
      "Interactive AI demos and experiments by Rusen Birben. Explore machine learning tools that run in your browser.",
    url: "https://rusen.ai",
    siteName: "Rusen.ai",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Rusen.ai",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rusen.ai - AI & Data Engineering Portfolio",
    description:
      "Interactive AI demos and experiments by Rusen Birben. Explore machine learning tools that run in your browser.",
    images: ["/twitter.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/game-of-life/graph.png" fetchPriority="high" />
        <link rel="preload" as="image" href="/game-of-life/anim.png" fetchPriority="high" />
        <link rel="preload" as="image" href="/game-of-life/loc.png" fetchPriority="high" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const stored = localStorage.getItem("${THEME_STORAGE_KEY}");
                  const resolved = stored === "light" || stored === "dark"
                    ? stored
                    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
                  document.documentElement.dataset.theme = resolved;
                  document.documentElement.style.colorScheme = resolved;
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <DataBackground />
        <SiteTerminal />
        <div className="content-shell relative z-10 min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 relative">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
