/*
  파일명: /app/layout.tsx
  기능: 루트 레이아웃 (shell)
  책임: HTML 기본 구조와 폰트를 적용한다. locale/metadata는 [locale]/layout.tsx에서 처리.
*/ // ------------------------------

import Script from "next/script";
import { Cinzel, Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond, Castoro_Titling } from "next/font/google";
import localFont from "next/font/local";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Cinzel (English Headings - 권위적/신전 느낌)
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

// Cormorant Garamond (로고용 - 고전 서적/필사본 느낌)
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

// Noto Serif KR (Korean Headings/Body - 명조체)
const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-noto-serif",
  display: "swap",
});

// Noto Sans KR (Korean Body - 고딕체)
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

// Castoro Titling (Inscriptional Caps - 권위적/비석 느낌)
const castoro = Castoro_Titling({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-castoro",
  display: "swap",
});

// 마루부리 폰트
const maruburi = localFont({
  src: [
    { path: "../fonts/MaruBuriOTF/MaruBuri-Regular.otf", weight: "400" },
    { path: "../fonts/MaruBuriOTF/MaruBuri-SemiBold.otf", weight: "600" },
  ],
  variable: "--font-maruburi",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${cinzel.variable} ${cormorant.variable} ${notoSerifKr.variable} ${notoSansKr.variable} ${maruburi.variable} ${castoro.variable}`}>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3751045783335791"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
