import type { Metadata } from "next";
import { Agentation } from "agentation";
import { cookies } from "next/headers";
import { Manrope, Space_Grotesk } from "next/font/google";
import { SettingsFlashToast } from "@/components/settings/settings-flash-toast";
import { parseSettingsToast, SETTINGS_TOAST_COOKIE } from "@/lib/settings-toast";
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
  title: "boyce dashboard",
  description: "A compact feed for sources, signals, and watchlist settings.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialToast = parseSettingsToast(cookieStore.get(SETTINGS_TOAST_COOKIE)?.value);

  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} min-h-screen antialiased`}>
        {children}
        <SettingsFlashToast key={initialToast?.id ?? "settings-toast-empty"} initialToast={initialToast} />
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
