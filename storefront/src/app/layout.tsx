import type { Metadata, Viewport } from "next";
import { CartProvider } from "@/components/cart-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/header/SiteHeader";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { SiteChrome } from "@/components/site-chrome";
import { Suspense } from "react";
import { CouponLinkCapture } from "@/components/CouponLinkCapture";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { MobileZoomLock } from "@/components/MobileZoomLock";
import { TrackingScripts } from "@/components/TrackingScripts";
import { getPublicTracking } from "@/lib/server/tracking-settings";
import "./globals.css";

export const metadata: Metadata = {
  title: "DinoBlack Games e Informática",
  description:
    "Loja DinoBlack — Consoles, PC Gamer, Retro e Notebooks. Novos e seminovos.",
};

// Trava o zoom por pinça e por toque duplo no celular; a página não é ampliada nem deslocada.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tracking = await getPublicTracking();
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("dinoblack-theme-v2");if(t!=="dark"){t="light"}document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="min-h-screen bg-[#f1f3f6] antialiased dark:bg-[#050507]"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <CartProvider>
            <SiteChrome header={<SiteHeader />} footer={<SiteFooter />} scripts={<TrackingScripts config={tracking} />}>
              {children}
            </SiteChrome>
            <MobileZoomLock />
            <CouponLinkCapture />
            <Suspense fallback={null}><AnalyticsTracker /></Suspense>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
