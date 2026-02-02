/*
  파일명: components/features/game/CorrectFeedbackModal.tsx
  기능: 정답 피드백 배경 오버레이
  책임: 정답 시 배경에 은은하게 피드백 표시, 게임 진행 방해 없음
*/
"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";

interface CorrectFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  duration?: number;
}

export default function CorrectFeedbackModal({
  isOpen,
  onClose,
  title = "정답입니다!",
  subtitle = "연속 정답 +1",
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

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* 배경 플래시 */}
      <div className="absolute inset-0 bg-green-500/10 animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.15)_0%,transparent_60%)]" />

      {/* 중앙 피드백 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 animate-in zoom-in-95 fade-in duration-200">
          <div className="relative">
            <CheckCircle2 size={48} className="text-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]" />
          </div>
          <div className="text-center">
            <h3 className="text-xl md:text-2xl font-serif font-black text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
              {title}
            </h3>
            <p className="text-xs text-green-400/80 font-cinzel">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
