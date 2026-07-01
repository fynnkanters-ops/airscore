import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// basePath für PWA-Assets (GitHub Pages Unterpfad). Im Dev leer.
const BASE = process.env.NODE_ENV === "production"
  ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "/airscore")
  : "";

export const metadata: Metadata = {
  title: "AirScore — Airbnb-Objekte bewerten",
  description:
    "Bewerte Wohnungen & Apartments für Airbnb/Kurzzeitvermietung: Standort, Nachfrage, Finanzen, Score – ohne Login, direkt im Browser.",
  manifest: `${BASE}/manifest.json`,
  appleWebApp: { capable: true, title: "AirScore", statusBarStyle: "default" },
  icons: {
    icon: `${BASE}/icon.svg`,
    apple: `${BASE}/icons/icon-180.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#0369a1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
