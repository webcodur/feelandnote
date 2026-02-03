"use client";

import { useEffect, useState } from "react";
import { Landmark, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/Logo";
import { NAV_ITEMS, HOME_SECTIONS } from "@/constants/navigation";

// NAV_ITEMS 기반으로 섹션 네비게이션 생성
const SECTION_NAV = NAV_ITEMS.filter((item) => item.showInHomePage).map((item) => ({
  label: item.label,
  sub: HOME_SECTIONS[item.key]?.englishTitle.toUpperCase() ?? item.key.toUpperCase(),
  targetId: HOME_SECTIONS[item.key]?.id ?? `${item.key}-section`,
  icon: item.icon,
}));

export default function HomeBanner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <section className="relative min-h-screen pt-16 md:pt-24 flex flex-col items-center justify-center overflow-hidden bg-bg-main selection:bg-accent/30">
      
      {/* --- Background Layers --- */}
      
      {/* 1. Base Gradient (Deep shadow to center light) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(21,21,21,0)_0%,rgba(18,18,18,1)_90%)] z-10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1200px] bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.15)_0%,transparent_70%)] opacity-60" />
      </div>

      {/* 2. Texture Overlay (Subtle noise/marble) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-texture-noise mix-blend-overlay" />

      {/* 3. Decorative Pillars (Replaced with Lucide Landmark for structure feeling) */}
      <div 
        className={cn(
          "hidden md:block absolute left-10 lg:left-32 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-1000 delay-500 text-white/5",
          mounted && "opacity-20 translate-x-0"
        )}
      >
        <Landmark size={400} strokeWidth={0.5} />
      </div>
      <div 
        className={cn(
          "hidden md:block absolute right-10 lg:right-32 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-1000 delay-500 text-white/5",
          mounted && "opacity-20 translate-x-0"
        )}
      >
        <Landmark size={400} strokeWidth={0.5} />
      </div>

      {/* --- Main Content --- */}
      <div className="relative z-20 flex flex-col items-center text-center px-3 md:px-4 w-full max-w-4xl mx-auto">

        {/* Tagline */}
        <span
          className={cn(
            "font-cormorant text-accent/80 tracking-[0.2em] md:tracking-[0.3em] text-[11px] md:text-sm uppercase mb-4 md:mb-8 opacity-0 translate-y-4 transition-all duration-700",
            mounted && "opacity-100 translate-y-0"
          )}
        >
          Record Your Inspiration
        </span>

        {/* Logo as Main Title */}
        <div
          className={cn(
            "opacity-0 scale-95 transition-all duration-1000 delay-100",
            mounted && "opacity-100 scale-100"
          )}
        >
          <Logo
            variant="hero"
            size="lg"
            asLink={false}
          />
        </div>

        {/* Divider */}
        <div className={cn("my-4 md:my-10 opacity-0 transition-opacity duration-1000 delay-300", mounted && "opacity-100")}>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-[1px] w-12 md:w-32 bg-gradient-to-r from-transparent to-accent/40" />
            <div className="w-1 h-1 md:w-1.5 md:h-1.5 rotate-45 bg-accent/50" />
            <div className="h-[1px] w-12 md:w-32 bg-gradient-to-l from-transparent to-accent/40" />
          </div>
        </div>

        {/* Description */}
        <p
          className={cn(
            "text-text-secondary text-sm md:text-lg leading-relaxed max-w-xl opacity-0 translate-y-4 transition-all duration-700 delay-500",
            mounted && "opacity-100 translate-y-0"
          )}
        >
          <span className="block font-medium text-text-primary/90 mb-1.5 md:mb-3 text-base md:text-xl">
            느끼고, 기록하라
          </span>
          책, 영화, 음악, 게임... 모든 경험을 남기고<br />
          영감의 흔적을 쌓아가세요.
        </p>

        {/* Navigation Menu */}
        <div
          className={cn(
            "mt-8 md:mt-16 mb-12 md:mb-20 w-full opacity-0 transition-all duration-1000 delay-700",
            mounted && "opacity-100"
          )}
        >
          <div className="flex flex-wrap justify-center gap-1 md:gap-4">
            {SECTION_NAV.map((item) => (
              <button
                key={item.targetId}
                onClick={() => scrollToSection(item.targetId)}
                className="group relative flex flex-col items-center gap-1.5 md:gap-2 p-2 md:p-4 rounded-xl hover:bg-white/5 w-[4.25rem] md:w-20"
              >
                <div className="relative w-9 h-9 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-accent/60 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] bg-bg-card/50 backdrop-blur-sm">
                  <item.icon size={18} className="md:hidden text-text-secondary group-hover:text-accent" />
                  <item.icon size={20} className="hidden md:block text-text-secondary group-hover:text-accent" />
                </div>
                <div className="text-center h-8 md:h-10 flex flex-col justify-start">
                  <span className="block text-[11px] md:text-sm font-bold text-text-primary group-hover:text-accent">
                    {item.label}
                  </span>
                  <span className="hidden md:block text-[10px] text-white/20 font-cinzel tracking-wider group-hover:text-accent/50 leading-tight">
                    {item.sub}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <button
        onClick={() => scrollToSection("explore-section")}
        className="absolute bottom-6 md:bottom-10 z-20 animate-bounce text-text-secondary hover:text-accent transition-colors cursor-pointer"
        aria-label="Scroll to content"
      >
        <ChevronDown size={28} className="md:hidden" strokeWidth={1.5} />
        <ChevronDown size={32} className="hidden md:block" strokeWidth={1.5} />
      </button>

      {/* Subtle bottom gradient to blend with next section */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-bg-main to-transparent pointer-events-none" />
    </section>
  );
}
