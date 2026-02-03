"use client";

import { useState } from "react";
import { Book, Layers, Frame, Crown, Landmark, LayoutGrid } from "lucide-react";
import TabUIPreview from "@/components/lab/TabUIPreview";
import FramePreview from "@/components/lab/FramePreview";
import GreekSymbolsPreview from "@/components/lab/CorinthianPreview";
import BookDesignPreview from "@/components/lab/BookDesignPreview";
import HeroBannerPreview from "@/components/lab/HeroBannerPreview";
import ContentCardsPreview from "@/components/lab/ContentCardsPreview";

// #region 탭 타입
type LabTab = "frames" | "tab-ui" | "greek-symbols" | "book-design" | "hero-banner" | "content-cards";

const LAB_TABS = [
  { key: "content-cards" as const, label: "컨텐츠 카드", icon: LayoutGrid },
  { key: "frames" as const, label: "기본 프레임", icon: Frame },
  { key: "tab-ui" as const, label: "탭 UI", icon: Layers },
  { key: "greek-symbols" as const, label: "그리스 심볼", icon: Landmark },
  { key: "hero-banner" as const, label: "메인 배너", icon: Crown },
  { key: "book-design" as const, label: "책 디자인", icon: Book },
];
// #endregion

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<LabTab>("content-cards");

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
        {/* 컨텐츠 카드 탭 */}
        {activeTab === "content-cards" && (
          <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Content Cards</h2>
              <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">프로젝트 내 모든 컨텐츠 카드 컴포넌트 가이드</p>
            </div>
            <div className="w-full">
              <ContentCardsPreview />
            </div>
          </section>
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

        {/* 그리스 심볼 탭 */}
        {activeTab === "greek-symbols" && (
          <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Greek Symbols</h2>
              <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">고대 그리스 테마 SVG 일러스트레이션</p>
            </div>
            <div className="w-full">
              <GreekSymbolsPreview />
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
