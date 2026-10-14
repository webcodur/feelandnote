"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { LAB_ITEMS } from "@/constants/lab";
import LabTabs from "./LabTabs";

/** 본 서비스 뼈대를 검수하는 실험은 페이지가 실제 MainLayout을 사용한다. */
export default function LabLayoutFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (LAB_ITEMS.some(item => item.serviceLayout && pathname === item.href)) return children;

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col items-center py-12 md:py-20 px-4">
      <h1 className="text-3xl md:text-4xl font-cinzel text-[#d4af37] mb-8">Component Lab</h1>
      <div className="w-full max-w-6xl"><LabTabs /></div>
      <div className="w-full max-w-6xl">{children}</div>
    </div>
  );
}
