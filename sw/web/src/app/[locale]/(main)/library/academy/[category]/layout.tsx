/*
  파일명: /app/(main)/library/academy/[category]/layout.tsx
  기능: 학당 카테고리 레이아웃
  책임: 페이지 제목 + 카테고리 탭을 레이아웃으로 유지하여 코스 전환 시 리로드를 방지한다.
*/ // ------------------------------

import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import AcademyCategoryTabs from "@/components/features/library/academy/AcademyCategoryTabs";

interface Props {
  children: ReactNode;
}

export default async function AcademyCategoryLayout({ children }: Props) {
  const t = await getTranslations("library.academy");

  return (
    <div className="w-full max-w-5xl mx-auto pt-8 sm:pt-12 md:pt-20">
      {/* 제목 + 카테고리 탭 (레이아웃 — 코스 전환 시 유지) */}
      <div className="mb-6 sm:mb-8 text-center px-4">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white mb-6 sm:mb-8 leading-tight"
          id="academy-title"
        >
          {t("pageTitle")}
        </h2>
        <AsyncIntlProvider>
          <AcademyCategoryTabs />
        </AsyncIntlProvider>
      </div>

      {children}
    </div>
  );
}
