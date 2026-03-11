"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import { useCountries } from "@/hooks/useCountries";
import { getCountryNameByLocale } from "@/lib/countries";

const formatYear = (year: string | null | undefined) => {
  if (!year) return "";
  const num = parseInt(year);
  if (isNaN(num)) return year;
  return num < 0 ? `BC ${Math.abs(num)}` : `${num}`;
};

interface ContemporariesSectionProps {
  contemporaries: ContemporaryCeleb[];
}

export default function ContemporariesSection({
  contemporaries,
}: ContemporariesSectionProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  useCountries();

  const [expanded, setExpanded] = useState(false);
  const [initialCount, setInitialCount] = useState(6);

  useEffect(() => {
    setInitialCount(window.innerWidth < 768 ? 3 : 6);
  }, []);
  const hasMore = contemporaries.length > initialCount;
  const visible = expanded ? contemporaries : contemporaries.slice(0, initialCount);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 md:gap-4 flex-wrap justify-center">
      {visible.map((celeb) => {
        const birthYear = formatYear(celeb.birth_date);
        const deathYear = celeb.death_date ? formatYear(celeb.death_date) : null;
        const period = birthYear
          ? deathYear
            ? `${birthYear}–${deathYear}`
            : `${birthYear}–`
          : "";

        return (
          <button
            key={celeb.id}
            type="button"
            onClick={() =>
              celeb.slug && router.push(`/${locale}/celeb/${celeb.slug}`)
            }
            className="group flex flex-col items-center gap-1.5 w-20 md:w-24 cursor-pointer"
          >
            <div className="relative w-14 h-14 md:w-18 md:h-18 rounded-full overflow-hidden p-[2px] bg-gradient-to-b from-accent/20 to-transparent group-hover:from-accent/60 group-hover:to-accent/30 transition-all duration-500 shadow-lg">
              <div className="w-full h-full rounded-full overflow-hidden bg-bg-secondary relative border border-white/10">
                {celeb.avatar_url ? (
                  <Image
                    src={celeb.avatar_url}
                    alt={celeb.nickname}
                    width={72}
                    height={72}
                    className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base text-text-tertiary font-serif">
                    {celeb.nickname.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center space-y-0.5">
              {/* 이름: 강조, serif */}
              <span className="block text-xs text-text-primary group-hover:text-accent transition-colors font-serif font-bold leading-tight">
                {celeb.nickname}
              </span>
              {/* 국적: 이탤릭, secondary */}
              {celeb.nationality && (
                <span className="block text-[11px] text-text-secondary leading-tight">
                  {getCountryNameByLocale(celeb.nationality, locale)}
                </span>
              )}
              {/* 직군: accent 톤 */}
              {celeb.profession && (
                <span className="block text-[11px] text-accent/70 font-medium leading-tight">
                  {tp(celeb.profession)}
                </span>
              )}
              {/* 생몰년: 모노, 작게 */}
              {period && (
                <span className="block text-[10px] font-mono text-text-tertiary tracking-wide leading-tight">
                  {period}
                </span>
              )}
            </div>
          </button>
        );
      })}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs text-text-secondary hover:text-accent border border-white/10 hover:border-accent/30 rounded-full transition-colors"
          >
            {expanded
              ? t("hideDetail")
              : `+${contemporaries.length - initialCount}`}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
