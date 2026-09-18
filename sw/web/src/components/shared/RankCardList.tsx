/*
  파일명: /components/shared/RankCardList.tsx
  기능: 공용 카드형 순위 목록 — 단상 아래 순위를 인물 카드로 나열한다
  책임: 인물 이미지가 카드 왼쪽을 세로로 꽉 채우는 행 카드 + 순위 표지.
        분야별 챔피언·스펙트럼 공용. accent로 값·호버 강조색을 바꿔친다.
*/ // ------------------------------

"use client";

import type { CSSProperties } from "react";
import { User } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { celebDisplayName } from "@/lib/celeb/displayName";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";

export interface RankCardItem {
  href: string;
  nickname: string;
  nickname_en: string | null;
  avatarUrl: string | null;
  subtitle?: string | null;
  value: string | number;
  unit?: string;
}

export default function RankCardList({
  items, accent, startRank = 4,
}: {
  items: RankCardItem[];
  /** 값·호버 강조색 — 축색·매체색 같은 문맥색 */
  accent: string;
  startRank?: number;
}) {
  const locale = useLocale();
  const vars = { "--rk-accent": accent } as CSSProperties;

  return (
    <ol className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-2.5" style={vars}>
      {items.map((item, i) => {
        const name = celebDisplayName(item, locale);
        return (
        <li key={item.href}>
          <Link
            href={item.href}
            prefetch={false}
            className="group flex items-stretch overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] outline-none hover:border-white/25 hover:bg-white/[0.05] focus-visible:border-white/40"
          >
            {/* 인물 이미지 — 카드 높이를 세로로 꽉 채운다. 순위는 사진 위 좌하단 표지 */}
            <span className="relative block w-14 shrink-0 overflow-hidden bg-bg-secondary sm:w-[4.5rem]">
              {item.avatarUrl ? (
                <CelebAvatarImage src={item.avatarUrl} alt={name} className="object-cover" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center">
                  <User size={18} className="text-white/20" aria-hidden />
                </span>
              )}
              <span className="absolute bottom-0 left-0 flex h-5 min-w-5 items-center justify-center rounded-tr-md bg-black/70 px-1 font-cinzel text-[11px] font-black text-white/90">
                {String(startRank + i).padStart(2, "0")}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 sm:px-4 sm:py-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text-primary group-hover:text-(--rk-accent) sm:text-base">
                  {name}
                </span>
                {item.subtitle && (
                  <span className="mt-0.5 block truncate text-xs leading-tight text-text-secondary sm:text-[13px]">
                    {item.subtitle}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-cinzel text-base font-black tabular-nums sm:text-lg" style={{ color: accent }}>
                {item.value}
                {item.unit && <span className="ml-0.5 font-sans text-xs font-medium text-text-secondary sm:text-[13px]">{item.unit}</span>}
              </span>
            </span>
          </Link>
        </li>
        );
      })}
    </ol>
  );
}
