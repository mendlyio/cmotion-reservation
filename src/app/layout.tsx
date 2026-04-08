import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { db } from "@/lib/db";
import { appSettings, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { HelpWidget } from "@/components/HelpWidget";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cmotion Réservation",
  description: "Réservez vos places pour les spectacles de danse Cmotion",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
  const activeEvents = settings?.helpWidgetEnabled
    ? await db.select({ id: events.id, name: events.name, timeInfo: events.timeInfo, eventDate: events.eventDate })
        .from(events)
        .where(eq(events.isActive, true))
    : [];

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        {children}
        {settings?.helpWidgetEnabled && <HelpWidget events={activeEvents} />}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
