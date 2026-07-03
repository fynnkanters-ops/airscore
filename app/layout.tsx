import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

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
  title: "AirScore — Immobilien bewerten & rechnen",
  description:
    "Airbnb-Objekte bewerten, Mietwert schätzen, Baufinanzierung & AfA berechnen. Ohne Login, direkt im Browser.",
  manifest: `${BASE}/manifest.json`,
  appleWebApp: { capable: true, title: "AirScore", statusBarStyle: "default" },
  icons: {
    icon: `${BASE}/icon.svg`,
    apple: `${BASE}/icons/icon-180.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

// Anti-FOUC: Theme vor dem ersten Paint setzen (gespeichert oder System).
const themeScript = `try{var t=localStorage.getItem('airscore-theme');if(t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}`;

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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <TopBar />
        <main className="flex-1" style={{ paddingBottom: "calc(var(--nav-h) + 8px)" }}>
          {children}
        </main>
        <BottomNav />
        <PWARegister />
      </body>
    </html>
  );
}
