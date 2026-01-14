"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, Users } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";

interface HomeTabSectionProps {
  celebTabContent: React.ReactNode;
  feedTabContent: React.ReactNode;
  friendTabContent: React.ReactNode;
}

type TabType = "celeb" | "feed" | "friend";

export default function HomeTabSection({
  celebTabContent,
  feedTabContent,
  friendTabContent,
}: HomeTabSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("celeb");

  return (
    <div className="flex flex-col gap-6">
      {/* 탭 헤더 */}
      <Tabs>
        <Tab
          label={
            <>
              <Sparkles size={18} />
              추천 셀럽
            </>
          }
          active={activeTab === "celeb"}
          onClick={() => setActiveTab("celeb")}
        />
        <Tab
          label={
            <>
              <TrendingUp size={18} />
              셀럽 피드
            </>
          }
          active={activeTab === "feed"}
          onClick={() => setActiveTab("feed")}
        />
        <Tab
          label={
            <>
              <Users size={18} />
              친구 소식
            </>
          }
          active={activeTab === "friend"}
          onClick={() => setActiveTab("friend")}
        />
      </Tabs>

      {/* 탭 콘텐츠 */}
      <div>
        <div className={activeTab === "celeb" ? "block" : "hidden"}>
          {celebTabContent}
        </div>
        <div className={activeTab === "feed" ? "block" : "hidden"}>
          {feedTabContent}
        </div>
        <div className={activeTab === "friend" ? "block" : "hidden"}>
          {friendTabContent}
        </div>
      </div>
    </div>
  );
}
