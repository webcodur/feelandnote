"use client";

import { useState } from "react";
import Link from "next/link";
import { Book, Layers, Frame, Image as ImageIcon, Crown } from "lucide-react";
import TabUIPreview from "@/components/lab/TabUIPreview";
import FramePreview from "@/components/lab/FramePreview";
import LandingIllustrationsPreview from "@/components/lab/LandingIllustrationsPreview";
import CorinthianPreview from "@/components/lab/CorinthianPreview";
import BookDesignPreview from "@/components/lab/BookDesignPreview";
import SectionHeaderNeoPreview from "@/components/lab/SectionHeaderNeoPreview";
import HeroBannerPreview from "@/components/lab/HeroBannerPreview";
import ExploreMockup from "@/components/lab/ExploreMockup";

// #region 탭 타입
type LabTab = "frames" | "tab-ui" | "landing-illustrations" | "corinthian" | "book-design" | "section-header" | "hero-banner" | "mockup";

const LAB_TABS = [
  { key: "mockup" as const, label: "페이지 목업", icon: Crown },
  { key: "section-header" as const, label: "헤더 디자인", icon: Crown },
  { key: "frames" as const, label: "기본 프레임", icon: Frame },
  { key: "tab-ui" as const, label: "탭 UI", icon: Layers },
  { key: "landing-illustrations" as const, label: "랜딩 일러스트", icon: ImageIcon },
  { key: "corinthian" as const, label: "코린트 양식", icon: Crown },
  { key: "hero-banner" as const, label: "메인 배너", icon: Crown },
  { key: "book-design" as const, label: "책 디자인", icon: Book },
];
// #endregion

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<LabTab>("frames");

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col items-center py-12 md:py-20 px-4">
      <h1 className="text-3xl md:text-4xl font-cinzel text-[#d4af37] mb-8">Component Lab</h1>

      {/* 탭 네비게이션 */}
      <div className="w-full max-w-6xl mb-10">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl overflow-x-auto">
          {LAB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                  ${isActive
                    ? "bg-accent text-bg-main"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }
                `}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="w-full max-w-6xl">
        {/* 목업 탭 */}
        {activeTab === "mockup" && (
           <div className="w-full border border-white/5 rounded-2xl overflow-hidden">
              <ExploreMockup />
           </div>
        )}

        {/* 배너 디자인 탭 */}
        {activeTab === "hero-banner" && (
          <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Monumental Banner</h2>
              <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">압도적 위엄의 메인 배너 제안 (2종)</p>
            </div>
            <div className="w-full">
              <HeroBannerPreview />
            </div>
          </section>
        )}

        {/* 헤더 디자인 탭 */}
        {activeTab === "section-header" && (
          <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Neo-Pantheon Header</h2>
              <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">웅장함과 현대미가 결합된 새로운 헤더 시스템</p>
            </div>
            <div className="w-full">
              <SectionHeaderNeoPreview />
            </div>
          </section>
        )}

        {/* 액자 탭 */}
        {activeTab === "frames" && (
          <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Frame System</h2>
              <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">고대 신전 테마 · 실제 재질 기반 액자</p>
            </div>
            <div className="w-full">
              <FramePreview />
            </div>
          </section>
        )}

        {/* 탭 UI 탭 */}
        {activeTab === "tab-ui" && (
          <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Tab UI System</h2>
              <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">통합 디자인 시스템 프리뷰</p>
            </div>
            <div className="w-full">
              <TabUIPreview />
            </div>
          </section>
        )}

        {/* 랜딩 일러스트 탭 */}
        {activeTab === "landing-illustrations" && (
          <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Landing Illustrations</h2>
              <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">랜딩 페이지용 SVG 일러스트레이션</p>
            </div>
            <div className="w-full">
              <LandingIllustrationsPreview />
            </div>
          </section>
        )}

        {/* 코린트 양식 탭 */}
        {activeTab === "corinthian" && (
          <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Corinthian Symbol</h2>
              <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">브랜드 심볼 디자인 실험</p>
            </div>
            <div className="w-full">
              <CorinthianPreview />
            </div>
          </section>
        )}

        {/* 책 디자인 탭 */}
        {activeTab === "book-design" && (
          <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Book Detail Design</h2>
              <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">서적 상세 페이지 UI 실험</p>
            </div>
            <div className="w-full">
              <BookDesignPreview />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
