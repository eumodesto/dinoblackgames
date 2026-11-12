import type { Metadata } from "next";
import { Nunito_Sans, Rubik } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/header/SiteHeader";
import { SiteFooter } from "@/components/footer/SiteFooter";
import { SiteChrome } from "@/components/site-chrome";
import "./globals.css";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "DinoBlack Games e Informática",
  description:
    "Loja DinoBlack — Consoles, PC Gamer, Retro e Notebooks. Novos e seminovos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        className={`${nunito.variable} ${rubik.variable} min-h-screen bg-[#f1f3f6] antialiased dark:bg-[#050507]`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <CartProvider>
            <SiteChrome header={<SiteHeader />} footer={<SiteFooter />}>
              {children}
            </SiteChrome>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
