"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronUp, ChevronDown, ChevronsUp } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { HomeSectionConfig, SECTION_ORDER } from "@/constants/home-sections";

interface SectionWrapperProps {
  config: HomeSectionConfig;
  children: React.ReactNode;
  linkOverride?: string; // config.link 대신 사용할 동적 링크
}

export default function SectionWrapper({ config, children, linkOverride }: SectionWrapperProps) {
  const sectionLink = linkOverride ?? config.link;
  // 현재 섹션의 이전/다음 섹션 ID 계산
  const currentIndex = SECTION_ORDER.indexOf(config.id as typeof SECTION_ORDER[number]);
  const prevSectionId = currentIndex > 0 ? SECTION_ORDER[currentIndex - 1] : null;
  const nextSectionId = currentIndex < SECTION_ORDER.length - 1 ? SECTION_ORDER[currentIndex + 1] : null;

  const scrollToSection = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section
      id={config.id}
      className={`relative w-full pt-56 pb-40 overflow-hidden ${config.className || ""}`}
    >
      <div className="container max-w-4xl mx-auto px-4 relative z-10">
        {/* Header Area - 2열 레이아웃 */}
        <div className="flex items-center gap-4 md:gap-8 -mt-[100px] mb-12">
          {/* 1열: Section Header */}
          <div className="flex-1 min-w-0">
            <SectionHeader
              title={config.title}
              englishTitle={config.englishTitle}
              description={config.description}
              variant="classical"
              className="items-start text-start"
            />
          </div>

          {/* 2열: Decorative SVG */}
          <div className="relative shrink-0 w-28 h-28 md:w-40 md:h-40 pointer-events-none select-none opacity-80 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">
            <Image
              src={config.svgSrc}
              alt=""
              fill
              sizes="160px"
              className="object-contain"
            />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-20">
          {children}
        </div>
      </div>

      {/* Bottom Navigation: [↑] [페이지 이동 버튼] [↓] or [↑] [페이지 이동 버튼] [⇈] */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {prevSectionId && (
          <button
            onClick={() => scrollToSection(prevSectionId)}
            className="p-2 mt-1 text-text-tertiary/50 hover:text-accent transition-colors"
            aria-label="이전 섹션으로"
          >
            <ChevronUp size={18} />
          </button>
        )}

        {sectionLink && config.linkText && (
          <Link
            href={sectionLink}
            className="group inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 hover:border-accent hover:bg-accent/5 text-xs font-medium text-text-secondary hover:text-accent transition-all whitespace-nowrap"
          >
            <span>{config.linkText}</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        {nextSectionId ? (
          <button
            onClick={() => scrollToSection(nextSectionId)}
            className="p-2 -mt-1 text-text-tertiary/50 hover:text-accent transition-colors"
            aria-label="다음 섹션으로"
          >
            <ChevronDown size={18} />
          </button>
        ) : (
          <button
            onClick={scrollToTop}
            className="p-2 -mt-1 text-text-tertiary/50 hover:text-accent transition-colors"
            aria-label="맨 위로"
          >
            <ChevronsUp size={18} />
          </button>
        )}
      </div>
    </section>
  );
}
