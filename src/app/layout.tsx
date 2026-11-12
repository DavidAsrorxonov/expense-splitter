import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { PageFrame } from "@/components/layout/page-frame";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["sans-serif"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: { default: "Expense Splitter", template: "%s | Expense Splitter" },
  description: "Keep track of shared expenses and see who owes whom.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <SkipLink />
          <SiteHeader />
          <main
            id="main"
            aria-label="Main content"
            tabIndex={-1}
            className="min-w-0 flex-1 py-12 sm:py-16"
          >
            <PageFrame>{children}</PageFrame>
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
