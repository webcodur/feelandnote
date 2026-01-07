/*
  파일명: /components/features/achievements/AchievementUnlockModal.tsx
  기능: 칭호 해금 알림 모달
  책임: 해금된 칭호를 등급별 스타일과 애니메이션으로 표시한다.
*/ // ------------------------------
"use client";

import { useEffect, useState } from "react";
import { X, Trophy } from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

interface UnlockedTitle {
  id: string;
  name: string;
  description: string;
  grade: "common" | "uncommon" | "rare" | "epic" | "legendary";
  bonus_score: number;
}

interface AchievementUnlockModalProps {
  titles: UnlockedTitle[];
  onClose: () => void;
}

const gradeConfig = {
  common: {
    color: "text-gray-300",
    bg: "bg-gray-500/20",
    border: "border-gray-500/50",
    glow: "shadow-gray-500/30",
    icon: "⬜",
    label: "일반",
  },
  uncommon: {
    color: "text-green-400",
    bg: "bg-green-500/20",
    border: "border-green-500/50",
    glow: "shadow-green-500/30",
    icon: "🟩",
    label: "고급",
  },
  rare: {
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    glow: "shadow-blue-500/30",
    icon: "🟦",
    label: "희귀",
  },
  epic: {
    color: "text-purple-400",
    bg: "bg-purple-500/20",
    border: "border-purple-500/50",
    glow: "shadow-purple-500/30",
    icon: "🟪",
    label: "영웅",
  },
  legendary: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/50",
    glow: "shadow-yellow-500/30",
    icon: "🟨",
    label: "전설",
  },
};

export default function AchievementUnlockModal({ titles, onClose }: AchievementUnlockModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showParticles, setShowParticles] = useState(true);

  const currentTitle = titles[currentIndex];
  const config = gradeConfig[currentTitle?.grade || "common"];
  const hasNext = currentIndex < titles.length - 1;

  useEffect(() => {
    // 초기 애니메이션
    setIsAnimating(true);
    setShowParticles(true);

    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 800);

    const particleTimer = setTimeout(() => {
      setShowParticles(false);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(particleTimer);
    };
  }, [currentIndex]);

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  if (!currentTitle) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.modal }}>
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* 파티클 효과 */}
      {showParticles && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${60 + Math.random() * 40}%`,
                backgroundColor:
                  currentTitle.grade === "legendary"
                    ? "#fbbf24"
                    : currentTitle.grade === "epic"
                    ? "#a855f7"
                    : currentTitle.grade === "rare"
                    ? "#3b82f6"
                    : currentTitle.grade === "uncommon"
                    ? "#22c55e"
                    : "#9ca3af",
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random()}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 메인 모달 */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-3xl border-2 ${config.border} ${config.bg} backdrop-blur-xl overflow-hidden
          ${isAnimating ? "animate-unlock-bounce" : ""}`}
        style={{
          zIndex: Z_INDEX.modal + 1,
          boxShadow: `0 0 60px 20px ${
            currentTitle.grade === "legendary"
              ? "rgba(251, 191, 36, 0.3)"
              : currentTitle.grade === "epic"
              ? "rgba(168, 85, 247, 0.3)"
              : currentTitle.grade === "rare"
              ? "rgba(59, 130, 246, 0.3)"
              : currentTitle.grade === "uncommon"
              ? "rgba(34, 197, 94, 0.3)"
              : "rgba(156, 163, 175, 0.2)"
          }`,
        }}
      >
        {/* 닫기 버튼 */}
        <Button
          unstyled
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20"
          style={{ zIndex: Z_INDEX.sticky }}
        >
          <X size={20} className="text-white/70" />
        </Button>

        {/* 상단 배지 */}
        <div className="pt-8 pb-4 text-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bg} border ${config.border}`}
          >
            <Trophy size={16} className={config.color} />
            <span className={`text-sm font-bold ${config.color}`}>
              {config.label} 칭호 해금!
            </span>
          </div>
        </div>

        {/* 아이콘 */}
        <div className="flex justify-center py-6">
          <div
            className={`text-8xl ${isAnimating ? "animate-unlock-icon" : ""}`}
            style={{
              filter: `drop-shadow(0 0 20px ${
                currentTitle.grade === "legendary"
                  ? "rgba(251, 191, 36, 0.8)"
                  : currentTitle.grade === "epic"
                  ? "rgba(168, 85, 247, 0.8)"
                  : currentTitle.grade === "rare"
                  ? "rgba(59, 130, 246, 0.8)"
                  : currentTitle.grade === "uncommon"
                  ? "rgba(34, 197, 94, 0.8)"
                  : "rgba(156, 163, 175, 0.5)"
              })`,
            }}
          >
            {config.icon}
          </div>
        </div>

        {/* 칭호 정보 */}
        <div className="px-8 pb-6 text-center">
          <h2 className={`text-3xl font-black mb-2 ${config.color}`}>
            {currentTitle.name}
          </h2>
          <p className="text-lg text-white/70 mb-4">"{currentTitle.description}"</p>
          <div
            className={`inline-block px-4 py-2 rounded-xl ${config.bg} border ${config.border}`}
          >
            <span className={`text-xl font-bold ${config.color}`}>
              +{currentTitle.bonus_score}점
            </span>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="px-8 pb-8">
          <Button
            unstyled
            onClick={handleNext}
            className={`w-full py-4 rounded-2xl font-bold text-lg
              ${config.bg} border-2 ${config.border} ${config.color}
              hover:scale-[1.02] active:scale-[0.98]`}
          >
            {hasNext ? `다음 (${currentIndex + 1}/${titles.length})` : "확인"}
          </Button>
        </div>

        {/* 페이지 인디케이터 */}
        {titles.length > 1 && (
          <div className="flex justify-center gap-2 pb-6">
            {titles.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx === currentIndex ? `${config.color} scale-125` : "bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
