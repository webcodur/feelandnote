/*
  파일명: /components/features/scriptures/Scriptures/shared.tsx
  기능: Scriptures 내부 공유 UI 컴포넌트
  책임: SectionSkeleton, ScriptureSectionHeader
*/ // ------------------------------

import ContentGrid from "@/components/ui/ContentGrid";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

// #region Section Skeleton
export function SectionSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={rowIndex > 0 ? "mt-8" : ""}>
          <div className="h-5 w-24 bg-bg-card rounded mb-4" />
          <ContentGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
            ))}
          </ContentGrid>
        </div>
      ))}
    </div>
  );
}
// #endregion

// #region Section Header
export function ScriptureSectionHeader({ sectionKey, icon: Icon, extra }: { sectionKey: string; icon: LucideIcon; extra?: React.ReactNode }) {
  const t = useTranslations("scriptures.page.section");

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className="text-accent" />
        <h2 className="text-lg md:text-xl font-serif font-bold text-text-primary">{t(`${sectionKey}.label`)}</h2>
        {extra}
      </div>
      <p className="text-sm text-text-secondary mb-6">{t(`${sectionKey}.description`)}</p>
    </>
  );
}
// #endregion
