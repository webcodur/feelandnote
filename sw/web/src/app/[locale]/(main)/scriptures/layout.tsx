/*
  파일명: /app/(main)/scriptures/layout.tsx
  기능: 지혜의 서가 레이아웃
  책임: 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import HubBackLink from "@/components/shared/HubBackLink";
import TreeBanner from "@/components/lab/TreeBanner";
import PageBanner from "@/components/shared/PageBanner";
import { getTranslations } from "next-intl/server";

interface Props {
  children: ReactNode;
}

export default async function ScripturesLayout({ children }: Props) {
  const tNav = await getTranslations("nav");
  const tHome = await getTranslations("home");
  const title = tNav("scriptures");
  const englishTitle = tHome("scriptures.englishTitle");

  return (
    <>
      <PageBanner title={title} subtitle={englishTitle}>
        <TreeBanner compact>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
            {title}
          </h1>
          {title.toLowerCase() !== englishTitle.toLowerCase() && (
            <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
              {englishTitle}
            </p>
          )}
        </TreeBanner>
      </PageBanner>
      <PageContainer>
        <HubBackLink hubPath="/scriptures" label={title} />
        {children}
      </PageContainer>
    </>
  );
}
