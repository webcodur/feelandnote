/*
  파일명: /components/features/library/curated/CuratorCard.tsx
  기능: 기관 1건을 나타내는 서가 카드
  책임: 기관의 정체(로고·성격·국가·연혁)와 규모를 한눈에 보이고,
        전용관과 그 기관의 선정 목록으로 곧장 보낸다.

  아코디언을 대신한다. 접었다 펴는 구조는 접힌 기관의 내용이 아예 그려지지 않아
  서버가 보내는 HTML에 그 기관으로 가는 길이 남지 않았다. 크롤러는 눌러 보지 않으므로
  기관 44곳과 그 목록들이 통째로 고립됐다. 카드는 늘 펼쳐진 상태라 링크가 항상 나간다.
*/ // ------------------------------

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import BlurDissolve from "@/components/ui/BlurDissolve";
import NationalityText from "@/components/ui/NationalityText";
import type { CuratedHub } from "@/actions/library/types";
import { getCuratorBrand } from "./curatorBrandPalettes";

type Curator = CuratedHub["curators"][number];

// 카드에 직접 거는 목록 수. 넘치는 것은 전용관에서 마저 본다.
const LISTS_ON_CARD = 4;

export default function CuratorCard({ curator }: { curator: Curator }) {
  const t = useTranslations("library.curated");
  const brand = getCuratorBrand(curator.slug, curator.kind);
  const itemCount = curator.lists.reduce((sum, list) => sum + list.itemCount, 0);
  const shownLists = curator.lists.slice(0, LISTS_ON_CARD);
  const restCount = curator.lists.length - shownLists.length;

  return (
    <div
      className="group/card grid grid-cols-[auto_1fr] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141414] transition-colors hover:border-white/[0.2]"
      style={{
        background: `radial-gradient(130% 120% at 0% 0%, ${brand.primary}22 0%, ${brand.primary}0A 40%, #141414 85%)`,
      }}
    >
      {/* ── 좌측: 세로폭에 꽉 채운 1:1 로고 영역 (전용관 링크) ── */}
      <Link
        href={`/library/curated/${curator.slug}`}
        className="group/logo relative flex h-full aspect-square shrink-0 items-center justify-center overflow-hidden bg-[#141414] hover:opacity-95"
      >
        {curator.logoUrl ? (
          <BlurDissolve className="absolute inset-0">
            <Image
              src={curator.logoUrl}
              alt={curator.name}
              fill
              className="object-contain"
              sizes="160px"
            />
          </BlurDissolve>
        ) : (
          <div
            className="flex size-full items-center justify-center font-serif text-xl font-bold sm:text-2xl"
            style={{
              backgroundColor: `${brand.primary}66`,
              borderColor: `${brand.accent}55`,
              color: brand.accent,
            }}
          >
            {brand.monogram.slice(0, 3)}
          </div>
        )}
      </Link>

      {/* ── 우측: 정보 및 선정 목록 ── */}
      <div className="flex flex-1 min-w-0 flex-col justify-between overflow-hidden border-l border-white/[0.08]">
        {/* ── 기관 머리 — 전용관으로 가는 링크 ── */}
        <Link
          href={`/library/curated/${curator.slug}`}
          className="group/head flex items-center justify-between gap-2 p-3 sm:gap-3 sm:p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] text-text-tertiary sm:text-[11px]">
              <span className="font-semibold" style={{ color: brand.accent }}>
                {t(`kind.${curator.kind}`)}
              </span>
              {curator.country && (
                <>
                  <span aria-hidden="true" className="text-white/20">·</span>
                  <NationalityText code={curator.country} />
                </>
              )}
              {curator.foundedYear && (
                <>
                  <span aria-hidden="true" className="text-white/20">·</span>
                  <span>{t("since", { year: curator.foundedYear })}</span>
                </>
              )}
            </div>

            {/* 이름 색은 즉각 바뀐다 — 조작 요소의 지연 없는 반응 */}
            <div className="mt-0.5 truncate text-[15px] font-bold text-text-primary group-hover/head:text-accent sm:text-[18px]">
              {curator.name}
            </div>

            <div className="mt-0.5 font-mono text-[11.5px] text-text-tertiary">
              {t("listCount", { count: curator.listCount })}
              {itemCount > 0 && <span> · {t("itemCount", { count: itemCount })}</span>}
            </div>
          </div>

          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-text-secondary group-hover/head:border-accent/40 group-hover/head:text-accent sm:size-8">
            <ArrowRight size={15} />
          </div>
        </Link>

        {/* ── 선정 목록 — 하나하나가 링크다 (가로 스크롤) ── */}
        {shownLists.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide border-t border-white/[0.06] bg-black/30 px-3 py-2 touch-pan-x overscroll-x-contain sm:px-4 sm:py-2.5">
            {shownLists.map((list) => (
              <Link
                key={list.slug}
                href={`/library/curated/${curator.slug}/${list.slug}`}
                className="shrink-0 whitespace-nowrap rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-text-secondary hover:border-accent/40 hover:text-accent sm:text-[12px]"
              >
                {list.title}
                <span className="ml-1 font-mono text-[10.5px] text-text-tertiary sm:text-[11px]">{list.itemCount}</span>
              </Link>
            ))}

            {restCount > 0 && (
              <Link
                href={`/library/curated/${curator.slug}`}
                className="shrink-0 whitespace-nowrap rounded-lg border border-dashed border-white/[0.12] px-2.5 py-1 text-[11.5px] text-text-tertiary hover:border-accent/40 hover:text-accent sm:text-[12px]"
              >
                +{restCount}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
