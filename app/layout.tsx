import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import { LanguageProvider } from "@/components/language-provider";
import { TelegramTheme } from "@/components/telegram-theme";
import "./globals.css";

// Self-hosted by next/font (no request to Google at runtime). Variable font, so every
// weight the UI uses (400-700) comes from one file. Cyrillic for RU, latin-ext for UZ.
const manrope = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Job Applier",
  description: "Telegram Mini App for job seekers",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={`${manrope.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TelegramTheme />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}