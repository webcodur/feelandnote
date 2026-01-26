"use client";

import { useState } from "react";
import { Layers, Frame } from "lucide-react";
import TabUIPreview from "@/components/lab/TabUIPreview";
import FramePreview from "@/components/lab/FramePreview";

// #region 탭 타입
type LabTab = "frames" | "tab-ui";

const LAB_TABS = [
  { key: "frames" as const, label: "기본 프레임", icon: Frame },
  { key: "tab-ui" as const, label: "탭 UI", icon: Layers },
];
// #endregion

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<LabTab>("frames");

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col items-center py-12 md:py-20 px-4">
      <h1 className="text-3xl md:text-4xl font-cinzel text-[#d4af37] mb-8">Component Lab</h1>

      {/* 탭 네비게이션 */}
      <div className="w-full max-w-6xl mb-10">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          {LAB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm
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
      </div>
    </div>
  );
}
