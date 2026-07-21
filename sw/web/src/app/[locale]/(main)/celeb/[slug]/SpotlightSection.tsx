"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SpotlightTagItem } from "@/actions/user/getCelebBySlug";

interface SpotlightSectionProps {
  tags: SpotlightTagItem[];
}

export default function SpotlightSection({ tags }: SpotlightSectionProps) {
  const locale = useLocale();
  const isEn = locale === "en";

  const resolveName = (tag: SpotlightTagItem) =>
    isEn && tag.name_en ? tag.name_en : tag.name;
  const resolve = (en: string | null, ko: string | null) => (isEn && en ? en : ko);

  return (
    <div className="space-y-4">
      {tags.map((tag) => {
        const name = resolveName(tag);
        const description = resolve(tag.description_en, tag.description);
        const roleShort = resolve(tag.roleShortEn, tag.roleShort);
        const roleLong = resolve(tag.roleLongEn, tag.roleLong);

        return (
          <div
            key={tag.id}
            className="flex flex-col sm:flex-row gap-4 p-4 rounded-[2px] border border-white/10"
          >
            {/* 화보 — 배정마다 있는 경우만 노출 */}
            {tag.spotlightImageUrl && (
              <Link
                href={`/explore/spotlight/${tag.slug}`}
                className="group relative aspect-[3/4] sm:w-[168px] flex-shrink-0 rounded-[2px] overflow-hidden bg-bg-secondary ring-1 ring-accent/10 hover:ring-accent/60"
              >
                {/* 배경: 흐린 확대 카피로 여백을 메운다 */}
                <Image
                  src={tag.spotlightImageUrl}
                  alt=""
                  fill
                  unoptimized
                  aria-hidden
                  className="object-cover scale-110 blur-xl opacity-40"
                />
                <div className="absolute inset-0 bg-black/20" />
                {/* 전경: 원본 비율 그대로 노출 */}
                <Image
                  src={tag.spotlightImageUrl}
                  alt={name}
                  fill
                  unoptimized
                  sizes="168px"
                  className="object-contain transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
            )}

            {/* 소속 정보 */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <Link
                href={`/explore/spotlight/${tag.slug}`}
                style={{ "--tag-color": tag.color } as React.CSSProperties}
                className="inline-flex items-center gap-1.5 text-text-primary hover:text-[color:var(--tag-color)]"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                  aria-hidden
                />
                <span className="font-serif text-sm sm:text-base font-bold">{name}</span>
              </Link>

              {description && (
                <p className="text-xs text-text-secondary line-clamp-2">{description}</p>
              )}

              {roleShort && (
                <p className="font-serif text-sm sm:text-base font-medium text-text-primary pt-1">
                  {roleShort}
                </p>
              )}

              {roleLong && (
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {roleLong}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
