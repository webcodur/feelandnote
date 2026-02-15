/*
  파일명: components/features/game/tracker/ContentReveal.tsx
  기능: Stage 2 - 콘텐츠 순차 공개
  책임: 콘텐츠 카드 + 리뷰(이름 블러) 순차적으로 표시
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
  contents: TrackerContent[];
  revealCount: number;
}

export default function ContentReveal({
  contents,
  revealCount,
}: ContentRevealProps) {
  const revealed = contents.slice(0, revealCount);

  return (
    <div className="space-y-3 max-w-lg mx-auto">
      <p className="text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider text-center">
        Stage 2 — Content {revealCount}/{contents.length}
      </p>

      {revealed.map((content, idx) => {
        const config = TYPE_CONFIG[content.type] ?? TYPE_CONFIG.BOOK;
        const Icon = config.icon;
        const isLatest = idx === revealCount - 1;

        return (
          <div
            key={content.id}
            className={`rounded-lg border bg-black/30 p-3 ${
              isLatest
                ? "border-accent/40 animate-in fade-in slide-in-from-bottom-2"
                : "border-white/10 opacity-70"
            }`}
          >
            <div className="flex gap-3">
              {/* 썸네일 */}
              <div className="relative h-16 w-12 shrink-0 rounded overflow-hidden bg-bg-secondary border border-white/10">
                {content.thumbnailUrl ? (
                  <Image
                    src={content.thumbnailUrl}
                    alt={content.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Icon size={16} className={config.color} />
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon size={12} className={config.color} />
                  <span className={`text-[10px] font-bold ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white truncate">
                  {content.title}
                </h4>
                {content.creator && (
                  <p className="text-xs text-text-secondary truncate">
                    {content.creator}
                  </p>
                )}
              </div>
            </div>

            {/* 리뷰 전문 표시 */}
            {content.review && (
              <p className="mt-2 text-xs text-text-secondary leading-relaxed border-t border-white/5 pt-2">
                {content.review}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
