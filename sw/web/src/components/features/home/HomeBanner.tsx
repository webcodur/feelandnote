"use client";

import { LaurelIcon } from "@/components/ui/icons/neo-pantheon";
import ScrollToNext from "@/components/ui/ScrollToNext";

const SECTION_NAV = [
  { label: "탐색", targetId: "explore-section" },
  { label: "피드", targetId: "feed-section" },
  { label: "라운지", targetId: "lounge-section" },
  { label: "게시판", targetId: "board-section" },
  { label: "기록", targetId: "archive-section" },
] as const;

export default function HomeBanner() {
  const scrollToSection = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <section className="relative pt-20 pb-32 md:pt-32 md:pb-40 text-center overflow-hidden bg-bg-main">
      {/* 배경 효과 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.05)_0%,transparent_60%)]" />

      {/* 장식 (데스크톱) */}
      <div className="hidden md:block absolute top-12 left-1/2 -translate-x-1/2 opacity-10">
        <LaurelIcon size={160} className="text-accent" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4">
        <div className="flex flex-col items-center gap-4 md:gap-6 mb-8 md:mb-10">
          <span className="font-cinzel text-accent/80 text-xs md:text-sm tracking-[0.3em] uppercase animate-fade-in">
            Legacy of Wisdom
          </span>

          <h1 className="font-serif font-black text-2xl sm:text-4xl md:text-6xl text-text-primary leading-tight animate-fade-in-up whitespace-nowrap">
            당신의 이야기를 <span className="text-accent underline decoration-accent/30 underline-offset-8">새기세요</span>
          </h1>

          <p className="text-text-secondary text-xs sm:text-sm md:text-xl leading-relaxed keep-all max-w-2xl animate-fade-in-up delay-100">
            수많은 인물들의 여정 속에서 영감을 얻고,<br />
            나만의 고유한 발자취를 남길 시간입니다.
          </p>
        </div>

        {/* Section Navigation */}
        <nav className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mt-6 animate-fade-in-up delay-200">
          {SECTION_NAV.map((item, idx) => (
            <button
              key={item.targetId}
              onClick={() => scrollToSection(item.targetId)}
              className="group flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 hover:border-accent/50 hover:bg-accent/5 text-text-tertiary hover:text-accent text-[11px] md:text-sm transition-all"
            >
              <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-accent/40 group-hover:bg-accent" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <ScrollToNext targetId="explore-section" />
    </section>
  );
}
