import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JwtProvider, useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { serverEnv } from "./env/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vincent App - VAS Liquidation",
  description: "Frontend application for Vincent Algorithmic Stablecoin liquidation",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <JwtProvider appId={serverEnv.VINCENT_APP_ID}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
      </JwtProvider>
    </html>
  );
}
