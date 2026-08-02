/*
  파일명: /app/(main)/about/FactionCarousel.tsx
  기능: 서비스 소개 "혼자 올라간 사람은 없습니다" 구획의 세력 단체 사진 넘김판
  책임: 못박아 둔 세력을 한 장씩 크게 보여 주고, 좌우 화살표·아래 점으로 넘긴다.
        가만두면 스스로 넘어가고, 손을 올리거나 직접 넘기면 멈춘다.
*/

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AboutTeamShot } from "@/actions/policy/getAboutShowcase";

/** 스스로 넘어가는 간격 */
const AUTOPLAY_MS = 5000;

export default function FactionCarousel({
  shots,
  labels,
}: {
  shots: AboutTeamShot[];
  labels: { prev: string; next: string };
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || shots.length < 2) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % shots.length), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [index, paused, shots.length]);

  if (!shots.length) return null;
  const current = shots[index];

  const go = (next: number) => {
    setPaused(true);
    setIndex((next + shots.length) % shots.length);
  };

  return (
    <div
      className="pt-3 space-y-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-md border border-accent-dim">
        <div className="relative aspect-[16/9] w-full bg-bg-main">
          {shots.map((shot, i) => (
            <Image
              key={shot.url}
              src={shot.url}
              alt={shot.tagName}
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              // 넘어갈 때만 서서히 바뀐다 — 공간이 열리는 전환이라 애니메이션이 본질이다
              className={`object-cover transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        {shots.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={labels.prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/50 p-2 text-white hover:border-accent hover:text-accent"
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={labels.next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/50 p-2 text-white hover:border-accent hover:text-accent"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base text-text-primary font-medium">{current.tagName}</p>
          {current.info.body && (
            <p className="mt-1 text-sm leading-relaxed text-text-secondary line-clamp-2">
              {current.info.body}
            </p>
          )}
        </div>

        {shots.length > 1 && (
          <div className="flex shrink-0 items-center gap-2 pt-1">
            {shots.map((shot, i) => (
              <button
                key={shot.url}
                type="button"
                onClick={() => go(i)}
                aria-label={shot.tagName}
                aria-current={i === index}
                className={`h-2 w-2 rotate-45 hover:bg-accent ${
                  i === index ? "bg-accent" : "bg-white/25"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
