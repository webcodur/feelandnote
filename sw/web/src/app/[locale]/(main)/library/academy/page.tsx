/*
  파일명: /app/(main)/library/academy/page.tsx
  기능: 서가 - 학당 카테고리 허브
  책임: 사람이 다뤄온 매체(도서·영상·음악·게임)를 한 줄에 세우고,
        그 모두가 만나는 AI를 다음 장으로 따로 세운다.

  배치 의도 — AI를 매체 옆에 나란히 두면 "다섯 번째 매체"로 읽힌다.
  AI는 매체가 아니라 앞의 넷 전부를 관통하는 다음 국면이므로 줄을 갈라 세운다.

  상호작용 규약 (docs/project/code-rules.md "상호작용" 절):
    - 즉각 반응(transition 없음): 카드 테두리·배경, 아이콘 상자, 제목, 태그 강조.
    - 곁들이는 연출(transition 허용): 하단 금선이 좌에서 우로 차오른다.
    - 개발중 카드는 누를 수 없으므로 hover 반응을 주지 않는다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ACADEMY_CATEGORY_IDS, ACADEMY_UPCOMING_CATEGORY_IDS } from "@/constants/libraryMuseum";
import { BookOpen, Film, Music, Gamepad2, Cpu, GraduationCap } from "lucide-react";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("library.academy");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: await getLocalizedAlternates("/library/academy") };
}

const CATEGORY_ICONS = {
  book: BookOpen,
  video: Film,
  music: Music,
  game: Gamepad2,
  ai: Cpu,
} as const;

/** 앞줄에 서는 매체들. AI는 여기 넣지 않고 아래 다음 장에서 따로 세운다. */
const MEDIA_CATEGORIES = ACADEMY_CATEGORY_IDS.filter((c) => c.id !== "ai");
const AI_CATEGORY = ACADEMY_CATEGORY_IDS.find((c) => c.id === "ai");

const CARD_BASE =
  "relative flex flex-col items-center p-6 sm:p-8 lg:p-6 rounded-2xl border bg-white/[0.03] backdrop-blur-sm";
const CARD_LINK = `group ${CARD_BASE} border-white/10 hover:border-accent/60 hover:bg-white/[0.06]`;
const ICON_BOX =
  "w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 sm:mb-5";
const TAG =
  "px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium bg-white/[0.04] border border-white/[0.06]";

/** 하단 금선 — 곁들이는 연출이라 transition을 쓴다(즉각 축은 테두리·제목이 맡는다) */
function GoldRule() {
  return (
    <div className="mt-auto pt-5 sm:pt-6 w-full">
      <div className="relative h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent">
        <div className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-accent/70 to-transparent transition-[width] duration-500 ease-out group-hover:w-full" />
      </div>
    </div>
  );
}

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
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white mb-3 sm:mb-4 leading-tight">
            {t("pageTitle")}
          </h2>
          <p className="text-white/60 text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            {t("defaultDescription")}
          </p>
        </div>

        {/* 사람이 다뤄온 매체 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-4">
          {MEDIA_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id as keyof typeof CATEGORY_ICONS];
            const firstCourseId = cat.courses[0].id;
            return (
              <Link key={cat.id} href={`/library/academy/${cat.id}/${firstCourseId}`} className={CARD_LINK}>
                <div className={`${ICON_BOX} group-hover:bg-accent/20 group-hover:border-accent/50`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
                </div>

                {/* 카테고리명 — 즉각 반응 축 */}
                <h2 className="text-lg sm:text-xl font-serif font-bold text-white mb-2 group-hover:text-accent">
                  {t(`category.${cat.id}.label`)}
                </h2>
                <p className="text-white/50 text-xs sm:text-sm text-center mb-4 sm:mb-5 group-hover:text-white/70">
                  {t(`category.${cat.id}.description`)}
                </p>

                <div className="flex flex-wrap justify-center gap-1.5">
                  {cat.courses.map((course) => (
                    <span key={course.id} className={`${TAG} text-white/40 group-hover:text-white/70 group-hover:border-white/15 group-hover:bg-white/[0.08]`}>
                      {t(`course.${cat.id}.${course.id}.label`)}
                    </span>
                  ))}
                </div>

                <GoldRule />
              </Link>
            );
          })}

          {/* 코스를 아직 안 만든 매체 — 자리는 세우되 누를 수 없다 */}
          {ACADEMY_UPCOMING_CATEGORY_IDS.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id as keyof typeof CATEGORY_ICONS];
            return (
              <div key={cat.id} className={`${CARD_BASE} border-dashed border-white/10 opacity-60`}>
                <div className={ICON_BOX}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white/40" />
                </div>

                <h2 className="text-lg sm:text-xl font-serif font-bold text-white/70 mb-2">
                  {t(`category.${cat.id}.label`)}
                </h2>
                <p className="text-white/40 text-xs sm:text-sm text-center mb-4 sm:mb-5">
                  {t(`category.${cat.id}.description`)}
                </p>

                <div className="flex flex-wrap justify-center gap-1.5">
                  <span className={`${TAG} text-white/50`}>{t("upcomingBadge")}</span>
                  <span className={`${TAG} text-white/35`}>{t("upcomingNote")}</span>
                </div>

                <div className="mt-auto pt-5 sm:pt-6 w-full">
                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              </div>
            );
          })}
        </div>

        {/* 그 모두가 만나는 다음 장 */}
        {AI_CATEGORY && (
          <div className="mt-12 sm:mt-16 px-4">
            <div className="text-center mb-6 sm:mb-8">
              <div className="mx-auto mb-5 sm:mb-6 h-8 w-[1px] bg-gradient-to-b from-transparent to-accent/50" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white mb-2 sm:mb-3">
                {t("bridgeTitle")}
              </h2>
              <p className="text-white/55 text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                {t("bridgeDesc")}
              </p>
            </div>

            <Link
              href={`/library/academy/${AI_CATEGORY.id}/${AI_CATEGORY.courses[0].id}`}
              className={`${CARD_LINK} sm:flex-row sm:items-center sm:text-left sm:gap-6`}
            >
              <div className={`${ICON_BOX} shrink-0 sm:mb-0 group-hover:bg-accent/20 group-hover:border-accent/50`}>
                <Cpu className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
              </div>

              <div className="flex-1 flex flex-col items-center sm:items-start">
                <h3 className="text-lg sm:text-xl font-serif font-bold text-white mb-2 group-hover:text-accent">
                  {t(`category.${AI_CATEGORY.id}.label`)}
                </h3>
                <p className="text-white/50 text-xs sm:text-sm text-center sm:text-left mb-4 group-hover:text-white/70">
                  {t(`category.${AI_CATEGORY.id}.description`)}
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                  {AI_CATEGORY.courses.map((course) => (
                    <span key={course.id} className={`${TAG} text-white/40 group-hover:text-white/70 group-hover:border-white/15 group-hover:bg-white/[0.08]`}>
                      {t(`course.${AI_CATEGORY.id}.${course.id}.label`)}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
