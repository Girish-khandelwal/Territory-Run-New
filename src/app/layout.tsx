import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/layout/Providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Territory Run",
  description: "GPS Fitness Tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* 🔥 REQUIRED for Mapbox (future step) */}
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>

      <body className="min-h-full flex flex-col bg-slate-950">
        <Providers>
          {children}
        </Providers>

        {/* 🔥 Keep toaster outside for cleaner tree */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
      </body>
    </html>
  );
}