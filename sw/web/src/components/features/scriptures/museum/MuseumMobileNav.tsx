/*
  파일명: /components/features/scriptures/museum/MuseumMobileNav.tsx
  기능: 전시관 하단 미니 네비게이터 (xl 미만)
  책임: 시대 버튼 목록과 진행 바를 고정 하단에 표시한다.
*/ // ------------------------------

"use client";

import { useEffect, useRef, useCallback } from "react";
import type { HistoryEra } from "@/constants/scripturesMuseum";

interface Props {
  activeId: string;
  eras: HistoryEra[];
}

export default function MuseumMobileNav({ activeId, eras }: Props) {
  const activeIndex = eras.findIndex((e) => e.id === activeId);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navRef.current) {
      const activeBtn = navRef.current.querySelector(`[data-era-id="${activeId}"]`) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeId]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="xl:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#121212]/90 backdrop-blur-md border-t border-white/[0.08] safe-area-bottom">
      <div className="h-[3px] bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-[#d4af37]/50 to-[#d4af37]/80 transition-all duration-500"
          style={{ width: `${((activeIndex + 1) / eras.length) * 100}%` }}
        />
      </div>
      <div ref={navRef} className="flex gap-1 px-2 py-2.5 overflow-x-auto scrollbar-hidden">
        {eras.map((era, index) => {
          const isActive = activeId === era.id;
          const isPast = index < activeIndex;
          return (
            <button
              key={era.id}
              data-era-id={era.id}
              onClick={() => handleClick(era.id)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 text-[10px] sm:text-[11px] px-3 py-2 rounded-full
                transition-all duration-300 whitespace-nowrap
                ${isActive
                  ? "text-[#d4af37] bg-[#d4af37]/15 font-semibold shadow-[0_0_8px_rgba(212,175,55,0.15)]"
                  : isPast
                    ? "text-white/50"
                    : "text-white/30"
                }
              `}
            >
              <span className={`
                inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300
                ${isActive
                  ? "bg-[#d4af37] shadow-[0_0_4px_rgba(212,175,55,0.6)]"
                  : isPast
                    ? "bg-white/30"
                    : "bg-white/15"
                }
              `} />
              {era.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
