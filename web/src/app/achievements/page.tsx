"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Tab, Tabs } from "@/components/ui";
import { FileText, Heart, Trophy, Book, Film, PenTool, Lock } from "lucide-react";

export default function AchievementsPage() {
  const [activeTab, setActiveTab] = useState("history");

  const scoreHistory = [
    { id: 1, icon: <FileText size={20} />, action: "Review 작성 (해리 포터와 마법사의 돌)", date: "방금 전", points: "+5" },
    { id: 2, icon: <Heart size={20} />, action: "내 글에 좋아요 받음", date: "10분 전", points: "+2" },
    { id: 3, icon: <Trophy size={20} />, action: "칭호 해금: 백 권의 무게", date: "2024.02.15", points: "+50" },
    { id: 4, icon: <Book size={20} />, action: "콘텐츠 추가 (듄: 파트 2)", date: "2024.02.14", points: "+1" },
  ];

  const titles = [
    { id: 1, icon: <FileText size={32} />, name: "기록의 화신", desc: '"살아있는 아카이브"', bonus: "+500점", rank: "legendary", unlocked: true },
    { id: 2, icon: <Film size={32} />, name: "르네상스인", desc: '"모든 분야의 감상가"', bonus: "+200점", rank: "epic", unlocked: true },
    { id: 3, icon: <Book size={32} />, name: "백 권의 무게", desc: '"서재가 묵직해졌다"', bonus: "+50점", rank: "uncommon", unlocked: true },
    { id: 4, icon: <Lock size={32} />, name: "???", desc: "숨겨진 칭호입니다.", bonus: "???", rank: "common", unlocked: false },
    { id: 5, icon: <Lock size={32} />, name: "???", desc: "숨겨진 칭호입니다.", bonus: "???", rank: "rare", unlocked: false },
  ];

  return (
    <MainLayout>
      <div className="achievements-container">
        {/* Score Dashboard */}
        <div className="score-dashboard">
          <div className="total-score-container">
            <div className="score-label">총 업적 점수</div>
            <div className="total-score">1,530</div>
          </div>
          <div className="score-breakdown">
            <div className="breakdown-item">
              <div className="breakdown-value">1,400</div>
              <div className="breakdown-label">활동 점수</div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-value" style={{ color: "var(--accent)" }}>+130</div>
              <div className="breakdown-label">칭호 보너스</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="page-tabs">
          <Tabs>
            <Tab label="점수 내역" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
            <Tab label="칭호 목록" active={activeTab === "titles"} onClick={() => setActiveTab("titles")} />
          </Tabs>
        </div>

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="score-history-list">
            {scoreHistory.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-info">
                  <div className="history-icon">{item.icon}</div>
                  <div className="history-details">
                    <div className="history-action">{item.action}</div>
                    <div className="history-date">{item.date}</div>
                  </div>
                </div>
                <div className="history-points">{item.points}</div>
              </div>
            ))}
          </div>
        )}

        {/* Titles Tab */}
        {activeTab === "titles" && (
          <div className="title-grid">
            {titles.map((title) => (
              <div
                key={title.id}
                className={`title-card ${!title.unlocked ? "locked" : ""} rank-${title.rank}`}
              >
                <div className="title-icon">{title.icon}</div>
                <div className={`title-name rank-${title.rank}`}>{title.name}</div>
                <div className="title-desc">{title.desc}</div>
                <div className="title-bonus">{title.bonus}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
