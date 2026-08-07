"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { GripVertical, User } from "lucide-react";
import { useRecentProfiles } from "@/hooks/useRecentProfiles";
import { BLUR_DATA_URL } from "@/constants/image";
import BlurDissolve from "@/components/ui/BlurDissolve";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";

export default function RecentProfilesSection() {
  const t = useTranslations("profileSection");
  const locale = useLocale();
  const isEn = locale === "en";
  const { recentItems } = useRecentProfiles();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  if (recentItems.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-label={isExpanded ? t("collapseRecent") : t("expandRecent")}
        className="hidden lg:flex items-center justify-center fixed left-0 top-1/2 -translate-y-1/2 z-40 h-14 w-7 bg-bg-card/85 backdrop-blur-sm border border-white/10 border-l-0 rounded-r-lg shadow-lg hover:bg-bg-card"
      >
        <GripVertical size={14} className="text-text-secondary/80" />
      </button>

      {isExpanded && (
        <aside className="hidden lg:flex flex-col items-center gap-2 fixed left-8 top-1/2 -translate-y-1/2 z-30 py-2 ps-1 pe-1.5 bg-bg-card/85 backdrop-blur-sm border border-white/10 rounded-r-xl shadow-lg">
          <div className="w-5 border-t border-white/10" />
          {recentItems.map((item) => (
            <div key={item.id} className="relative">
              <Link
                href={`/${item.id}`}
                className="block"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="relative w-[30px] h-[30px] rounded-full overflow-hidden border-2 border-transparent hover:border-accent/60 bg-bg-secondary">
                  {item.avatarUrl && item.profileType === "CELEB" ? (
                    // 셀럽 얼굴만 등장 효과 — 사용자 아바타는 그대로 둔다
                    <BlurDissolve className="absolute inset-0">
                      <CelebAvatarImage
                        src={item.avatarUrl}
                        alt={item.nickname}
                        sizes="30px"
                        blurDataURL={BLUR_DATA_URL}
                      />
                    </BlurDissolve>
                  ) : item.avatarUrl ? (
                    <Image
                      src={item.avatarUrl}
                      alt={item.nickname}
                      fill
                      sizes="30px"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      unoptimized
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <User size={12} className="" />
                    </div>
                  )}
                </div>
              </Link>
              {hoveredId === item.id && (
                <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-bg-elevated border border-border rounded-md px-2.5 py-1 whitespace-nowrap z-50 shadow-lg pointer-events-none">
                  <p className="text-xs text-text-primary font-medium">
                    {isEn && item.nickname_en ? item.nickname_en : item.nickname_ko || item.nickname}
                  </p>
                  {item.title && (
                    <p className="text-[10px]">
                      {isEn && item.title_en ? item.title_en : item.title_ko || item.title}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </aside>
      )}
    </>
  );
}
