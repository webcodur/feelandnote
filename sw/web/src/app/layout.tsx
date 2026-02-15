/*
  파일명: /app/layout.tsx
  기능: 루트 레이아웃
  책임: HTML 기본 구조와 전역 스타일을 적용한다.
*/ // ------------------------------

import type { Metadata } from "next";
import { Cinzel, Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond, Castoro_Titling } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Footer from "@/components/ui/Layout/Footer";

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


// 마루부리 폰트 (기존 유지 - 필요시 사용)
const maruburi = localFont({
  src: [
    { path: "../fonts/MaruBuriOTF/MaruBuri-Regular.otf", weight: "400" },
    { path: "../fonts/MaruBuriOTF/MaruBuri-SemiBold.otf", weight: "600" },
  ],
  variable: "--font-maruburi",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://feelandnote.com"),
  title: {
    default: "Feel&Note",
    template: "%s",
  },
  description: "Cultural Content Archive & Social Platform",
  openGraph: {
    title: "Feel&Note",
    description: "당신의 문화 기록을 남기고, 영감을 발견하세요.",
    url: "https://feelandnote.com",
    siteName: "Feel&Note",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Feel&Note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Feel&Note",
    description: "Cultural Content Archive & Social Platform",
    images: ["/opengraph-image"],
  },
  verification: {
    google: "Rstp-6NcSTn3BTPnDH06HS5PN2goDih-CVNg", // Google Search Console HTML 태그 인증용
    other: {
      "naver-site-verification": "YOUR_VERIFICATION_CODE", // TODO: 네이버 서치어드바이저에서 발급받은 코드로 교체해주세요.
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  keywords: ["culture", "archive", "note", "review", "book", "movie", "music", "game", "celebrity", "inspiration", "문화", "기록", "감상", "영감", "필앤노트"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth" className={`${cinzel.variable} ${cormorant.variable} ${notoSerifKr.variable} ${notoSansKr.variable} ${maruburi.variable} ${castoro.variable}`}>
      <head />
      <body>
          {children}
          <Footer />
      </body>
    </html>
  );
}
