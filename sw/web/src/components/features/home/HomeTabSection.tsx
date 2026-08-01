"use client";

import { useState, useRef, type ReactNode } from "react";
import Logo from "@/components/ui/Logo";
import { Tabs, Tab } from "@/components/ui/Tab";
import { ChevronDown, Info, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface HomeTabSectionProps {
  recordSection: React.ReactNode;
  figureSection: React.ReactNode;
  freeSection: React.ReactNode;
  /** 환영판을 닫은 적이 있으면 로고·소개 없이 바로 탭부터 그린다 */
  introDismissed?: boolean;
  /** 환영판 본문 — 서비스 소개 전체(첫인사 액자 포함). /about과 같은 것을 그린다 */
  aboutPanel?: ReactNode;
  labels: {
    todayFigure: string;
    quickRecord: string;
    freeBoard: string;
    introClose: string;
    introReopen: string;
  };
}

export default function HomeTabSection({
  recordSection,
  figureSection,
  freeSection,
  labels,
  introDismissed = false,
  aboutPanel,
}: HomeTabSectionProps) {
  const tShared = useTranslations("shared");
  const [activeTab, setActiveTab] = useState<"record" | "figure" | "free">("figure");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [introHidden, setIntroHidden] = useState(introDismissed);

  /** 환영판을 닫는다 — 1년간 기억해 다음 방문부터 바로 콘텐츠로 들어간다 */
  const dismissIntro = () => {
    document.cookie = "fn_intro_seen=1; max-age=31536000; path=/";
    setIntroHidden(true);
  };

  const handleScrollDown = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Logo Space — 로고는 상시, 그 아래 환영판만 닫을 수 있다 */}
      <div
        className={`flex flex-col items-center justify-center pt-16 ${introHidden ? "pb-2 md:pt-20 md:pb-4" : "pb-6 md:pt-28 md:pb-10"} animate-in fade-in slide-in-from-top-4 duration-700 w-full`}
      >
        <Logo size="xl" variant="hero" subtitle="YOUR CULTURAL LEGACY" />

        {/* 닫힌 뒤에는 상설 소개로 가는 조용한 길만 남긴다 */}
        {introHidden && (
          <Link
            href="/about"
            className="group mt-4 inline-flex items-center gap-1.5 text-xs md:text-[13px] tracking-wide text-text-secondary hover:text-accent"
          >
            <Info size={13} aria-hidden />
            <span className="border-b border-white/10 group-hover:border-accent/60 pb-0.5">
              {labels.introReopen}
            </span>
          </Link>
        )}

        {/* 환영판 — 서비스 소개 전체. 오른쪽 위 X로 닫는다 */}
        {!introHidden && aboutPanel && (
          <div className="relative w-full max-w-3xl mx-auto px-3 md:px-6 mt-10 md:mt-16 animate-in fade-in delay-200 duration-700">
            <button
              onClick={dismissIntro}
              className="absolute top-0 right-3 md:right-6 z-20 p-2 hover:text-accent bg-white/5 hover:bg-accent/10 rounded-full"
              aria-label={labels.introClose}
              title={labels.introClose}
            >
              <X size={16} />
            </button>
            {aboutPanel}
          </div>
        )}

        {/* Scroll Button & Divider */}
        {!introHidden && (
          <div className="mt-16 md:mt-24 flex flex-col items-center gap-6 animate-in fade-in delay-500 duration-1000 w-full">
            <button
              onClick={handleScrollDown}
              className="group flex flex-col items-center gap-3 hover:text-accent"
              aria-label={tShared("scrollDown")}
            >
              <div className="relative p-2.5 rounded-full border border-white/10 group-hover:border-accent/40 bg-white/5 group-hover:bg-accent/10">
                <ChevronDown size={22} strokeWidth={1.5} className="animate-bounce" />
                <div className="absolute -inset-1.5 rounded-full border border-transparent group-hover:border-accent/30 pointer-events-none" />
              </div>
            </button>
            <div className="w-full max-w-[240px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        )}
      </div>

      {/* 2. Tabs */}
      <div
        ref={scrollRef}
        className={`w-full max-w-lg mx-auto px-2 md:px-4 ${introHidden ? "mt-6 md:mt-10" : "mt-14 md:mt-20"} mb-8 md:mb-12 scroll-mt-24`}
      >
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
    </div>
  );
}
