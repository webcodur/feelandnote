/*
  파일명: components/features/game/tracker/ContentReveal.tsx
  기능: 콘텐츠 단서 1건 표시 (탭 구조)
  책임: 선택된 단서 탭의 콘텐츠 카드 + 리뷰(이름 블러) 표시
*/
"use client";

import Image from "next/image";
import type { TrackerContent } from "@/actions/game/getTrackerRound";
import { Book, Film, Gamepad2, Music } from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: typeof Book; label: string; color: string }> = {
  BOOK: { icon: Book, label: "도서", color: "text-blue-400" },
  VIDEO: { icon: Film, label: "영상", color: "text-purple-400" },
  GAME: { icon: Gamepad2, label: "게임", color: "text-green-400" },
  MUSIC: { icon: Music, label: "음악", color: "text-orange-400" },
};

interface ContentRevealProps {
  content: TrackerContent;
}

export default function ContentReveal({ content }: ContentRevealProps) {
  const config = TYPE_CONFIG[content.type] ?? TYPE_CONFIG.BOOK;
  const Icon = config.icon;

  return (
    <div className="relative rounded-xl border border-accent/30 bg-[#12100e] p-4 sm:p-5 w-full max-w-2xl mx-auto max-h-[55vh] md:max-h-[60vh] overflow-y-auto custom-scrollbar animate-clue-reveal shadow-2xl">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        {/* 썸네일 */}
        <div className="relative h-28 w-20 sm:h-32 sm:w-24 shrink-0 rounded-md overflow-hidden bg-bg-secondary border border-white/10 shadow-lg">
          {content.thumbnailUrl ? (
            <Image
              src={content.thumbnailUrl}
              alt={content.title}
              fill
              sizes="(max-width: 640px) 80px, 96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-50">
              <Icon size={24} className={config.color} />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="min-w-0 flex-1 w-full space-y-1">
          <div className="flex items-center gap-1.5 mb-1.5 opacity-90">
            <Icon size={14} className={config.color} />
            <span className={`text-xs font-bold tracking-wide ${config.color}`}>
              {config.label}
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
            {content.title}
          </h4>
          {content.creator && (
            <p className="text-sm text-text-secondary">
              {content.creator}
            </p>
          )}
        </div>
      </div>

      {/* 리뷰 내용 */}
      {content.review && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-[13px] sm:text-[15px] font-serif text-text-secondary leading-relaxed tracking-wide text-justify">
            {content.review}
          </p>
        </div>
      )}
    </div>
  );
}
