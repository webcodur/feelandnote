/*
  파일명: /components/features/archive/batchActions/PinActionBar.tsx
  기능: 핀 모드 액션 바
  책임: 핀 모드 상태와 현재 핀된 개수를 표시하고 모드 종료를 처리한다.
*/ // ------------------------------
"use client";

import { Pin, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

interface PinActionBarProps {
  pinnedCount: number;
  maxCount?: number;
  onExit: () => void;
}

export default function PinActionBar({
  pinnedCount,
  maxCount = 10,
  onExit,
}: PinActionBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border shadow-2xl"
      style={{ zIndex: Z_INDEX.modal - 1 }}
    >
      <div className="max-w-screen-xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 좌측: 모드 정보 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium">
              <Pin size={16} />
              <span>핀 모드</span>
            </div>
            <div className="text-sm text-text-secondary">
              콘텐츠를 클릭하여 상단에 고정합니다
              <span className="mx-2 text-border">|</span>
              <span className="font-bold text-accent">{pinnedCount}</span>
              <span className="text-text-tertiary">/{maxCount}</span>
            </div>
          </div>

          {/* 우측: 종료 버튼 */}
          <Button
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary text-sm"
          >
            <X size={16} />
            <span>종료</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
