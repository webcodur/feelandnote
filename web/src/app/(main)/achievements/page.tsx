"use client";

import { useState } from "react";
import { Tab, Tabs } from "@/components/ui";
import { FileText, Heart, Trophy, Book, Film, Lock } from "lucide-react";

const rankColors = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

export default function AchievementsPage() {
  const [activeTab, setActiveTab] = useState("history");

  const scoreHistory = [
    { id: 1, icon: <FileText size={20} />, action: "Review 작성 (해리 포터와 마법사의 돌)", date: "방금 전", points: "+5" },
    { id: 2, icon: <Heart size={20} />, action: "내 글에 좋아요 받음", date: "10분 전", points: "+2" },
    { id: 3, icon: <Trophy size={20} />, action: "칭호 해금: 백 권의 무게", date: "2024.02.15", points: "+50" },
    { id: 4, icon: <Book size={20} />, action: "콘텐츠 추가 (듄: 파트 2)", date: "2024.02.14", points: "+1" },
  ];

  const titles = [
    { id: 1, icon: <FileText size={32} />, name: "기록의 화신", desc: '"살아있는 아카이브"', bonus: "+500점", rank: "legendary" as const, unlocked: true },
    { id: 2, icon: <Film size={32} />, name: "르네상스인", desc: '"모든 분야의 감상가"', bonus: "+200점", rank: "epic" as const, unlocked: true },
    { id: 3, icon: <Book size={32} />, name: "백 권의 무게", desc: '"서재가 묵직해졌다"', bonus: "+50점", rank: "uncommon" as const, unlocked: true },
    { id: 4, icon: <Lock size={32} />, name: "???", desc: "숨겨진 칭호입니다.", bonus: "???", rank: "common" as const, unlocked: false },
    { id: 5, icon: <Lock size={32} />, name: "???", desc: "숨겨진 칭호입니다.", bonus: "???", rank: "rare" as const, unlocked: false },
  ];

  return (
    <>
      {/* Score Dashboard */}
      <div
        className="bg-bg-card rounded-3xl p-8 border border-border mb-8 flex justify-between items-center"
        style={{
          backgroundImage: `linear-gradient(rgba(124, 77, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 77, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      >
        <div className="flex-1">
          <div className="text-sm text-text-secondary mb-2 font-semibold">총 업적 점수</div>
          <div className="text-5xl font-black bg-gradient-to-br from-white to-indigo-300 bg-clip-text text-transparent leading-none">
            1,530
          </div>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">1,400</div>
            <div className="text-[13px] text-text-secondary">활동 점수</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">+130</div>
            <div className="text-[13px] text-text-secondary">칭호 보너스</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-8">
        <Tabs>
          <Tab label="점수 내역" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
          <Tab label="칭호 목록" active={activeTab === "titles"} onClick={() => setActiveTab("titles")} />
        </Tabs>
      </div>

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4">
          {scoreHistory.map((item) => (
            <div
              key={item.id}
              className="bg-bg-card rounded-xl py-4 px-6 border border-border flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-[15px]">{item.action}</div>
                  <div className="text-[13px] text-text-secondary">{item.date}</div>
                </div>
              </div>
              <div className="text-base font-bold text-accent">{item.points}</div>
            </div>
          ))}
        </div>
      )}

      {/* Titles Tab */}
      {activeTab === "titles" && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {titles.map((title) => (
            <div
              key={title.id}
              className={`bg-bg-card rounded-2xl p-6 border border-border flex flex-col items-center text-center relative overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:border-accent
                ${!title.unlocked ? "opacity-50 bg-black/20" : ""}`}
            >
              <div className={`text-5xl mb-4 ${!title.unlocked ? "grayscale" : ""}`}>
                {title.icon}
              </div>
              <div className={`text-lg font-bold mb-2 ${rankColors[title.rank]}`}>
                {title.name}
              </div>
              <div className="text-sm text-text-secondary mb-4 leading-snug">{title.desc}</div>
              <div className="text-[13px] font-semibold py-1 px-3 rounded-xl bg-white/5">
                {title.bonus}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
