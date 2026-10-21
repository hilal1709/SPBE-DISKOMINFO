import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { RealtimeSync } from "@/components/realtime/realtime-sync";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

/** Sembunyikan kartu petunjuk dashboard yang pernah ditutup sebelum halaman tampil (components/dashboards/probis/explore-hint.tsx). */
const HINT_SCRIPT = `try{var c="";for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/-hint$/.test(k)&&localStorage.getItem(k)==="1")c+='[data-hint="'+k.replace(/"/g,"")+'"]{display:none!important}'}if(c){var s=document.createElement("style");s.textContent=c;document.head.appendChild(s)}}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.shortName}` },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.organization.name }],
  creator: siteConfig.organization.name,
  publisher: siteConfig.organization.parent,
  category: "government",
  openGraph: { type: "website", locale: siteConfig.locale, siteName: siteConfig.name, title: siteConfig.name, description: siteConfig.description },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: siteConfig.themeColor };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HINT_SCRIPT }} />
      </head>
      <body>
        {/* Tanpa JavaScript, elemen beranimasi tetap harus terlihat. */}
        <noscript>
          <style>{"[data-reveal],[data-aos]{opacity:1!important;transform:none!important;filter:none!important}"}</style>
        </noscript>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="bottom-right" closeButton />
        <RealtimeSync />
      </body>
    </html>
  );
}
