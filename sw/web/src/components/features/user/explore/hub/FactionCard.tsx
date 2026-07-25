/*
  파일명: /components/features/user/explore/hub/FactionCard.tsx
  기능: 세력도감 미리보기
  책임: 태그 세력도감 목록을 칩으로 보여주고 해당 태그의 세력도감 페이지로 연결한다.
*/ // ------------------------------

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
  celebs?: { id: string; avatar_url: string | null; nickname: string; nickname_en: string | null }[];
}

interface FactionCardProps {
  locale?: string;
  tags?: TagPreview[];
}

export default function FactionCard({ locale = "ko", tags = [] }: FactionCardProps) {
  if (tags.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {tags.map((tag) => {
        const title = locale === "en" ? (tag.name_en ?? tag.name) : tag.name;
        const desc = locale === "en" ? (tag.description_en ?? tag.description) : tag.description;

        return (
          <Link
            key={tag.id}
            href={`/explore/faction?tag=${tag.id}`}
            className="group relative flex flex-col gap-3 rounded-2xl border p-5 hover:brightness-110 overflow-hidden ring-1 ring-inset ring-white/5 shadow-lg"
            style={{
              borderColor: `${tag.color}40`,
              backgroundColor: `${tag.color}08`,
            }}
          >
            {/* Background subtle gradient glow based on tag color */}
            <div 
              className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[60px] opacity-20 pointer-events-none group-hover:opacity-50"
              style={{ backgroundColor: tag.color }}
            />

            <div className="relative z-10 flex flex-col h-full">
              <h3 
                className="text-lg font-bold mb-2 line-clamp-1 drop-shadow-md"
                style={{ color: tag.color }}
              >
                {title}
              </h3>
              
              <p className="text-sm text-white/90 line-clamp-2 mb-6 flex-grow leading-relaxed">
                {desc}
              </p>

              {tag.celebs && tag.celebs.length > 0 && (
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                  <div className="flex -space-x-3">
                    {tag.celebs.map((celeb, idx) => (
                      <div 
                        key={celeb.id} 
                        className="w-8 h-8 rounded-full border-2 border-[#0f0e0d] bg-[#0a0a0b] relative shadow-sm"
                        style={{ zIndex: tag.celebs!.length - idx }}
                      >
                        <CelebImage
                          src={celeb.avatar_url}
                          alt={locale === "en" ? (celeb.nickname_en ?? celeb.nickname) : celeb.nickname}
                          shape="circle"
                          sizes="32px"
                          fallbackSize={16}
                          className="w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-white/70 group-hover:text-white">
                    {locale === "en" ? "Explore" : "탐색하기"}
                  </div>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
