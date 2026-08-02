"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ACADEMY_CATEGORY_IDS } from "@/constants/libraryMuseum";
import { BookOpen, Film, Music, Cpu, ChevronRight } from "lucide-react";

interface AcademyPreviewProps {
  isSignedIn?: boolean;
}

const CATEGORY_ICONS = {
  book: BookOpen,
  video: Film,
  music: Music,
  ai: Cpu,
} as const;

/*
  학당 미리보기 — 학당 허브(/library/academy)의 카테고리 카드 문법을 그대로 축약한다.
  다른 구획(박물관·기관 선정)처럼 "내용물 격자"로 보여 주고, 배너식 홍보 블록을 쓰지 않는다.
  상호작용 규약: 즉각 반응(테두리·아이콘·제목), 곁들이는 연출(하단 금선)만 transition.
*/
export default function AcademyPreview({ isSignedIn }: AcademyPreviewProps) {
  const t = useTranslations("library.academy");
  const tHub = useTranslations("library.hub");

  return (
    <div className="space-y-6">
      {/* 카테고리 카드 격자 — 학당 본 화면과 동일 문법 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {ACADEMY_CATEGORY_IDS.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id as keyof typeof CATEGORY_ICONS];
          const firstSub = cat.courses[0].id;
          return (
            <Link
              key={cat.id}
              href={`/library/academy/${cat.id}/${firstSub}`}
              className="group relative flex flex-col items-center p-6 rounded-2xl border border-white/[0.08] bg-[#161616]/90 hover:border-accent/40 hover:bg-white/[0.04]"
            >
              {/* 아이콘 */}
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:border-accent/50">
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
                {cat.courses.map((sub) => (
                  <span
                    key={sub.id}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] group-hover:text-white/70 group-hover:border-white/15 group-hover:bg-white/[0.08]"
                  >
                    {t(`course.${cat.id}.${sub.id}.label`)}
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
      </div>

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
