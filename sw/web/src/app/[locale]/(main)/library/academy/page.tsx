/*
  파일명: /app/(main)/scriptures/academy/page.tsx
  기능: 지혜의 서가 - 학당 카테고리 허브
  책임: 카테고리 3종(도서/영상/음악) 카드를 표시하고 각 레슨 페이지로 연결한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ACADEMY_CATEGORY_IDS } from "@/constants/scripturesMuseum";
import { BookOpen, Film, Music, GraduationCap } from "lucide-react";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.academy");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: await getLocalizedAlternates("/library/academy") };
}

const CATEGORY_ICONS = {
  book: BookOpen,
  video: Film,
  music: Music,
} as const;

export default async function AcademyPage() {
  const t = await getTranslations("scriptures.academy");

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 px-4">
          {ACADEMY_CATEGORY_IDS.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id as keyof typeof CATEGORY_ICONS];
            const firstSub = cat.courses[0].id;
            return (
              <Link
                key={cat.id}
                href={`/library/academy/${cat.id}/${firstSub}`}
                className="group relative flex flex-col items-center p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm"
              >
                {/* 아이콘 */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mb-4 sm:mb-5">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#d4af37]" />
                </div>

                {/* 카테고리명 */}
                <h2 className="text-lg sm:text-xl font-serif font-bold text-white mb-2">
                  {t(`category.${cat.id}.label`)}
                </h2>
                <p className="text-white/50 text-xs sm:text-sm text-center mb-4 sm:mb-5">
                  {t(`category.${cat.id}.description`)}
                </p>

                {/* 서브카테고리 태그 */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {cat.courses.map((sub) => (
                    <span
                      key={sub.id}
                      className="px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium text-white/40 bg-white/[0.04] border border-white/[0.06]"
                    >
                      {t(`course.${cat.id}.${sub.id}.label`)}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
