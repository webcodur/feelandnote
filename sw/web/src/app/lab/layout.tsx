/*
  파일명: /app/lab/layout.tsx
  기능: Lab 레이아웃
  책임: Lab 공통 헤더와 탭 네비게이션, 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import LabTabs from "@/components/lab/LabTabs";

interface Props {
  children: ReactNode;
}

export const metadata = { title: "Lab" };

export default function LabLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col items-center py-12 md:py-20 px-4">
      <h1 className="text-3xl md:text-4xl font-cinzel text-[#d4af37] mb-8">Component Lab</h1>

      {/* 탭 네비게이션 */}
      <div className="w-full max-w-6xl">
        <LabTabs />
      </div>

      {/* 탭 콘텐츠 */}
      <div className="w-full max-w-6xl">
        {children}
      </div>
    </div>
  );
}
