/*
  파일명: /components/features/library/academy/AcademyCategoryTabs.tsx
  기능: 학당 카테고리 탭 (레이아웃용)
  책임: usePathname 기반으로 활성 카테고리를 판별하고 Link 탭을 렌더링한다.
*/ // ------------------------------

"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ACADEMY_CATEGORY_IDS } from "@/constants/libraryMuseum";

export default function AcademyCategoryTabs() {
  const t = useTranslations("library.academy.category");
  const academyT = useTranslations("library.academy");
  const pathname = usePathname();

  // pathname: /ko/library/academy/video/lighting → segments[4] = "video"
  const segments = pathname.split("/");
  const academyIdx = segments.indexOf("academy");
  const activeCategoryId = academyIdx >= 0 ? segments[academyIdx + 1] : null;

  return (
    <div className="flex justify-center overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
      <div
        aria-label={academyT("categoryTabsLabel")}
        className="inline-flex p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner gap-1 min-w-max"
        role="group"
      >
        {ACADEMY_CATEGORY_IDS.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          const firstCourse = cat.courses[0].id;
          return (
            <Link
              key={cat.id}
              href={`/library/academy/${cat.id}/${firstCourse}`}
              className={`
                relative px-4 py-2 rounded-lg text-sm font-bold
                flex items-center justify-center leading-tight min-w-[60px]
                ${isActive
                  ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                  : "text-text-secondary hover:text-white hover:bg-white/5"
                }
              `}
            >
              <span className={`flex items-center gap-1.5 ${isActive ? "font-serif text-black" : "font-sans"}`}>
                {t(`${cat.id}.label`)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
