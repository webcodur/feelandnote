/*
  파일명: /components/features/youtube/LiteYoutubeEmbed.tsx
  기능: 경량 유튜브 임베드
  책임: 썸네일만 먼저 그리고, 클릭 시점에 실제 플레이어(iframe)를 로드한다.
        영상이 많은 목록 페이지에서 초기 로드 비용을 줄인다.
*/

"use client";

import { useState } from "react";
import { Play } from "lucide-react";

interface LiteYoutubeEmbedProps {
  videoId: string;
  title?: string | null;
  className?: string;
}

export default function LiteYoutubeEmbed({
  videoId,
  title,
  className = "",
}: LiteYoutubeEmbedProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title={title ?? "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={`w-full h-full ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={title ?? "영상 재생"}
      className={`group/embed relative w-full h-full cursor-pointer ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 외부(ytimg) 썸네일, next/image remotePatterns 미등록 */}
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt={title ?? ""}
        loading="lazy"
        className="w-full h-full object-cover"
      />
      <span className="absolute inset-0 bg-black/25 group-hover/embed:bg-black/10 transition-colors duration-300" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-12 h-12 rounded-full bg-black/60 border border-white/30 flex items-center justify-center group-hover/embed:bg-accent/80 group-hover/embed:scale-110 transition-all duration-300">
          <Play size={20} className="text-white ml-0.5" fill="currentColor" />
        </span>
      </span>
    </button>
  );
}
