"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BookOpen, Film, Music, Gamepad2 } from "lucide-react";
import { MUSEUM_CATEGORY_IDS } from "@/constants/scripturesMuseum";
import Image from "next/image";

const MEDIA_ICONS = {
  book: BookOpen,
  video: Film,
  music: Music,
  game: Gamepad2,
} as const;

const MEDIA_KEYS = ["book", "video", "music", "game"] as const;

// 각 서브카테고리의 대표 이미지 (가장 상징적인 시대 선정)
const REPRESENTATIVE_IMAGES: Record<string, string> = {
  // 책
  "book/media":        "/images/scriptures/book/media/08_metal_type.jpg",       // 금속활자 — 인쇄 혁명
  "book/writing_tool": "/images/scriptures/book/writing_tool/03_quill_pen.png", // 깃펜 — 필기구의 상징
  "book/typography":   "/images/scriptures/book/typography/07_blackletter.png",  // 블랙레터 — 서체의 아이콘
  // 영상
  "video/media":       "/images/scriptures/video/media/03_silent_film.png",     // 무성영화 — 영화의 탄생기
  "video/technique":   "/images/scriptures/video/technique/05_cgi_era.png",     // CGI — 시각효과의 대표
  "video/space":       "/images/scriptures/video/space/02_movie_palace.png",    // 무비 팰리스 — 극장의 상징
  // 음악
  "music/media":       "/images/scriptures/music/media/04_lp_vinyl.png",        // LP — 음반 매체의 아이콘
  "music/instrument":  "/images/scriptures/music/instrument/04_piano.png",      // 피아노 — 악기의 대표
  "music/experience":  "/images/scriptures/music/experience/concert_hall.png",  // 콘서트홀 — 감상 경험의 정점
  // 게임
  "game/platform":     "/images/scriptures/game/platform/07_home_console.png",  // 가정용 콘솔 — 게임의 상징
  "game/interface":    "/images/scriptures/game/interface/05_analog_haptic.png", // 아날로그 스틱 — 현대 입력장치
  "game/graphics":     "/images/scriptures/game/world/05_seamless_openworld.png", // 오픈월드 — 그래픽 진화의 정점
};

export default function MuseumPreview() {
  const t = useTranslations("scriptures.hub");
  const tc = useTranslations("scriptures.museum.category");
  const ts = useTranslations("scriptures.museum.sub");
  const categories = useMemo(() => {
    return MEDIA_KEYS.map((key) => {
      const category = MUSEUM_CATEGORY_IDS.find((c) => c.id === key);
      const subs = (category?.subCategories ?? []).map((sub) => {
        const timelineKey = `${key}/${sub.id}`;
        return { id: sub.id, imageUrl: REPRESENTATIVE_IMAGES[timelineKey] ?? null };
      });
      return { key, subs };
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* 2x2 카테고리 그리드 */}
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        {categories.map(({ key, subs }) => {
          const Icon = MEDIA_ICONS[key];
          return (
            <div
              key={key}
              className="w-full max-w-[840px] rounded-2xl border border-white/[0.06] bg-[#161616]/80 overflow-hidden"
            >
              {/* 카테고리 헤더 */}
              <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
                <Icon size={18} className="text-accent" />
                <span className="text-[17px] font-serif font-bold text-text-primary">
                  {tc(`${key}.label`)}
                </span>
              </div>

              {/* 서브카테고리 카드 — 모바일 2칸, sm 이상 3칸 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-3 pb-3">
                {subs.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/library/museum?cat=${key}&sub=${sub.id}`}
                    className="group rounded-lg overflow-hidden border border-white/[0.06] hover:border-accent/30 transition-all duration-400"
                  >
                    {/* 이미지 */}
                    <div className="relative w-full aspect-square bg-neutral-900">
                      {sub.imageUrl ? (
                        <>
                          <Image
                            src={sub.imageUrl}
                            alt={ts(`${key}.${sub.id}.label`)}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 25vw, 120px"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
                      )}

                      {/* 라벨 — 이미지 중앙 */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[16px] font-bold text-white text-center leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                          {ts(`${key}.${sub.id}.label`)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
