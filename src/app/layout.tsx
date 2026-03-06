import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { appConfig } from "@/lib/env";
import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${appConfig.name} | AI & competitor watchfloor`,
  description:
    "Signal Deck aggregates AI UX/UI, logistics navigation, and competitor movement into one decision-oriented workbench.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
