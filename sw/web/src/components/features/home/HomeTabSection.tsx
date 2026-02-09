"use client";

import { useState, useRef } from "react";
import Logo from "@/components/ui/Logo";
import { Tabs, Tab } from "@/components/ui/Tab";
import { ChevronDown } from "lucide-react";

interface HomeTabSectionProps {
  recordSection: React.ReactNode;
  figureSection: React.ReactNode;
}

export default function HomeTabSection({
  recordSection,
  figureSection,
}: HomeTabSectionProps) {
  const [activeTab, setActiveTab] = useState<"record" | "figure">("figure");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScrollDown = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Logo Space */}
      <div className="flex flex-col items-center justify-center pt-24 pb-6 md:pt-40 md:pb-10 animate-in fade-in slide-in-from-top-4 duration-700 w-full">
        <Logo size="xl" variant="hero" subtitle="YOUR CULTURAL LEGACY" />
        
        {/* Service Intro */}
        <div className="mt-10 md:mt-14 text-center max-w-md px-6 space-y-6 animate-in fade-in delay-200 duration-700">
          <p className="text-lg md:text-xl font-serif text-text-primary/90 leading-relaxed break-keep">
            당신의 문화적 유산을 기록하고,<br className="hidden md:block" />
            시대를 초월한 지혜와 만나보세요.
          </p>
          <p className="text-sm md:text-base text-text-secondary/70 font-light leading-relaxed break-keep">
            책, 영화, 음악, 그리고 위대한 인물들의 이야기.<br />
            이곳은 당신의 영감이 머무르는 공간입니다.
          </p>
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
            label={<span className="text-lg md:text-xl px-4 py-2">오늘의 인물</span>}
            active={activeTab === "figure"}
            onClick={() => setActiveTab("figure")}
            className="flex-1 justify-center"
          />
          <Tab
            label={<span className="text-lg md:text-xl px-4 py-2">빠른 기록</span>}
            active={activeTab === "record"}
            onClick={() => setActiveTab("record")}
            className="flex-1 justify-center"
          />
        </Tabs>
      </div>

      {/* 3. Content */}
      <div className="w-full animate-in fade-in duration-500">
        <div className="w-full max-w-5xl mx-auto px-4 py-8">
            {activeTab === "figure" ? figureSection : recordSection}
        </div>
      </div>
    </div>
  );
}
