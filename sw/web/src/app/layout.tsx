/*
  파일명: /app/layout.tsx
  기능: 루트 레이아웃
  책임: HTML 기본 구조와 전역 스타일을 적용한다.
*/ // ------------------------------

import type { Metadata } from "next";
import { Cinzel, Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond, Castoro_Titling } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SoundProvider } from "@/contexts/SoundContext";
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
    url: "https://feelandnote.com", // 실 운영 도메인으로 변경 예정
    siteName: "Feel&Note",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Feel&Note",
    description: "Cultural Content Archive & Social Platform",
  },
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
        <SoundProvider>
          {children}
          <Footer />
        </SoundProvider>
      </body>
    </html>
  );
}
