"use client";

import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui";
import { useLocale, useTranslations } from "next-intl";
import { Crown, Library, ArrowRight } from "lucide-react";

interface TopCeleb {
  id: string;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  title: string | null;
  title_en: string | null;
  influence: number | null;
  count: number;
}

interface ContentSample {
  id: string;
  title: string;
  thumbnail_url: string | null;
  type: string;
  creator: string | null;
}

interface EraPreviewProps {
  celebs: TopCeleb[];
  contentSamples?: Record<string, ContentSample[]>;
}

export default function EraPreview({ celebs, contentSamples }: EraPreviewProps) {
  const locale = useLocale();
  const t = useTranslations("scriptures.hub");

  if (!celebs || celebs.length === 0) return null;

  const top3 = celebs.slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {top3.map((celeb, i) => {
        const name = locale === "en" && celeb.nickname_en ? celeb.nickname_en : celeb.nickname;
        const title = locale === "en" && celeb.title_en ? celeb.title_en : celeb.title;
        const rank = i + 1;

        return (
          <Link
            key={celeb.id}
            href={`/${celeb.id}`}
            className="group relative overflow-hidden rounded-2xl bg-[#161616]/80 backdrop-blur-xl border border-white/5 hover:border-accent/40 transition-all duration-500 p-6 flex flex-col items-center text-center gap-4"
          >
            {/* 배경 장식 */}
            <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            {/* 순위 뱃지 */}
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
              {rank === 1 && <Crown size={12} className="text-accent" />}
              <span className="text-[11px] font-bold text-accent/80 tabular-nums">#{rank}</span>
            </div>

            {/* 아바타 */}
            <div className="relative mt-2">
              <Avatar
                url={celeb.avatar_url}
                name={name}
                size="xl"
                className="ring-2 ring-white/10 group-hover:ring-accent/30 transition-all duration-500"
              />
            </div>

            {/* 이름 + 칭호 */}
            <div className="space-y-1.5 min-h-[56px]">
              <h4 className="text-base font-bold text-white tracking-tight group-hover:text-accent transition-colors duration-300">
                {name}
              </h4>
              {title && (
                <p className="text-xs text-text-tertiary leading-snug line-clamp-2 break-keep">
                  {title}
                </p>
              )}
            </div>

            {/* 대표 콘텐츠 썸네일 */}
            {contentSamples?.[celeb.id]?.length ? (
              <div className="flex items-center gap-1.5">
                {contentSamples[celeb.id].map((c) => (
                  <div key={c.id} className="w-9 h-12 rounded-md overflow-hidden bg-white/5 border border-white/10 shadow-sm flex-shrink-0">
                    {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />}
                  </div>
                ))}
                <span className="text-[10px] text-text-tertiary font-medium ml-0.5">+{celeb.count}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                <Library size={13} className="text-text-tertiary" />
                <span className="text-xs font-semibold text-text-secondary tabular-nums">{celeb.count}</span>
                <span className="text-xs text-text-tertiary">works</span>
              </div>
            )}

            {/* 화살표 */}
            <ArrowRight size={14} className="absolute bottom-4 right-4 text-text-tertiary/50 group-hover:text-accent group-hover:-rotate-45 transition-all duration-300" />
          </Link>
        );
      })}
    </div>
  );
}
