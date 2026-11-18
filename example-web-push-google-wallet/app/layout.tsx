import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "Web Push Provisioning Google",
  description: "Example of Google Pay Web Push Provisioning",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="h-svh bg-canvas sm:flex sm:items-center sm:px-4 sm:py-10">
        {/*
          Librería de Google Pay Unified Web Push Provisioning (window.googlepay).
          Se descarga de Google y se sirve desde este sitio (ver el quick start de Google).
          Tiene que estar cargada antes de que el usuario haga click en "Agregar a Google Pay".
          https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#quick_start
        */}
        <Script src="/integration-1.6.min.js" strategy="beforeInteractive" />

        <main className="relative mx-auto flex h-svh w-full max-w-[440px] flex-col overflow-hidden bg-background sm:h-full sm:max-h-[956px] sm:rounded-[2.5rem] sm:border sm:shadow-2xl">
          {children}
        </main>
      </body>
    </html>
  );
}
