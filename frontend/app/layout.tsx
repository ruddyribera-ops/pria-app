import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RootLayoutClient } from "./layout-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PRIA v7 - Planificación Curricular Neuroincluyente",
  description: "Sistema de planificación curricular con perfiles de accesibilidad neuroincluyentes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Preload theme CSS files for faster switching */}
        <link rel="prefetch" href="/themes/dislexia.css" />
        <link rel="prefetch" href="/themes/adhd.css" />
        <link rel="prefetch" href="/themes/tea.css" />
        <link rel="prefetch" href="/themes/dyscalculia.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
