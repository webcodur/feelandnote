/*
  파일명: /components/shared/PodiumBoard.tsx
  기능: 공용 시상대 — 상위 3인을 금·은·동 단상 위에 세운다
  책임: 분야별 챔피언·스펙트럼이 같이 쓰는 Top3 시상대.
        DOM은 1·2·3위 순으로 읽히고, 시각 배열은 2·1·3위다. 단상 높이가 서열을 말한다.
        accent로 값·호버 강조색을 바꿔친다(축색·매체색).
*/ // ------------------------------

"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { celebDisplayName } from "@/lib/celeb/displayName";
import { CelebImage } from "@/components/ui";

// 시상대 단상 — DOM 순서는 1·2·3위, order로 시각 2·1·3위를 만든다
const PODIUM: { order: string; step: string; edge: string }[] = [
  { order: "order-2", step: "h-10 sm:h-16", edge: "#d4af37" },
  { order: "order-1", step: "h-7 sm:h-10", edge: "#b0b0b0" },
  { order: "order-3", step: "h-5 sm:h-8", edge: "#b8763a" },
];

export interface PodiumBoardItem {
  href: string;
  nickname: string;
  nickname_en: string | null;
  avatarUrl: string | null;
  /** 호칭·역할 — accent 빛으로 표시 */
  subtitle?: string | null;
  value: string | number;
  /** 값 뒤 작은 단위 (권·편 등) */
  unit?: string;
  /** 보조 수치 — 값 아래 작은 글씨 (예: 상위 <0.1%) */
  sub?: string;
  /** 기록 인용 — 1위 플라크에만 표시 */
  note?: string;
}

export default function PodiumBoard({
  items, accent, valuePrefix,
}: {
  items: PodiumBoardItem[];
  /** 값·호버 강조색 — 축색·매체색 같은 문맥색 */
  accent: string;
  /** 값 앞에 붙는 표지(매체 아이콘 등) */
  valuePrefix?: ReactNode;
}) {
  const locale = useLocale();
  const vars = { "--rk-accent": accent, "--rk-soft": `${accent}1f` } as CSSProperties;

  return (
    <ol className="mx-auto grid max-w-xl grid-cols-3 items-end gap-1.5 sm:gap-4" style={vars}>
      {items.slice(0, 3).map((item, idx) => {
        const podium = PODIUM[idx];
        const name = celebDisplayName(item, locale);
        return (
          <li key={item.href} className={cn("flex min-w-0 flex-col", podium.order)}>
            <Link
              href={item.href}
              prefetch={false}
              className={cn(
                "group flex flex-col overflow-hidden rounded-xl border outline-none",
                "hover:bg-(--rk-soft) hover:ring-1 hover:ring-(--rk-accent) focus-visible:ring-2 focus-visible:ring-(--rk-accent)",
                "bg-white/[0.02]",
              )}
              style={{ borderColor: `${podium.edge}${idx === 0 ? "66" : "33"}` }}
            >
              <div className="relative aspect-square w-full overflow-hidden bg-bg-secondary">
                <CelebImage
                  src={item.avatarUrl}
                  alt={name}
                  shape="square"
                  maxPx={300}
                  fallbackSize={28}
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                {/* 올린 카드가 한눈에 보이게 — 사진 아래에서 accent 빛이 차오른다. 즉시 반응이라 전환을 걸지 않는다 */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[15] opacity-0 group-hover:opacity-100"
                  style={{ background: `linear-gradient(to top, ${accent}3d, ${accent}0f 45%, transparent 70%)` }}
                />
              </div>
              <div className="px-1 pb-1.5 pt-1 text-center sm:px-1.5 sm:pb-2 sm:pt-1.5">
                <p className="truncate text-xs font-semibold leading-tight text-text-primary group-hover:text-(--rk-accent) sm:text-base">
                  {name}
                </p>
                {item.subtitle && (
                  <p className="mt-0.5 truncate text-[11px] leading-tight text-text-secondary sm:text-[13px]">
                    {item.subtitle}
                  </p>
                )}
                <div className="mt-1 flex items-center justify-center gap-1 border-t border-white/[0.06] pt-1">
                  {valuePrefix}
                  <span className="font-cinzel text-xs font-black tabular-nums sm:text-sm" style={{ color: accent }}>
                    {item.value}
                    {item.unit && <span className="ml-0.5 font-sans text-[11px] font-medium text-text-secondary sm:text-xs">{item.unit}</span>}
                  </span>
                </div>
                {item.sub && <p className="mt-0.5 text-[11px] font-bold text-text-secondary sm:text-xs">{item.sub}</p>}
                {item.note && idx === 0 && (
                  <p className="mt-1.5 hidden line-clamp-2 text-xs leading-relaxed text-text-secondary sm:block">
                    {item.note}
                  </p>
                )}
              </div>
            </Link>
            {/* 단상 — 메달색 그라디언트가 아래로 사라지며 1위가 가장 높다 */}
            <div
              aria-hidden
              className={cn(podium.step, "mt-1 flex items-start justify-center rounded-t-lg border-x border-t pt-1 font-cinzel text-base font-black leading-none sm:mt-1.5 sm:pt-1.5 sm:text-xl")}
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
  );
}
