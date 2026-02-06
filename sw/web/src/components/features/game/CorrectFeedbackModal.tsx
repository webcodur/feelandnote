/*
  파일명: components/features/game/CorrectFeedbackModal.tsx
  기능: 게임 피드백 오버레이
  책임: 정답/접전보너스/접전오답 시 중앙에 피드백 아이콘+텍스트 표시
*/
"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Shield, ShieldMinus } from "lucide-react";

type FeedbackVariant = "correct" | "bonus" | "closeCall";

interface CorrectFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: FeedbackVariant;
  title?: string;
  subtitle?: string;
  duration?: number;
}

const variantConfig: Record<FeedbackVariant, {
  iconColor: string;
  titleColor: string;
  subtitleColor: string;
  defaultTitle: string;
  defaultSubtitle: string;
  Icon: typeof CheckCircle2;
}> = {
  correct: {
    iconColor: "text-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]",
    titleColor: "text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]",
    subtitleColor: "text-green-400/80",
    defaultTitle: "정답입니다!",
    defaultSubtitle: "연속 정답 +1",
    Icon: CheckCircle2,
  },
  bonus: {
    iconColor: "text-accent drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]",
    titleColor: "text-accent drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]",
    subtitleColor: "text-amber-400/80",
    defaultTitle: "접전!",
    defaultSubtitle: "라이프 +1",
    Icon: Shield,
  },
  closeCall: {
    iconColor: "text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]",
    titleColor: "text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]",
    subtitleColor: "text-orange-400/80",
    defaultTitle: "접전...",
    defaultSubtitle: "라이프 -1",
    Icon: ShieldMinus,
  },
};

export default function CorrectFeedbackModal({
  isOpen,
  onClose,
  variant = "correct",
  title,
  subtitle,
  duration = 1500,
}: CorrectFeedbackModalProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    timeoutRef.current = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const config = variantConfig[variant];
  const { Icon } = config;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* 중앙 피드백 (배경 틴트 없이 아이콘+텍스트만) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 animate-in zoom-in-95 fade-in duration-200">
          <Icon size={48} className={config.iconColor} />
          <div className="text-center">
            <h3 className={`text-xl md:text-2xl font-serif font-black ${config.titleColor}`}>
              {title ?? config.defaultTitle}
            </h3>
            <p className={`text-xs font-cinzel ${config.subtitleColor}`}>
              {subtitle ?? config.defaultSubtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
