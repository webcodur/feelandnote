"use client";

import { useState } from "react";
import { Tab, Tabs } from "@/components/ui";
import { FileText, Heart, Trophy, Book, Film, Lock, Archive, Compass, Calendar, PenTool, Users, Sparkles } from "lucide-react";

const rankColors = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const rankIcons = {
  common: "⬜",
  uncommon: "🟩",
  rare: "🟦",
  epic: "🟪",
  legendary: "🟨",
};

export default function AchievementsView() {
  const [activeTab, setActiveTab] = useState("history");

  const scoreHistory = [
    { id: 1, icon: <FileText size={20} />, action: "Review 작성 (해리 포터와 마법사의 돌)", date: "방금 전", points: "+5" },
    { id: 2, icon: <Heart size={20} />, action: "내 글에 좋아요 받음", date: "10분 전", points: "+2" },
    { id: 3, icon: <Trophy size={20} />, action: "칭호 해금: 백 권의 무게", date: "2024.02.15", points: "+50" },
    { id: 4, icon: <Book size={20} />, action: "콘텐츠 추가 (듄: 파트 2)", date: "2024.02.14", points: "+1" },
  ];

  const titleCategories = [
    {
      name: "기록량",
      icon: <Archive size={20} />,
      progress: { current: 3, total: 5 },
      titles: [
        { name: "첫 발자국", desc: "여정의 시작", bonus: "+20점", rank: "common" as const, unlocked: true, date: "2024.01.15" },
        { name: "열 걸음", desc: "꾸준히 걷는 중", bonus: "+20점", rank: "common" as const, unlocked: true, date: "2024.01.20" },
        { name: "백 권의 무게", desc: "서재가 묵직해졌다", bonus: "+50점", rank: "uncommon" as const, unlocked: true, date: "2024.02.15" },
        { name: "천 개의 이야기", desc: "이야기 수집가", bonus: "+100점", rank: "rare" as const, unlocked: false },
        { name: "기록의 화신", desc: "살아있는 아카이브", bonus: "+500점", rank: "legendary" as const, unlocked: false },
      ],
    },
    {
      name: "다양성",
      icon: <Compass size={20} />,
      progress: { current: 2, total: 5 },
      titles: [
        { name: "장르 여행자", desc: "경계를 넘다", bonus: "+20점", rank: "common" as const, unlocked: true, date: "2024.01.25" },
        { name: "장르 탐험가", desc: "미지의 영역으로", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
        { name: "르네상스인", desc: "모든 분야의 감상가", bonus: "+200점", rank: "epic" as const, unlocked: true, date: "2024.02.28" },
        { name: "작가 헌터", desc: "다양한 목소리", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
        { name: "세계 일주", desc: "국경 없는 감상", bonus: "+100점", rank: "rare" as const, unlocked: false },
      ],
    },
    {
      name: "꾸준함",
      icon: <Calendar size={20} />,
      progress: { current: 1, total: 4 },
      titles: [
        { name: "일주일의 약속", desc: "습관의 시작", bonus: "+20점", rank: "common" as const, unlocked: true, date: "2024.01.22" },
        { name: "한 달의 의지", desc: "흔들리지 않는다", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
        { name: "사계절", desc: "1년을 함께하다", bonus: "+100점", rank: "rare" as const, unlocked: false },
        { name: "무한동력", desc: "멈추지 않는 열정", bonus: "+500점", rank: "legendary" as const, unlocked: false },
      ],
    },
    {
      name: "깊이",
      icon: <PenTool size={20} />,
      progress: { current: 1, total: 5 },
      titles: [
        { name: "꼼꼼한 독자", desc: "세심한 기록", bonus: "+20점", rank: "common" as const, unlocked: false },
        { name: "완벽주의자", desc: "빈틈없는 기록", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
        { name: "구획 마스터", desc: "처음부터 끝까지", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
        { name: "아카이브 장인", desc: "기록의 달인", bonus: "+200점", rank: "epic" as const, unlocked: false },
        { name: "리뷰 장인", desc: "말이 많은 감상가", bonus: "+100점", rank: "rare" as const, unlocked: true, date: "2024.03.05" },
      ],
    },
    {
      name: "소셜",
      icon: <Users size={20} />,
      progress: { current: 2, total: 6 },
      titles: [
        { name: "첫 인연", desc: "누군가 지켜보고 있다", bonus: "+20점", rank: "common" as const, unlocked: true, date: "2024.01.18" },
        { name: "작은 영향력", desc: "목소리가 퍼지다", bonus: "+50점", rank: "uncommon" as const, unlocked: true, date: "2024.02.20" },
        { name: "여론 형성자", desc: "문화계의 목소리", bonus: "+100점", rank: "rare" as const, unlocked: false },
        { name: "인플루언서", desc: "트렌드를 이끌다", bonus: "+200점", rank: "epic" as const, unlocked: false },
        { name: "공감의 물결", desc: "마음이 전해지다", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
        { name: "토론왕", desc: "대화를 이끄는 자", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
      ],
    },
    {
      name: "특수",
      icon: <Sparkles size={20} />,
      progress: { current: 1, total: 9 },
      titles: [
        { name: "올빼미족", desc: "밤이 깊을수록 깨어있다", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
        { name: "일출 독서", desc: "해와 함께 일어나다", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
        { name: "주말 마라토너", desc: "쉼 없는 문화 마라톤", bonus: "+100점", rank: "rare" as const, unlocked: false },
        { name: "시리즈 정복자", desc: "끝까지 함께하다", bonus: "+50점", rank: "uncommon" as const, unlocked: true, date: "2024.02.10" },
        { name: "크로스미디어", desc: "비교의 즐거움", bonus: "+50점", rank: "uncommon" as const, unlocked: false },
        { name: "고독한 미식가", desc: "개척자의 발자국", bonus: "+100점", rank: "rare" as const, unlocked: false },
        { name: "트렌드세터", desc: "유행을 만들다", bonus: "+200점", rank: "epic" as const, unlocked: false },
        { name: "상상력의 화신", desc: "창작의 불꽃", bonus: "+100점", rank: "rare" as const, unlocked: false },
        { name: "은둔고수", desc: "조용한 거장", bonus: "+200점", rank: "epic" as const, unlocked: false },
      ],
    },
  ];

  const totalTitles = titleCategories.reduce((sum, cat) => sum + cat.titles.length, 0);
  const unlockedTitles = titleCategories.reduce((sum, cat) => sum + cat.titles.filter((t) => t.unlocked).length, 0);

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
        <div>
          {/* Progress Summary */}
          <div className="bg-bg-card rounded-2xl p-6 border border-border mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-text-secondary mb-1">전체 진행률</div>
                <div className="text-3xl font-bold">
                  {unlockedTitles} / {totalTitles}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-text-secondary mb-1">획득 보너스</div>
                <div className="text-3xl font-bold text-accent">
                  +{titleCategories.reduce((sum, cat) => sum + cat.titles.filter((t) => t.unlocked).reduce((s, t) => s + parseInt(t.bonus), 0), 0)}점
                </div>
              </div>
            </div>

            {/* Category Progress */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {titleCategories.map((cat) => {
                const progress = (cat.progress.current / cat.progress.total) * 100;
                return (
                  <div key={cat.name} className="bg-bg-main rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-accent">{cat.icon}</span>
                      <span className="font-semibold text-sm">{cat.name}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-text-secondary">
                      {cat.progress.current} / {cat.progress.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Title Categories */}
          {titleCategories.map((category) => (
            <div key={category.name} className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-accent">{category.icon}</span>
                <h3 className="text-2xl font-bold">{category.name}</h3>
                <span className="text-sm text-text-secondary">
                  ({category.progress.current}/{category.progress.total})
                </span>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {category.titles.map((title, idx) => (
                  <div
                    key={idx}
                    className={`bg-bg-card rounded-xl p-5 border border-border transition-all duration-200 hover:-translate-y-1 hover:border-accent
                      ${!title.unlocked ? "opacity-60 bg-black/20" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{rankIcons[title.rank]}</span>
                        <div>
                          <div className={`font-bold text-base ${rankColors[title.rank]}`}>
                            {title.unlocked ? title.name : "???"}
                          </div>
                          {title.unlocked && title.date && (
                            <div className="text-xs text-text-secondary mt-0.5">{title.date}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-semibold py-1 px-2 rounded-lg bg-white/5">
                        {title.unlocked ? title.bonus : "???"}
                      </div>
                    </div>
                    <div className="text-sm text-text-secondary leading-relaxed">
                      {title.unlocked ? `"${title.desc}"` : "조건을 달성하면 해금됩니다"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
