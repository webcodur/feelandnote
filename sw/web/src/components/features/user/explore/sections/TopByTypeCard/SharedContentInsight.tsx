/*
  파일명: /components/features/user/explore/sections/TopByTypeCard/SharedContentInsight.tsx
  기능: 매체 하나의 공통 감상 콘텐츠 인사이트
  책임: Top 10 기록가가 함께 감상한 작품을 순위와 함께 안내한다.
*/ // ------------------------------

"use client";

import ContentImage from "@/components/ui/ContentImage";
import { Book, Sparkles, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SharedContent } from "@/actions/home/getSharedContents";

export default function SharedContentInsight({
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
                  <ContentImage
                    src={item.thumbnail_url}
                    alt={item.title ?? ""}
                    sizes="36px"
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
