/*
  파일명: /components/features/user/explore/sections/TopByTypeSection.tsx
  기능: 분야별 최다 기록가 섹션 렌더링
  책임: 4개 콘텐츠 타입별 Top 10 셀럽 랭킹을 그리드로 표시하고,
        공통 감상 콘텐츠 인사이트를 인포그래픽으로 안내한다.
*/ // ------------------------------

"use client";

import Image from "next/image";
import { Book, Film, Gamepad2, Music, Trophy, TrendingUp, Users, Sparkles, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import CelebCard from "@/components/shared/CelebCard";
import type { TopByTypeFullEntry } from "@/actions/home/getTopByContentTypeFull";
import type { SharedContent } from "@/actions/home/getSharedContents";

// #region 타입별 설정
const TYPE_CONFIG: Record<string, { color: string; icon: typeof Book }> = {
  BOOK: { color: "#3b82f6", icon: Book },
  VIDEO: { color: "#ef4444", icon: Film },
  GAME: { color: "#22c55e", icon: Gamepad2 },
  MUSIC: { color: "#a855f7", icon: Music },
};

const RANK_COLORS: Record<number, string> = {
  1: "#d4af37",
  2: "#c0c0c0",
  3: "#cd7f32",
};
// #endregion

// #region 기록가 막대 인포그래픽
function SectionInfoGraphic({
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
                style={{ color: RANK_COLORS[rank] ?? "var(--text-tertiary)" }}
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
// #endregion

// #region 공통 콘텐츠 인사이트
function SharedContentInsight({
  items,
  color,
  totalCelebs,
}: {
  items: SharedContent[];
  color: string;
  totalCelebs: number;
}) {
  const t = useTranslations("explore.topByType");
  if (items.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-border-primary/60 bg-bg-card/50 px-4 py-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Sparkles size={15} style={{ color }} />
        {t("sharedTitle")}
      </div>
      <p className="text-xs text-text-tertiary leading-relaxed">
        {t("sharedDesc", { count: totalCelebs })}
      </p>

      {/* 콘텐츠 리스트 */}
      <div className="space-y-2">
        {items.map((item) => {
          const ratio = totalCelebs > 0 ? item.celeb_count / totalCelebs : 0;
          return (
            <div
              key={item.content_id}
              className="flex items-center gap-3 rounded-lg bg-bg-primary/40 px-3 py-2"
            >
              {/* 썸네일 */}
              <div className="w-9 h-12 rounded overflow-hidden bg-bg-card shrink-0 relative">
                {item.thumbnail_url ? (
                  <Image
                    src={item.thumbnail_url}
                    alt={item.title ?? ""}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                    <Book size={14} />
                  </div>
                )}
              </div>

              {/* 제목 + 저자 */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {item.title ?? "—"}
                </p>
                <p className="text-[11px] text-text-tertiary truncate">
                  {item.creator ?? ""}
                </p>
              </div>

              {/* 감상 인원 비율 바 */}
              <div className="flex items-center gap-2 shrink-0">
                {item.avg_rating && (
                  <span className="flex items-center gap-0.5 text-[11px] text-amber-400">
                    <Star size={10} className="fill-amber-400" />
                    {item.avg_rating}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="w-14 h-2 bg-bg-card rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(ratio * 100, 10)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-bold tabular-nums"
                    style={{ color }}
                  >
                    {item.celeb_count}/{totalCelebs}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 참여 기록가 태그 (첫 번째 아이템 기준) */}
      {items[0]?.celeb_nicknames && items[0].celeb_nicknames.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] text-text-tertiary mb-1.5">{t("sharedBy")}</p>
          <div className="flex flex-wrap gap-1">
            {items[0].celeb_nicknames.map((name) => (
              <span
                key={name}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                style={{
                  borderColor: `${color}40`,
                  color,
                  backgroundColor: `${color}10`,
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
// #endregion

interface TopByTypeSectionProps {
  entries: TopByTypeFullEntry[];
  sharedByType?: Record<string, SharedContent[]>;
}

export default function TopByTypeSection({ entries, sharedByType }: TopByTypeSectionProps) {
  const locale = useLocale();
  const t = useTranslations("explore.topByType");

  return (
    <div className="space-y-10">
      {entries.map((entry) => {
        const config = TYPE_CONFIG[entry.type];
        if (!config) return null;
        const Icon = config.icon;
        const label = locale === "en" ? entry.label.en : entry.label.ko;
        const shared = sharedByType?.[entry.type] ?? [];

        return (
          <section key={entry.type}>
            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <Icon size={22} style={{ color: config.color }} />
              <h2 className="text-lg font-bold text-text-primary">{label}</h2>
              <span className="text-sm text-text-tertiary">Top {entry.celebs.length}</span>
            </div>

            {/* 기록가 막대 인포그래픽 */}
            <SectionInfoGraphic celebs={entry.celebs} color={config.color} />

            {/* 공통 콘텐츠 인사이트 */}
            <SharedContentInsight
              items={shared}
              color={config.color}
              totalCelebs={entry.celebs.length}
            />

            {/* 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {entry.celebs.map((celeb, idx) => {
                const rank = idx + 1;
                const rankBg = RANK_COLORS[rank] ?? "rgba(0,0,0,0.6)";

                return (
                  <div key={celeb.id} className="relative">
                    {/* 순위 뱃지 */}
                    <div
                      className="absolute top-1 left-1 z-20 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                      style={{ backgroundColor: rankBg }}
                    >
                      {rank}
                    </div>

                    <CelebCard
                      id={celeb.id}
                      nickname={celeb.nickname}
                      avatar_url={celeb.avatar_url}
                      title={celeb.title}
                      count={celeb.typeCount}
                      celebProfile={celeb}
                      variant="card"
                      shape="square"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
