"use client";

import { useState, useRef, Fragment, type ReactNode } from "react";
import Logo from "@/components/ui/Logo";
import { Tabs, Tab } from "@/components/ui/Tab";
import { ChevronDown, Info } from "lucide-react";
import Modal, { ModalBody } from "@/components/ui/Modal";
import InspirationChainGraphic from "./InspirationChainGraphic";
import { useTranslations } from "next-intl";

/**
 * [[인물명]] → 엑센트 색상 
 * 《작품명》 → 텍스트 프라이머리 
 * 나머지    → 기본 회색
 */
export function renderHighlighted(text: string): ReactNode[] {
  return text.split(/(\[\[.*?\]\]|《.*?》)/).map((seg, i) => {
    if (seg.startsWith("[[") && seg.endsWith("]]")) {
      const name = seg.slice(2, -2);
      if (name === "Feel&Note") {
        return (
          <span key={i} className="font-cormorant font-semibold tracking-wide inline-flex items-baseline ml-0.5 mr-1.5 text-[17px] md:text-xl whitespace-nowrap">
            <span className="logo-text-cream">FEEL</span>
            <span className="logo-text-sepia mx-1">&amp;</span>
            <span className="logo-text-cream">NOTE</span>
          </span>
        );
      }
      return (
        <span key={i} className="text-accent font-medium tracking-wide">
          {name}
        </span>
      );
    }
    if (seg.startsWith("《") && seg.endsWith("》")) {
      const book = seg.slice(1, -1);
      return (
        <span key={i} className="text-text-primary/95 font-medium tracking-wide">
          《{book}》
        </span>
      );
    }
    return <span key={i}>{seg}</span>;
  });
}

interface HomeTabSectionProps {
  recordSection: React.ReactNode;
  figureSection: React.ReactNode;
  freeSection: React.ReactNode;
  labels: {
    intro: string;
    introSub: string;
    todayFigure: string;
    quickRecord: string;
    freeBoard: string;
    inspirationChainTitle: string;
    inspirationChains: {
      text: string;
      reader: { name: string; avatar_url: string | null } | null;
      author: { name: string; avatar_url: string | null } | null;
    }[][];
    inspirationConclusion: string;
  };
}

export default function HomeTabSection({
  recordSection,
  figureSection,
  freeSection,
  labels,
}: HomeTabSectionProps) {
  const tShared = useTranslations("shared");
  const [activeTab, setActiveTab] = useState<"record" | "figure" | "free">("figure");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRelayInfo, setShowRelayInfo] = useState(false);

  const handleScrollDown = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Logo Space */}
      <div className="flex flex-col items-center justify-center pt-16 pb-6 md:pt-28 md:pb-10 animate-in fade-in slide-in-from-top-4 duration-700 w-full">
        <Logo size="xl" variant="hero" subtitle="YOUR CULTURAL LEGACY" />

        {/* Service Intro */}
        <div className="mt-8 md:mt-14 w-full max-w-2xl px-2 md:px-6 animate-in fade-in delay-200 duration-700">
          <div className="relative px-4 py-6 md:px-10 md:py-12 bg-white/[0.02] rounded-sm">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-5 h-5 md:w-7 md:h-7 border-t border-l border-accent/20" />
            <div className="absolute top-0 right-0 w-5 h-5 md:w-7 md:h-7 border-t border-r border-accent/20" />
            <div className="absolute bottom-0 left-0 w-5 h-5 md:w-7 md:h-7 border-b border-l border-accent/20" />
            <div className="absolute bottom-0 right-0 w-5 h-5 md:w-7 md:h-7 border-b border-r border-accent/20" />

            {/* Info Icon */}
            <button 
              onClick={() => setShowRelayInfo(true)}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-20 p-2 text-text-tertiary hover:text-accent bg-white/5 hover:bg-accent/10 rounded-full"
              title={labels.inspirationChainTitle}
            >
              <Info size={16} />
            </button>

            {/* Prose */}
            <div className="relative z-10 space-y-6 md:space-y-8 text-[14.5px] md:text-[16.5px] text-text-primary/80 leading-[2] md:leading-[2.1] break-keep font-light tracking-wide">
              {labels.intro.split("\n\n").map((para, i) => (
                <p key={i} className="whitespace-pre-line">{renderHighlighted(para)}</p>
              ))}
            </div>

            {/* Divider + Catchphrase */}
            <div className="relative z-10 mt-10 md:mt-12 flex flex-col items-center gap-5">
              <div className="flex items-center gap-4">
                <div className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent via-accent/50 to-accent/80" />
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rotate-45 bg-accent shadow-[0_0_10px_theme(colors.accent)]" />
                <div className="h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent via-accent/50 to-accent/80" />
              </div>
              <div className="flex flex-col items-center gap-2 md:gap-3 text-center drop-shadow-sm tracking-[0.2em]">
                {typeof labels.introSub === 'string' ? labels.introSub.split('\n').map((line, i) => (
                  <span key={i} className={i === 0 
                    ? "text-[13.5px] md:text-base text-text-primary font-medium"
                    : "text-[13.5px] md:text-base text-[#E6D5A7] font-medium"
                  }>
                    {line}
                  </span>
                )) : (
                  <p className="text-[13.5px] md:text-base text-accent/90 font-medium whitespace-pre-line">
                    {labels.introSub}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Button & Divider */}
        <div className="mt-20 md:mt-32 flex flex-col items-center gap-6 animate-in fade-in delay-500 duration-1000 w-full">
            <button
                onClick={handleScrollDown}
                className="group flex flex-col items-center gap-3 text-text-tertiary hover:text-accent"
                aria-label={tShared("scrollDown")}
            >
                <div className="relative p-2.5 rounded-full border border-white/10 group-hover:border-accent/40 bg-white/5 group-hover:bg-accent/10">
                    <ChevronDown size={22} strokeWidth={1.5} className="animate-bounce" />
                    <div className="absolute -inset-1.5 rounded-full border border-transparent group-hover:border-accent/30 pointer-events-none" />
                </div>
            </button>
            <div className="w-full max-w-[240px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>

      {/* 2. Tabs */}
      <div ref={scrollRef} className="w-full max-w-lg mx-auto px-2 md:px-4 mt-14 md:mt-20 mb-8 md:mb-12 scroll-mt-24">
        <Tabs className="w-full justify-center border-b border-white/10">
          <Tab
            label={<span className="text-[14.5px] sm:text-base md:text-xl px-1 sm:px-2 md:px-4 py-2 whitespace-nowrap">{labels.todayFigure}</span>}
            active={activeTab === "figure"}
            onClick={() => setActiveTab("figure")}
            className="flex-1 justify-center"
          />
          <Tab
            label={<span className="text-[14.5px] sm:text-base md:text-xl px-1 sm:px-2 md:px-4 py-2 whitespace-nowrap">{labels.quickRecord}</span>}
            active={activeTab === "record"}
            onClick={() => setActiveTab("record")}
            className="flex-1 justify-center"
          />
          <Tab
            label={<span className="text-[14.5px] sm:text-base md:text-xl px-1 sm:px-2 md:px-4 py-2 whitespace-nowrap">{labels.freeBoard}</span>}
            active={activeTab === "free"}
            onClick={() => setActiveTab("free")}
            className="flex-1 justify-center"
          />
        </Tabs>
      </div>

      {/* 3. Content */}
      <div className="w-full animate-in fade-in duration-500">
        <div className="w-full max-w-5xl mx-auto px-0 py-4 md:px-4 md:py-8">
            {activeTab === "figure" ? figureSection : activeTab === "record" ? recordSection : freeSection}
        </div>
      </div>

      <Modal
        isOpen={showRelayInfo}
        onClose={() => setShowRelayInfo(false)}
        title={labels.inspirationChainTitle}
        icon={Info}
      >
        <ModalBody className="py-4 px-3 md:py-5 md:px-5">
          <InspirationChainGraphic 
            chains={labels.inspirationChains} 
            conclusion={labels.inspirationConclusion} 
          />
        </ModalBody>
      </Modal>
    </div>
  );
}
