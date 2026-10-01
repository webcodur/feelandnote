/*
  파일명: /components/features/library/academy/AcademyCategoryTabs.tsx
  기능: 학당 카테고리 탭 (레이아웃용)
  책임: usePathname 기반으로 활성 카테고리를 판별하고 Link 탭을 렌더링한다.
*/ // ------------------------------

"use client";

import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ACADEMY_CATEGORY_IDS } from "@/constants/libraryMuseum";

export default function AcademyCategoryTabs() {
  const t = useTranslations("library.academy.category");
  const academyT = useTranslations("library.academy");
  const pathname = usePathname();

  // pathname: /ko/explore/works/academy/video/lighting → segments[4] = "video"
  const segments = pathname.split("/");
  const academyIdx = segments.indexOf("academy");
  const activeCategoryId = academyIdx >= 0 ? segments[academyIdx + 1] : null;

  return (
    <div role="group" aria-label={academyT("categoryTabsLabel")}>
      <CategoryTabFilter media wrap value={activeCategoryId ?? ""}
        options={ACADEMY_CATEGORY_IDS.map(cat => ({ value: cat.id, label: t(`${cat.id}.label`) }))}
        linkTo={id => {
          const category = ACADEMY_CATEGORY_IDS.find(cat => cat.id === id);
          return category ? `/explore/works/academy/${id}/${category.courses[0].id}` : undefined;
        }} />
    </div>
  );
}
