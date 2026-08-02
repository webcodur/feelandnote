/*
  파일명: /components/features/user/explore/hub/FactionCard.tsx
  기능: 세력도감 미리보기 (탐색 허브)
  책임: 종류를 섞은 테마 4개를 2×2 단체샷 표지 카드로 보여주고 세력도감으로 연결한다.
*/ // ------------------------------

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import CelebImage from "@/components/ui/CelebImage";
import { getTranslations } from "next-intl/server";

interface TagPreview {
  id: string;
  name: string;
  name_en: string | null;
  description?: string | null;
  description_en?: string | null;
  color: string;
  cover?: string | null;
  celebs?: { id: string; avatar_url: string | null; nickname: string; nickname_en: string | null }[];
}

interface FactionCardProps {
  locale?: string;
  tags?: TagPreview[];
}

export default async function FactionCard({ locale = "ko", tags = [] }: FactionCardProps) {
  const t = await getTranslations("explore.ui");
  if (tags.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {tags.map((tag) => {
        const title = locale === "en" ? (tag.name_en ?? tag.name) : tag.name;
        const desc = locale === "en" ? (tag.description_en ?? tag.description) : tag.description;

        return (
          <Link
            key={tag.id}
            href={`/explore/faction?tag=${tag.id}`}
            className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 shadow-lg hover:border-white/35"
          >
            {tag.cover ? (
              <>
                {/* 단체샷 표지 — 하단은 어둡게 눌러 글이 얹힌다 */}
                <Image
                  src={tag.cover}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
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

            <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-5">
              <h3
                className="line-clamp-1 font-serif text-lg font-bold drop-shadow-md md:text-xl"
                style={{ color: tag.color }}
              >
                {title}
              </h3>
              {desc && (
                <p className="mt-1 line-clamp-1 text-sm leading-relaxed text-white/85">{desc}</p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3">
                <div className="flex -space-x-3">
                  {(tag.celebs ?? []).map((celeb, idx) => (
                    <div
                      key={celeb.id}
                      className="relative h-8 w-8 rounded-full border-2 border-[#0f0e0d] bg-[#0a0a0b] shadow-sm"
                      style={{ zIndex: (tag.celebs?.length ?? 0) - idx }}
                    >
                      <CelebImage
                        src={celeb.avatar_url}
                        alt={locale === "en" ? (celeb.nickname_en ?? celeb.nickname) : celeb.nickname}
                        shape="circle"
                        sizes="32px"
                        fallbackSize={16}
                        className="h-full w-full"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70 group-hover:text-white sm:text-xs">
                  {t("explore")}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
