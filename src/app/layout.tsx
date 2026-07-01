import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteChrome } from "@/components/layout/SiteChrome";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Catálogo Online — Integrado ao Bling",
  description:
    "Catálogo de produtos sincronizado com o Bling. Monte seu carrinho e gere uma solicitação de orçamento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${roboto.variable} h-full`}>
      <body className="min-h-full bg-white font-sans text-slate-900 antialiased">
        <AppProviders>
          <SiteChrome>{children}</SiteChrome>
        </AppProviders>
      </body>
    </html>
  );
}
