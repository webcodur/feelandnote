/*
  파일명: /components/features/scriptures/museum/MuseumTableOfContents.tsx
  기능: 전시관 좌측 목차 네비게이터 (데스크톱 xl 이상)
  책임: 시대 목록과 진행률 바를 보여주고 클릭 시 해당 시대로 스크롤한다.
*/ // ------------------------------

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Scroll } from "lucide-react";
import type { HistoryEra } from "@/constants/scripturesMuseum";

interface Props {
  activeId: string;
  eras: HistoryEra[];
  contentTopRef: React.RefObject<HTMLDivElement | null>;
}

export default function MuseumTableOfContents({ activeId, eras, contentTopRef }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const activeIndex = Math.max(0, eras.findIndex((e) => e.id === activeId));

  useEffect(() => {
    const check = () => {
      if (!contentTopRef.current) return;
      const rect = contentTopRef.current.getBoundingClientRect();
      setVisible(rect.top <= window.innerHeight * 0.5);
    };
    window.addEventListener("scroll", check, { passive: true });
    check();
    return () => window.removeEventListener("scroll", check);
  }, [contentTopRef]);

  useEffect(() => {
    if (!listRef.current) return;
    const activeBtn = listRef.current.querySelector(`[data-toc="${activeId}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeId]);

  return (
    <nav className={`hidden xl:flex flex-col fixed left-[calc(50%-800px)] top-[calc(50%+32px)] -translate-y-1/2 z-30 w-64 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`} style={{ fontFamily: "var(--font-sans)" }}>
      <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2.5 mb-5 pl-2">
          <Scroll className="w-4 h-4 text-[#d4af37]/80" />
          <span className="text-xs text-[#d4af37]/70 uppercase tracking-[0.25em] font-bold">
            Chronicle
          </span>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto scrollbar-hidden px-1">
          <div className="relative py-2">
            <div className="absolute left-[22px] top-[32px] bottom-[32px] w-[2px] bg-white/5 rounded-full z-0" />
            <div
              className="absolute left-[22px] w-[2px] bg-gradient-to-b from-[#d4af37]/80 to-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-all duration-500 rounded-full z-0"
              style={{
                top: "32px",
                height: eras.length > 1
                  ? `calc((100% - 64px) * ${activeIndex / (eras.length - 1)})`
                  : "0px",
              }}
            />

            <div className="flex flex-col gap-1.5 relative z-10">
            {eras.map((era, index) => {
              const isActive = activeId === era.id;
              return (
                <button
                  key={era.id}
                  data-toc={era.id}
                  onClick={() => handleClick(era.id)}
                  className={`
                    group relative flex items-center gap-3.5 text-left px-2 py-2.5 rounded-xl
                    transition-all duration-300 w-full hover:bg-white/5
                  `}
                >
                  <div className={`
                    relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                    transition-all duration-300 text-xs font-mono font-bold leading-none
                    ${isActive
                      ? "bg-gradient-to-br from-[#f9e596] to-[#d4af37] text-black shadow-[0_0_12px_rgba(212,175,55,0.6)] border-0 scale-110"
                      : "bg-[#121212] border border-white/15 text-white/40 group-hover:text-white/80 group-hover:border-white/30"
                    }
                  `}
                  >
                    {index + 1}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 pl-0.5">
                    <span className={`block truncate transition-all duration-300 leading-snug ${isActive ? "font-bold text-[#d4af37] text-[15px]" : "font-medium text-white/70 text-sm group-hover:text-white"}`}>
                      {era.name}
                    </span>
                    <span className={`block text-[11px] truncate transition-all duration-300 mt-0.5 tracking-wide ${isActive ? "text-[#d4af37]/70 font-medium" : "text-white/40"}`}>
                      {era.period}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </nav>
  );
}
