"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  기획전 단체 이미지 배너. 테마 상단에 단체샷 여러 장을 가로로 넘겨 본다.
  한 장이면 화살표·점 없이 그대로 보여준다.
*/
export default function SpotlightTeamBanner({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchMoved = useRef(false);

  if (!images.length) return null;

  const count = images.length;
  const go = (next: number) => setIndex((next + count) % count);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchMoved.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (Math.abs(e.touches[0].clientX - touchStartX.current) > 8) touchMoved.current = true;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchMoved.current) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) go(diff < 0 ? index + 1 : index - 1);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mb-6">
      <div
        className="relative w-full overflow-hidden rounded-xl bg-[#0a0a0a] ring-1 ring-white/10"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* 슬라이드 트랙 */}
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((url, i) => (
            <div key={url} className="relative w-full shrink-0 aspect-[16/10]">
              <Image
                src={url}
                alt={`${alt} ${i + 1}`}
                fill
                unoptimized
                priority={i === 0}
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-contain"
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            {/* 화살표 */}
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="이전 이미지"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white/90 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="다음 이미지"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white/90 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* 점 인디케이터 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${i + 1}번째 이미지`}
                  className={cn(
                    "h-2 rounded-full transition-all duration-200",
                    i === index ? "bg-accent w-4" : "bg-white/40 w-2 hover:bg-white/60"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
