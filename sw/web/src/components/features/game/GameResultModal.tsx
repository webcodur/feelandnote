/*
  파일명: components/features/game/GameResultModal.tsx
  기능: 게임 결과 모달
  책임: 게임 오버 시 점수와 재시작 버튼을 표시한다.
*/ // ------------------------------

"use client";

import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui";
import { Trophy, RotateCcw, Flame, Star } from "lucide-react";

interface GameResultModalProps {
  isOpen: boolean;
  streak: number;
  highScore: number;
  onRestart: () => void;
}

export default function GameResultModal({
  isOpen,
  streak,
  highScore,
  onRestart,
}: GameResultModalProps) {
  const isNewRecord = streak === highScore && streak > 0;

  return (
    <Modal isOpen={isOpen} onClose={onRestart} title="게임 오버" icon={Trophy} size="sm">
      <ModalBody className="text-center">
        {/* 점수 표시 */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="text-accent" size={32} />
            <span className="text-5xl font-bold text-white">{streak}</span>
          </div>
          <p className="text-text-secondary">연속 정답</p>
        </div>

        {/* 신기록 표시 */}
        {isNewRecord && (
          <div className="flex items-center justify-center gap-2 mb-4 text-yellow-400">
            <Star size={20} fill="currentColor" />
            <span className="font-bold">신기록 달성!</span>
            <Star size={20} fill="currentColor" />
          </div>
        )}

        {/* 최고 기록 */}
        <div className="text-sm text-text-secondary">
          나의 최고 기록: <span className="text-white font-semibold">{highScore}</span>
        </div>
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button onClick={onRestart} className="min-w-[140px]">
          <RotateCcw size={18} />
          다시 하기
        </Button>
      </ModalFooter>
    </Modal>
  );
}
