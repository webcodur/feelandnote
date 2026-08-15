/*
  파일명: /components/features/user/explore/sections/TopByTypeCard/SectionInfoGraphic.tsx
  기능: 매체 하나의 기록가 막대 인포그래픽
  책임: 최고·평균·합계 요약과 Top 10 미니 막대 차트를 표시한다.
*/ // ------------------------------

"use client";

import { Trophy, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SectionInfoGraphic({
  celebs,
  color,
}: {
  celebs: { nickname: string; typeCount: number }[];
  color: string;
}) {
  const t = useTranslations("explore.topByType");
  if (celebs.length === 0) return null;

  const total = celebs.reduce((s, c) => s + c.typeCount, 0);
  const max = celebs[0].typeCount;
  const avg = Math.round(total / celebs.length);

  return (
    <div className="mb-5 rounded-xl border border-border-primary/60 bg-bg-card/50 px-4 py-3 space-y-3">
      {/* 통계 요약 */}
      <div className="flex items-center gap-5 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Trophy size={13} style={{ color }} />
          <span className="font-semibold text-text-primary">{max}</span>
          {t("infoMax")}
        </span>
        <span className="flex items-center gap-1.5">
          <TrendingUp size={13} style={{ color }} />
          <span className="font-semibold text-text-primary">{avg}</span>
          {t("infoAvg")}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={13} style={{ color }} />
          <span className="font-semibold text-text-primary">{total}</span>
          {t("infoTotal")}
        </span>
      </div>

      {/* 미니 막대 차트 */}
      <div className="space-y-1.5">
        {celebs.map((celeb, idx) => {
          const pct = max > 0 ? (celeb.typeCount / max) * 100 : 0;
          const rank = idx + 1;
          return (
            <div key={idx} className="flex items-center gap-2 text-[11px]">
              <span
                className="w-4 text-right font-bold shrink-0"
                style={{ color: rank === 1 ? "#d4af37" : rank === 2 ? "#b0b0b0" : rank === 3 ? "#b8763a" : undefined }}
              >
                {rank}
              </span>
              <span className="w-16 sm:w-20 truncate text-text-secondary shrink-0">
                {celeb.nickname}
              </span>
              <div className="flex-1 h-3.5 bg-bg-primary/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(pct, 3)}%`,
                    backgroundColor: color,
                    opacity: 1 - idx * 0.06,
                  }}
                />
              </div>
              <span className="w-7 text-right font-semibold text-text-primary tabular-nums shrink-0">
                {celeb.typeCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
