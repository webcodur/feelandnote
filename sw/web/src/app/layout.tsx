/*
  파일명: /app/layout.tsx
  기능: 루트 레이아웃
  책임: HTML 기본 구조와 전역 스타일을 적용한다.
*/ // ------------------------------

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feel&Note",
  description: "Cultural Content Archive & Social Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
