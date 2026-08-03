/*
  파일명: /components/features/user/explore/hub/FactionCard.tsx
  기능: 세력도감 미리보기 (탐색 허브)
  책임: 종류를 섞은 테마 4개를 정사각형 단체샷 표지로 보여주고 세력도감으로 연결한다.
*/ // ------------------------------

import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface TagPreview {
  id: string;
  name: string;
  name_en: string | null;
  description?: string | null;
  description_en?: string | null;
  color: string;
  cover?: string | null;
}

interface FactionCardProps {
  locale?: string;
  tags?: TagPreview[];
}

export default function FactionCard({ locale = "ko", tags = [] }: FactionCardProps) {
  if (tags.length === 0) return null;

  return (
    <div className="-mx-3 flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 pb-2 scrollbar-hide overscroll-x-contain md:mx-auto md:grid md:w-full md:max-w-[1160px] md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 xl:gap-8">
      {tags.map((tag, index) => {
        const title = locale === "en" ? (tag.name_en ?? tag.name) : tag.name;
        const desc = locale === "en" ? (tag.description_en ?? tag.description) : tag.description;

        return (
          <Link
            key={tag.id}
            href={`/explore/faction?tag=${tag.id}`}
            className="group relative aspect-square w-[88%] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0d0c0b] shadow-[0_18px_50px_rgba(0,0,0,0.28)] outline-none hover:border-white/35 focus-visible:border-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37]/55 md:w-auto md:max-w-none md:snap-none md:rounded-2xl"
          >
            {tag.cover ? (
              <>
                {/* 단체샷 표지 — 카드 전체를 채우고 하단만 눌러 글자 가독성을 확보한다. */}
                <Image
                  src={tag.cover}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width: 767px) 88vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.03)_35%,rgba(0,0,0,0.24)_62%,rgba(0,0,0,0.92)_100%)]" />
              </>
            ) : (
              /* 단체샷 없는 테마 — 색 광원 폴백 */
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 30% 20%, ${tag.color}45, transparent 60%), #0d0c0b`,
                }}
              />
            )}

            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 md:p-7">
              <span
                className="h-0.5 w-9 rounded-full shadow-[0_0_12px_currentColor] md:w-12"
                style={{ color: tag.color, backgroundColor: tag.color }}
              />
              <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-white/60 md:text-xs">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-7 lg:p-8">
              <h3 className="line-clamp-2 font-serif text-xl font-bold leading-tight text-white drop-shadow-md md:text-3xl lg:text-4xl">
                {title}
              </h3>
              {desc && (
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/70 md:mt-2 md:text-base lg:text-lg">{desc}</p>
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/5" />
          </Link>
        );
      })}
    </div>
  );
}
