/*
  파일명: /app/(main)/library/academy/page.tsx
  기능: 지혜의 서가 - 학당 카테고리 허브
  책임: 공개 카테고리 4종(도서/영상/음악/AI) 카드를 표시한다.

  상호작용 규약 (docs/project/code-rules.md "상호작용" 절):
    - 즉각 반응(transition 없음): 카드 테두리·배경, 아이콘 상자, 제목, 태그 강조.
    - 곁들이는 연출(transition 허용): 하단 금선이 좌에서 우로 차오른다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ACADEMY_CATEGORY_IDS } from "@/constants/libraryMuseum";
import { BookOpen, Film, Music, Cpu, GraduationCap } from "lucide-react";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("library.academy");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: await getLocalizedAlternates("/library/academy") };
}

const CATEGORY_ICONS = {
  book: BookOpen,
  video: Film,
  music: Music,
  ai: Cpu,
} as const;

export default async function AcademyPage() {
  const t = await getTranslations("library.academy");

  return (
    <div className="w-full pb-20">
      <div className="w-full max-w-5xl mx-auto py-8 sm:py-12 md:py-20">
        {/* 헤더 */}
        <div className="mb-10 sm:mb-14 md:mb-16 text-center px-4">
          <div className="inline-flex items-center justify-center space-x-2 border border-white/10 bg-white/5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-4 sm:mb-6">
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
            <span className="text-[10px] sm:text-xs text-white/80 font-medium tracking-widest uppercase">{t("eyebrow")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white mb-3 sm:mb-4 leading-tight">
            {t("pageTitle")}
          </h1>
          <p className="text-white/60 text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            {t("defaultDescription")}
          </p>
        </div>

        {/* 카테고리 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-4">
          {ACADEMY_CATEGORY_IDS.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id as keyof typeof CATEGORY_ICONS];
            const firstSub = cat.courses[0].id;
            return (
              <Link
                key={cat.id}
                href={`/library/academy/${cat.id}/${firstSub}`}
                className="group relative flex flex-col items-center p-6 sm:p-8 lg:p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:border-accent/60 hover:bg-white/[0.06]"
              >
                {/* 아이콘 */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 sm:mb-5 group-hover:bg-accent/20 group-hover:border-accent/50">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
                </div>

                {/* 카테고리명 — 즉각 반응 축 */}
                <h2 className="text-lg sm:text-xl font-serif font-bold text-white mb-2 group-hover:text-accent">
                  {t(`category.${cat.id}.label`)}
                </h2>
                <p className="text-white/50 text-xs sm:text-sm text-center mb-4 sm:mb-5 group-hover:text-white/70">
                  {t(`category.${cat.id}.description`)}
                </p>

                {/* 서브카테고리 태그 */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {cat.courses.map((sub) => (
                    <span
                      key={sub.id}
                      className="px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] group-hover:text-white/70 group-hover:border-white/15 group-hover:bg-white/[0.08]"
                    >
                      {t(`course.${cat.id}.${sub.id}.label`)}
                    </span>
                  ))}
                </div>

                {/* 하단 장식 — 금선이 좌에서 우로 차오른다 */}
                <div className="mt-auto pt-5 sm:pt-6 w-full">
                  <div className="relative h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent">
                    <div className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-accent/70 to-transparent transition-[width] duration-500 ease-out group-hover:w-full" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
