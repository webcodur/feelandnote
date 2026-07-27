/*
  파일명: /components/features/user/explore/sections/TimelineSection/sections/ContemporariesPanel.tsx
  기능: 동시대 인물 패널
  책임: 생애가 겹치는 타국 인물 칩 목록 표시.
*/ // ------------------------------

"use client";

import { Link } from "@/i18n/navigation";
import { CelebImage } from "@/components/ui";
import { getCountryFlag } from "@/lib/utils/countryFlag";
import type { Locale } from "@/types/locale";
import type { TimelineCeleb } from "@/actions/home";
import { formatLifespan } from "../utils";
import { useTranslations } from "next-intl";

interface Props {
  celeb: TimelineCeleb;
  contemporaries: TimelineCeleb[];
  locale: Locale;
}

export default function ContemporariesPanel({ celeb, contemporaries, locale }: Props) {
  const t = useTranslations("explore.ui.timeline");
  if (contemporaries.length === 0) {
    return (
      <div className="ml-[40px] md:ml-[120px] pl-4 pt-1 pb-2 animate-slide-down">
        <p className="text-xs text-text-secondary/60">
          {t("noContemporaries")}
        </p>
      </div>
    );
  }

  return (
    <div className="ml-[40px] md:ml-[120px] pl-4 pt-1 pb-2 animate-slide-down">
      <p className="text-xs text-text-secondary/60 mb-2">
        {t("figureEra", { name: locale === "en" ? (celeb.nickname_en || celeb.nickname) : celeb.nickname })}
      </p>
      <div className="flex flex-wrap gap-2">
        {contemporaries.map((c) => {
          const cName = (locale === "en" && c.nickname_en) ? c.nickname_en : c.nickname;
          return (
            <Link
              key={c.id}
              href={c.slug ? `/celeb/${c.slug}` : `/celeb/${c.id}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card/80 border border-white/10 hover:border-accent/30 hover:bg-white/5 transition-colors group/cont"
            >
              <span className="text-sm">{getCountryFlag(c.nationality!)}</span>
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                <CelebImage
                  src={c.avatar_url}
                  alt={cName}
                  shape="circle"
                  sizes="24px"
                  maxPx={48}
                  fallbackSize={12}
                />
              </div>
              <span className="text-sm text-text-primary group-hover/cont:text-accent transition-colors">
                {cName}
              </span>
              <span className="text-xs text-text-secondary/50">
                {formatLifespan(c.birth_date, c.death_date)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
