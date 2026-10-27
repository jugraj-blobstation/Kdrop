import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
  title: "KDROP — Zero-Knowledge Encrypted Rooms & One-Time Secrets",
  description:
    "Stop leaking passwords and tokens. No accounts, no logs, no tracking. Everything is hardware-encrypted in your browser with AES-256-GCM before leaving your device.",
  keywords: [
    "zero-knowledge",
    "one-time secret",
    "encrypted chat",
    "AES-256-GCM",
    "client-side encryption",
    "ephemeral messaging",
    "burn after reading",
  ],
  authors: [{ name: "KDROP Security" }],
  robots: "noindex, nofollow", // Zero-footprint security
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar />
        <main style={{ flex: "1 0 auto", display: "flex", flexDirection: "column" }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
