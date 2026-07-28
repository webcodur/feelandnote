/*
  파일명: /components/features/home/YoutubeShelfStrip.tsx
  기능: 홈 유튜브 선반의 인물 카드 줄
  책임: 처음엔 일부만 그리고, 끝의 화살표 카드를 누르면 다음 묶음을 이어 보여준다.
*/

"use client";

import { useRef, useState, type PointerEvent, type MouseEvent } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Play } from "lucide-react";

const INITIAL_COUNT = 6;
const BATCH_SIZE = 12;

export interface ShelfItem {
  slug: string;
  name: string;
  avatarUrl: string | null;
  videoCount: number;
}

interface YoutubeShelfStripProps {
  items: ShelfItem[];
  moreLabel: string;
}

export default function YoutubeShelfStrip({ items, moreLabel }: YoutubeShelfStripProps) {
  const [visible, setVisible] = useState(INITIAL_COUNT);
  const shown = items.slice(0, visible);
  const remaining = items.length - shown.length;

  /* ── 마우스 드래그로 가로 이동 (터치는 브라우저 기본 스크롤 사용) ── */
  const stripRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !stripRef.current) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startLeft: stripRef.current.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || !stripRef.current) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    stripRef.current.scrollLeft = drag.current.startLeft - dx;
  };

  const endDrag = () => {
    drag.current.active = false;
  };

  /* 끌고 난 직후의 클릭이 카드 이동으로 오발되지 않게 가로챈다 */
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div
      ref={stripRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClickCapture={onClickCapture}
      onDragStart={(e) => e.preventDefault()}
      className="flex gap-3 py-4 -my-4 px-4 -mx-4 overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing"
    >
      {shown.map((item) => (
        <Link
          key={item.slug}
          href={`/celeb/${item.slug}`}
          className="group flex-shrink-0 w-[140px] sm:w-[160px] space-y-1.5"
        >
          <div className="relative aspect-square rounded-md overflow-hidden bg-bg-secondary ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-accent/80 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]">
            {item.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 외부 저장소 이미지, 프로젝트 관례상 img 사용
              <img
                src={item.avatarUrl}
                alt={item.name}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-serif text-3xl text-accent/60">
                {item.name.charAt(0)}
              </div>
            )}
            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-black/70 text-[10px] text-white/90">
              <Play size={8} fill="currentColor" />
              {item.videoCount}
            </span>
          </div>
          <p className="text-xs text-text-secondary group-hover:text-accent truncate text-center">
            {item.name}
          </p>
        </Link>
      ))}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + BATCH_SIZE)}
          aria-label={moreLabel}
          className="group flex-shrink-0 w-[140px] sm:w-[160px] space-y-1.5 cursor-pointer"
        >
          <div className="aspect-square rounded-md bg-bg-secondary ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-accent/80 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] flex flex-col items-center justify-center gap-1">
            <span className="w-9 h-9 rounded-full border border-accent/40 flex items-center justify-center text-accent group-hover:bg-accent/10">
              <ChevronRight size={18} />
            </span>
            <span className="text-[11px]">+{remaining}</span>
          </div>
          <p className="text-xs group-hover:text-accent text-center">
            {moreLabel}
          </p>
        </button>
      )}
    </div>
  );
}
