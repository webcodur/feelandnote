/*
  파일명: /components/features/user/explore/hub/PersonaExtremeGrid/sections/AxisExtremeCard.tsx
  기능: 일반 축 극단 카드
  책임: 1위 인물 + 차순위 1명 표시, 클릭 시 퀵뷰 호출.
*/ // ------------------------------

"use client";

import Image from "next/image";
import type { PersonaExtremeEntry } from "@/actions/home/getPersonaExtremes";
import { AXIS_SHORT_LABELS } from "../../../personaAxis";

export default function AxisExtremeCard({
  entry, locale, color, onCardClick
}: {
  entry: PersonaExtremeEntry; locale: string; color: string;
  onCardClick: (entry: PersonaExtremeEntry, isOpposing: boolean, color: string) => void;
}) {
  const shortLabelObj = AXIS_SHORT_LABELS[entry.axis];
  const label = shortLabelObj
    ? (locale === "en" ? shortLabelObj.en : shortLabelObj.ko)
    : (locale === "en" ? entry.label.en : entry.label.ko);

  const name =
    locale === "en" && entry.celeb.nickname_en
      ? entry.celeb.nickname_en
      : entry.celeb.nickname;
  const reason =
    locale === "en" ? entry.reason.en : entry.reason.ko;

  return (
    <button
      onClick={() => onCardClick(entry, false, color)}
      className="group relative flex flex-col items-center bg-bg-card/40 hover:bg-bg-card/80 border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden transition-[border-color,background-color,box-shadow,transform] duration-200 hover:duration-500 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(var(--axis-color-rgb),0.25)] text-left max-w-[280px] sm:max-w-[300px] mx-auto w-full p-4 sm:p-5"
      style={{
        ["--axis-color" as string]: color,
      }}
    >
      {/* 배경 글로우 — 축 컬러 */}
      <div
        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      {/* 수치 명칭 (카드 상단) */}
      <span
        className="relative z-10 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black tracking-widest border shadow-md mb-3"
        style={{
          backgroundColor: `${color}20`,
          borderColor: `${color}40`,
          color,
          textShadow: `0 0 12px ${color}60`,
        }}
      >
        {label}
      </span>

      {/* 인물 이미지 */}
      <div className="relative z-10 w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-xl overflow-hidden bg-black border border-white/5 shadow-lg mb-3">
        {entry.celeb.avatar_url ? (
          <Image
            src={entry.celeb.avatar_url}
            alt={name}
            fill
            sizes="120px"
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-serif bg-white/5">
            {name.charAt(0)}
          </div>
        )}
      </div>

      {/* 인물 이름 */}
      <h3 className="relative z-10 text-sm sm:text-base font-black text-text-primary truncate max-w-full mb-1">
        {name}
      </h3>

      {/* 점수 (인물 아래) */}
      <div className="relative z-10 flex items-baseline gap-1 mb-2" style={{ color }}>
        <span className="text-xl sm:text-2xl font-black tabular-nums leading-none tracking-tighter">{entry.score}</span>
        <span className="text-[9px] sm:text-[10px] font-bold uppercase opacity-70">pts</span>
      </div>


      {/* 채점 사유 */}
      {reason && (
        <p className="relative z-10 text-[12px] sm:text-[13px] text-text-secondary leading-snug text-center line-clamp-2 mb-3">
          {reason}
        </p>
      )}

      {/* 차순위 */}
      {entry.runnersUp.length > 0 && (
        <div className="relative z-10 w-full pt-2 border-t border-white/5 flex flex-col gap-1.5">
          {entry.runnersUp.slice(0, 1).map((r, i) => {
            const rName =
              locale === "en" && r.nickname_en
                ? r.nickname_en
                : r.nickname;
            return (
              <div
                key={i}
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardClick(
                    {
                      ...entry,
                      score: r.score,
                      reason: r.reason,
                      celeb: {
                        id: r.id,
                        slug: r.slug,
                        nickname: r.nickname,
                        nickname_en: r.nickname_en,
                        avatar_url: r.avatar_url,
                        profession: null,
                        title: null,
                        title_en: null,
                        has_voice: false,
                        stats: r.stats,
                      },
                      runnersUp: [],
                    },
                    false,
                    color
                  );
                }}
                className="flex items-center gap-2 group/runner hover:bg-white/5 p-1 -m-1 rounded-lg transition-colors outline-none cursor-pointer"
              >
                <div className="relative w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/10 shrink-0 shadow-sm group-hover/runner:ring-white/20 transition-all">
                  {r.avatar_url ? (
                    <Image
                      src={r.avatar_url}
                      alt=""
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10" />
                  )}
                </div>
                <span className="text-xs font-medium text-text-secondary group-hover/runner:text-text-primary transition-colors truncate flex-1">
                  {rName}
                </span>
                <span
                  className="text-xs font-bold tabular-nums shrink-0"
                  style={{ color: `${color}99` }}
                >
                  {r.score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}
