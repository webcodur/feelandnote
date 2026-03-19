"use client";

import { useState, useRef, type ReactNode } from "react";
import Logo from "@/components/ui/Logo";
import { Tabs, Tab } from "@/components/ui/Tab";
import { ChevronDown } from "lucide-react";

/** [[text]] 마커를 하이라이트 span으로 변환 */
function renderHighlighted(text: string): ReactNode[] {
  return text.split(/(\[\[.*?\]\])/).map((seg, i) => {
    if (seg.startsWith("[[") && seg.endsWith("]]")) {
      const name = seg.slice(2, -2);
      return (
        <span key={i} className="text-text-primary font-medium">
          {name}
        </span>
      );
    }
    return <span key={i}>{seg}</span>;
  });
}

interface HomeTabSectionProps {
  recordSection: React.ReactNode;
  figureSection: React.ReactNode;
  labels: {
    intro: string;
    introSub: string;
    todayFigure: string;
    quickRecord: string;
  };
}

export default function HomeTabSection({
  recordSection,
  figureSection,
  labels,
}: HomeTabSectionProps) {
  const [activeTab, setActiveTab] = useState<"record" | "figure">("figure");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScrollDown = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Logo Space */}
      <div className="flex flex-col items-center justify-center pt-16 pb-6 md:pt-28 md:pb-10 animate-in fade-in slide-in-from-top-4 duration-700 w-full">
        <Logo size="xl" variant="hero" subtitle="YOUR CULTURAL LEGACY" />
        
        {/* Service Intro */}
        <div className="mt-10 md:mt-14 w-full max-w-2xl px-4 md:px-6 animate-in fade-in delay-200 duration-700">
          <div className="relative px-6 py-8 md:px-10 md:py-12 bg-white/[0.02] rounded-sm">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-5 h-5 md:w-7 md:h-7 border-t border-l border-accent/20" />
            <div className="absolute top-0 right-0 w-5 h-5 md:w-7 md:h-7 border-t border-r border-accent/20" />
            <div className="absolute bottom-0 left-0 w-5 h-5 md:w-7 md:h-7 border-b border-l border-accent/20" />
            <div className="absolute bottom-0 right-0 w-5 h-5 md:w-7 md:h-7 border-b border-r border-accent/20" />

            {/* Prose */}
            <div className="space-y-5 text-[15px] md:text-base text-text-primary/60 leading-[1.9] md:leading-[2] break-keep">
              {labels.intro.split("\n\n").map((para, i) => (
                <p key={i}>{renderHighlighted(para)}</p>
              ))}
            </div>

            {/* Divider + Catchphrase */}
            <div className="mt-8 md:mt-10 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-12 md:w-20 bg-gradient-to-r from-transparent to-accent/30" />
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rotate-45 bg-accent/40" />
                <div className="h-[1px] w-12 md:w-20 bg-gradient-to-l from-transparent to-accent/30" />
              </div>
              <p className="text-sm md:text-base tracking-[0.15em] text-accent/60 font-light">
                {labels.introSub}
              </p>
            </div>
          </div>
        </div>

        {/* Scroll Button & Divider */}
        <div className="mt-20 md:mt-32 flex flex-col items-center gap-6 animate-in fade-in delay-500 duration-700 w-full">
            <button 
                onClick={handleScrollDown}
                className="group flex flex-col items-center gap-2 text-text-tertiary hover:text-accent transition-colors"
                aria-label="Scroll down"
            >
                <div className="p-2 rounded-full border border-white/10 group-hover:border-accent/30 bg-white/5 group-hover:bg-accent/10 transition-all animate-bounce">
                    <ChevronDown size={24} strokeWidth={1.5} />
                </div>
            </button>
            <div className="w-full max-w-[200px] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>

      {/* 2. Tabs */}
      <div ref={scrollRef} className="w-full max-w-lg mx-auto px-4 mt-14 md:mt-20 mb-8 md:mb-12 scroll-mt-24">
        <Tabs className="w-full justify-center border-b border-white/10">
          <Tab
            label={<span className="text-lg md:text-xl px-4 py-2">{labels.todayFigure}</span>}
            active={activeTab === "figure"}
            onClick={() => setActiveTab("figure")}
            className="flex-1 justify-center"
          />
          <Tab
            label={<span className="text-lg md:text-xl px-4 py-2">{labels.quickRecord}</span>}
            active={activeTab === "record"}
            onClick={() => setActiveTab("record")}
            className="flex-1 justify-center"
          />
        </Tabs>
      </div>

      {/* 3. Content */}
      <div className="w-full animate-in fade-in duration-500">
        <div className="w-full max-w-5xl mx-auto px-0 py-4 md:px-4 md:py-8">
            {activeTab === "figure" ? figureSection : recordSection}
        </div>
      </div>
    </div>
  );
}
