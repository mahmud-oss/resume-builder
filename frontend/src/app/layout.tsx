import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Lato, Merriweather, Open_Sans, Source_Serif_4 } from "next/font/google";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/app/AppShell";
import { SiteHeader } from "@/components/app/SiteHeader";
import { BRAND } from "@/lib/brand";

import "./globals.css";

// The fonts users can pick for their resume (see lib/resume/design.ts), plus Inter for the app itself.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"], display: "swap" });
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [inter, lato, openSans, merriweather, sourceSerif].map((f) => f.variable).join(" ");
  return (
    <html lang="en" className={`${fonts} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><AuthProvider>
          <Suspense fallback={null}>
            <SiteHeader />
          </Suspense>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
