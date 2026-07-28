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

// #region 순위 뱃지 스타일
const RANK_META: Record<number, {
  gradient: string;        // 배경 그라디언트
  border: string;          // 테두리 색
  text: string;            // 숫자 색
  glow: string;            // 외부 glow
  shine: boolean;          // 광택 애니메이션
}> = {
  1: {
    gradient: "linear-gradient(160deg, #f5d560 0%, #d4af37 45%, #a07818 100%)",
    border: "rgba(255, 225, 100, 0.6)",
    text: "#3d2800",
    glow: "0 0 12px rgba(212,175,55,0.5), 0 2px 6px rgba(0,0,0,0.6)",
    shine: true,
  },
  2: {
    gradient: "linear-gradient(160deg, #dcdcdc 0%, #b0b0b0 45%, #808080 100%)",
    border: "rgba(220, 220, 220, 0.4)",
    text: "#2a2a2a",
    glow: "0 0 8px rgba(180,180,180,0.3), 0 2px 6px rgba(0,0,0,0.6)",
    shine: false,
  },
  3: {
    gradient: "linear-gradient(160deg, #dda060 0%, #b8763a 45%, #8a5520 100%)",
    border: "rgba(210, 160, 90, 0.4)",
    text: "#2e1800",
    glow: "0 0 8px rgba(184,118,58,0.3), 0 2px 6px rgba(0,0,0,0.6)",
    shine: false,
  },
};

function RankBadge({ rank }: { rank: number }) {
  const meta = RANK_META[rank];

  // Top 3: 쉴드 형태 메달
  if (meta) {
    return (
      <div
        className="absolute z-20 flex items-center justify-center"
        style={{
          top: -6,
          left: -6,
          width: 32,
          height: 36,
          // 쉴드 실루엣
          clipPath: "polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)",
          background: meta.gradient,
          boxShadow: meta.glow,
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.7))",
        }}
      >
        {/* 쉴드 내부 보더 (동일 clip-path로 inset) */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: 1,
            clipPath: "polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)",
            border: `1px solid ${meta.border}`,
          }}
        />
        {/* 상단 광택 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: "polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)",
            background: "linear-gradient(170deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 35%, transparent 50%)",
          }}
        />
        {/* 순위 숫자 */}
        <span
          className="relative font-cinzel font-black text-sm leading-none"
          style={{
            color: meta.text,
            marginTop: -3,
            textShadow: "0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          {rank}
        </span>
        {/* 1위 미세 shimmer */}
        {meta.shine && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)" }}
          >
            <div
              className="absolute h-full w-[60%] animate-shine opacity-40"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                top: 0,
                left: 0,
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // 4~10위: 미니멀 석판 넘버
  return (
    <div
      className="absolute z-20 flex items-center justify-center font-cinzel font-bold text-[11px] text-text-secondary"
      style={{
        top: -4,
        left: -4,
        width: 22,
        height: 22,
        borderRadius: 4,
        background: "linear-gradient(145deg, #1e1e1e, #161616)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {rank}
    </div>
  );
}
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
      <p className="text-xs leading-relaxed">
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
                  <div className="w-full h-full flex items-center justify-center">
                    <Book size={14} />
                  </div>
                )}
              </div>

              {/* 제목 + 저자 */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {item.title ?? "—"}
                </p>
                <p className="text-[11px] truncate">
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
          <p className="text-[10px] mb-1.5">{t("sharedBy")}</p>
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
              <span className="text-sm">Top {entry.celebs.length}</span>
            </div>

            {/* 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {entry.celebs.map((celeb, idx) => {
                const rank = idx + 1;

                return (
                  <div key={celeb.id} className="relative">
                    <RankBadge rank={rank} />
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

            {/* 기록가 막대 인포그래픽 */}
            <SectionInfoGraphic celebs={entry.celebs} color={config.color} />

            {/* 공통 콘텐츠 인사이트 */}
            <SharedContentInsight
              items={shared}
              color={config.color}
              totalCelebs={entry.celebs.length}
            />
          </section>
        );
      })}
    </div>
  );
}
