"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ACADEMY_CATEGORY_IDS, ACADEMY_UPCOMING_CATEGORY_IDS } from "@/constants/libraryMuseum";
import { BookOpen, Film, Music, Gamepad2, Cpu, ChevronRight } from "lucide-react";

interface AcademyPreviewProps {
  isSignedIn?: boolean;
}

const CATEGORY_ICONS = {
  book: BookOpen,
  video: Film,
  music: Music,
  game: Gamepad2,
  ai: Cpu,
} as const;

/** 앞줄에 서는 매체들. AI는 여기 넣지 않고 아래 다음 장에서 따로 세운다(본 화면과 같은 배치). */
const MEDIA_CATEGORIES = ACADEMY_CATEGORY_IDS.filter((c) => c.id !== "ai");
const AI_CATEGORY = ACADEMY_CATEGORY_IDS.find((c) => c.id === "ai");

const CARD_BASE = "relative flex flex-col items-center p-6 rounded-2xl border bg-[#161616]/90";
const CARD_LINK = `group ${CARD_BASE} border-white/[0.08] hover:border-accent/40 hover:bg-white/[0.04]`;
const ICON_BOX = "w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4";
const TAG = "px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/[0.04] border border-white/[0.06]";
const TAG_HOVER = "text-white/40 group-hover:text-white/70 group-hover:border-white/15 group-hover:bg-white/[0.08]";

/*
  학당 미리보기 — 학당 허브(/library/academy)의 카테고리 카드 문법을 그대로 축약한다.
  본 화면과 마찬가지로 매체(도서·영상·음악·게임)와 AI를 줄로 가른다. AI를 매체 옆에
  나란히 두면 "다섯 번째 매체"로 읽히기 때문이다.
  다른 구획(박물관·기관 선정)처럼 "내용물 격자"로 보여 주고, 배너식 홍보 블록을 쓰지 않는다.
  상호작용 규약: 즉각 반응(테두리·아이콘·제목), 곁들이는 연출(하단 금선)만 transition.
*/
export default function AcademyPreview({ isSignedIn }: AcademyPreviewProps) {
  const t = useTranslations("library.academy");
  const tHub = useTranslations("library.hub");

  return (
    <div className="space-y-6">
      {/* 사람이 다뤄온 매체 — 학당 본 화면과 동일 문법 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {MEDIA_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id as keyof typeof CATEGORY_ICONS];
          const firstCourseId = cat.courses[0].id;
          return (
            <Link key={cat.id} href={`/library/academy/${cat.id}/${firstCourseId}`} className={CARD_LINK}>
              <div className={`${ICON_BOX} group-hover:bg-accent/20 group-hover:border-accent/50`}>
                <Icon className="w-6 h-6 text-accent" />
              </div>

              {/* 카테고리명 — 즉각 반응 축 */}
              <h3 className="text-lg font-serif font-bold text-white mb-1.5 group-hover:text-accent">
                {t(`category.${cat.id}.label`)}
              </h3>
              <p className="text-white/50 text-xs text-center mb-4 group-hover:text-white/70 leading-relaxed break-keep">
                {t(`category.${cat.id}.description`)}
              </p>

              {/* 과목 태그 */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {cat.courses.map((course) => (
                  <span key={course.id} className={`${TAG} ${TAG_HOVER}`}>
                    {t(`course.${cat.id}.${course.id}.label`)}
                  </span>
                ))}
              </div>

              {/* 하단 장식 — 금선이 좌에서 우로 차오른다 */}
              <div className="mt-auto pt-5 w-full">
                <div className="relative h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent">
                  <div className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-accent/70 to-transparent transition-[width] duration-500 ease-out group-hover:w-full" />
                </div>
              </div>
            </Link>
          );
        })}

        {/* 코스를 아직 안 만든 매체 — 자리는 세우되 누를 수 없다 */}
        {ACADEMY_UPCOMING_CATEGORY_IDS.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id as keyof typeof CATEGORY_ICONS];
          return (
            <div key={cat.id} className={`${CARD_BASE} border-dashed border-white/[0.08] opacity-60`}>
              <div className={ICON_BOX}>
                <Icon className="w-6 h-6 text-white/40" />
              </div>

              <h3 className="text-lg font-serif font-bold text-white/70 mb-1.5">
                {t(`category.${cat.id}.label`)}
              </h3>
              <p className="text-white/40 text-xs text-center mb-4 leading-relaxed break-keep">
                {t(`category.${cat.id}.description`)}
              </p>

              <div className="flex flex-wrap justify-center gap-1.5">
                <span className={`${TAG} text-white/50`}>{t("upcomingBadge")}</span>
              </div>

              <div className="mt-auto pt-5 w-full">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 그 모두가 만나는 다음 장 — 본 화면의 이음말을 한 줄로 줄인다 */}
      {AI_CATEGORY && (
        <Link
          href={`/library/academy/${AI_CATEGORY.id}/${AI_CATEGORY.courses[0].id}`}
          className={`${CARD_LINK} sm:flex-row sm:items-center sm:gap-5`}
        >
          <div className={`${ICON_BOX} shrink-0 sm:mb-0 group-hover:bg-accent/20 group-hover:border-accent/50`}>
            <Cpu className="w-6 h-6 text-accent" />
          </div>

          <div className="flex-1 flex flex-col items-center sm:items-start">
            <h3 className="text-lg font-serif font-bold text-white mb-1.5 group-hover:text-accent">
              {t("bridgeTitle")}
            </h3>
            <p className="text-white/50 text-xs text-center sm:text-left mb-3 group-hover:text-white/70 leading-relaxed break-keep">
              {t(`category.${AI_CATEGORY.id}.description`)}
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
              {AI_CATEGORY.courses.map((course) => (
                <span key={course.id} className={`${TAG} ${TAG_HOVER}`}>
                  {t(`course.${AI_CATEGORY.id}.${course.id}.label`)}
                </span>
              ))}
            </div>
          </div>
        </Link>
      )}

      {/* 로그인 상태에서만: 이어보기 지름길 — 다른 구획의 보조 버튼과 같은 결 */}
      {isSignedIn && (
        <div className="flex justify-center">
          <Link
            href="/library/academy"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold hover:bg-accent hover:text-[#121212] transition-colors duration-300"
          >
            {tHub("continueLearning")}
            <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
