/*
  파일명: /components/features/user/explore/sections/TopByTypeCard/TopByTypeCard.tsx
  기능: 매체 하나(책·영상·게임·음악)의 랭킹 카드
  책임: Top 3 시상대와 4위 이하 리더보드 목록, 요약 통계, 공통 감상 인사이트를 표시한다.
        레인 하나가 매체 하나를 맡으므로 이 컴포넌트는 다른 매체를 몰라도 된다.
*/ // ------------------------------

"use client";

import { Book, Film, Gamepad2, Music } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import { CelebImage } from "@/components/ui";
import { TYPE_COLORS } from "@/app/[locale]/(main)/explore/ranking/constants";
import type { TopByTypeFullEntry } from "@/actions/home/getTopByContentTypeFull";
import type { SharedContent } from "@/actions/home/getSharedContents";
import SharedContentInsight from "./SharedContentInsight";

const TYPE_CONFIG: Record<string, { color: string; icon: typeof Book }> = {
  BOOK: { color: TYPE_COLORS.BOOK, icon: Book },
  VIDEO: { color: TYPE_COLORS.VIDEO, icon: Film },
  GAME: { color: TYPE_COLORS.GAME, icon: Gamepad2 },
  MUSIC: { color: TYPE_COLORS.MUSIC, icon: Music },
};

// 시상대 단상 — DOM은 1·2·3위 순으로 읽히고, 시각 배열은 2·1·3위다. 단상 높이가 서열을 말한다.
const PODIUM: { order: string; step: string; edge: string }[] = [
  { order: "order-2", step: "h-10 sm:h-16", edge: "#d4af37" },
  { order: "order-1", step: "h-7 sm:h-10", edge: "#b0b0b0" },
  { order: "order-3", step: "h-5 sm:h-8", edge: "#b8763a" },
];

interface TopByTypeCardProps {
  entry: TopByTypeFullEntry;
  shared: SharedContent[];
}

export default function TopByTypeCard({ entry, shared }: TopByTypeCardProps) {
  const locale = useLocale();
  const t = useTranslations("explore.topByType");
  const config = TYPE_CONFIG[entry.type];
  if (!config) return null;

  const Icon = config.icon;
  const label = locale === "en" ? entry.label.en : entry.label.ko;
  const topThree = entry.celebs.slice(0, 3);
  const remaining = entry.celebs.slice(3);

  return (
    <section>
      <div className="mb-5 flex items-center justify-center gap-2.5">
        <Icon size={20} style={{ color: config.color }} aria-hidden />
        <h2 className="text-lg font-bold text-text-primary">{label}</h2>
        <span className="text-sm text-text-tertiary">Top {entry.celebs.length}</span>
      </div>

      <ol className="mx-auto grid max-w-xl grid-cols-3 items-end gap-1.5 sm:gap-4">
        {topThree.map((celeb, idx) => {
          const podium = PODIUM[idx];
          const name = locale === "en" && celeb.nickname_en ? celeb.nickname_en : celeb.nickname;
          const role = locale === "en" && celeb.title_en ? celeb.title_en : celeb.title;
          return (
            <li key={celeb.id} className={`flex min-w-0 flex-col ${podium.order}`}>
              <Link
                href={getCelebProfileUrl({ id: celeb.id, slug: celeb.slug })}
                prefetch={false}
                // 테두리 색은 순위 색 인라인이라, 올렸을 때는 금빛 고리를 덧씌워 강조한다. 바탕·그림자·사진 빛은 인물 카드와 같다
                className={`group flex flex-col overflow-hidden rounded-xl border outline-none hover:bg-accent/[0.1] hover:shadow-[0_12px_30px_-14px_rgba(212,175,55,0.55)] hover:ring-1 hover:ring-accent/70 focus-visible:ring-2 focus-visible:ring-accent ${idx === 0 ? "bg-accent/[0.05]" : "bg-bg-card/30"}`}
                style={{ borderColor: `${podium.edge}${idx === 0 ? "66" : "33"}` }}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-bg-secondary">
                  <CelebImage
                    src={celeb.avatar_url}
                    alt={name}
                    shape="square"
                    maxPx={300}
                    fallbackSize={28}
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* 올린 카드가 한눈에 보이게 — 사진 아래에서 금빛이 차오른다. 즉시 반응이라 전환을 걸지 않는다 */}
                  <span aria-hidden className="pointer-events-none absolute inset-0 z-[15] bg-[linear-gradient(to_top,rgba(212,175,55,0.24),rgba(212,175,55,0.06)_45%,transparent_70%)] opacity-0 group-hover:opacity-100" />
                </div>
                <div className="px-1 pb-1.5 pt-1 text-center group-hover:bg-white/[0.04] sm:px-1.5 sm:pb-2 sm:pt-1.5">
                  <p className="truncate text-[11px] font-semibold leading-tight text-text-primary group-hover:text-accent sm:text-sm">{name}</p>
                  {role && <p className="mt-0.5 truncate text-[9px] leading-tight text-amber-400/80 sm:text-[11px]">{role}</p>}
                  <div className="mt-1 flex items-center justify-center gap-1 border-t border-white/[0.06] pt-1" title={t("count", { count: celeb.typeCount })}>
                    <Icon size={10} style={{ color: config.color }} aria-hidden />
                    <span className="text-xs font-black tabular-nums sm:text-sm" style={{ color: config.color }}>{celeb.typeCount}</span>
                  </div>
                </div>
              </Link>
              <div
                aria-hidden
                className={`${podium.step} mt-1 flex items-start justify-center rounded-t-lg border-x border-t pt-1 font-cinzel text-base font-black leading-none sm:mt-1.5 sm:pt-1.5 sm:text-xl`}
                style={{
                  borderColor: `${podium.edge}4d`,
                  color: podium.edge,
                  background: `linear-gradient(180deg, ${podium.edge}33 0%, ${podium.edge}0d 70%, transparent 100%)`,
                }}
              >
                {idx + 1}
              </div>
            </li>
          );
        })}
      </ol>

      {remaining.length > 0 && (
        <ol className="mx-auto mt-7 max-w-3xl border-t border-white/[0.06] sm:grid sm:grid-cols-2 sm:gap-x-6">
          {remaining.map((celeb, idx) => {
            const rank = idx + 4;
            const name = locale === "en" && celeb.nickname_en ? celeb.nickname_en : celeb.nickname;
            const role = locale === "en" && celeb.title_en ? celeb.title_en : celeb.title;
            return (
              <li key={celeb.id} className="border-b border-white/[0.06]">
                <Link
                  href={getCelebProfileUrl({ id: celeb.id, slug: celeb.slug })}
                  prefetch={false}
                  className="group flex items-center gap-2.5 px-1 py-2 outline-none hover:bg-accent/[0.08] focus-visible:ring-2 focus-visible:ring-accent sm:gap-3 sm:py-2.5"
                >
                  <span className="w-6 shrink-0 text-right font-cinzel text-sm font-bold tabular-nums text-text-tertiary group-hover:text-accent">
                    {String(rank).padStart(2, "0")}
                  </span>
                  <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-bg-secondary group-hover:border-accent/80 group-hover:ring-2 group-hover:ring-accent/25 sm:h-9 sm:w-9">
                    <CelebImage src={celeb.avatar_url} alt={name} shape="circle" fallbackSize={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary group-hover:text-accent">{name}</span>
                    {role && <span className="block truncate text-[11px] leading-tight text-text-tertiary">{role}</span>}
                  </span>
                  <span
                    className="shrink-0 text-sm font-bold tabular-nums"
                    style={{ color: config.color }}
                    title={t("count", { count: celeb.typeCount })}
                  >
                    {celeb.typeCount}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      <SharedContentInsight items={shared} color={config.color} totalCelebs={entry.celebs.length} type={entry.type} />
    </section>
  );
}
