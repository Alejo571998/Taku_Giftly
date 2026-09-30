import type { Metadata, Viewport } from "next";
import { env } from "@/lib/env";
import { DM_Serif_Display, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { TakuProvider } from "@/components/taku/taku-provider";
import { TakuDock } from "@/components/taku/taku-dock";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#fff8f0",
};

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "Giftly — ¿Qué le regalo?",
    template: "%s · Giftly",
  },
  description:
    "Encontrá un regalo que realmente tenga sentido para esa persona. Decinos quién es, qué le gusta y cuánto querés gastar: la IA te propone ideas, comparamos precios y votás en grupo.",
  applicationName: "Giftly",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Giftly",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={`${jakarta.variable} ${dmSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TakuProvider>
        <TooltipProvider delay={200}>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
          >
            Saltar al contenido
          </a>
          <Header />
          <main id="contenido" className="flex-1">
            {children}
          </main>
          <Footer />
          <TakuDock />
          <Toaster position="bottom-center" richColors />
        </TooltipProvider>
        </TakuProvider>
      </body>
    </html>
  );
}