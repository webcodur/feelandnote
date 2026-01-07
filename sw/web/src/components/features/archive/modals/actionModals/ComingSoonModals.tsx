/*
  파일명: /components/features/archive/modals/actionModals/ComingSoonModals.tsx
  기능: 준비 중 기능 모달
  책임: 핀, 일괄 선택 등 개발 예정 기능의 안내 모달을 제공한다.
*/ // ------------------------------
"use client";

import { Pin, CheckSquare, Construction } from "lucide-react";
import ActionModal from "../ActionModal";

function ComingSoonBadge() {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
      <Construction size={16} className="text-yellow-500" />
      <span className="text-xs font-medium text-yellow-500">개발 중인 기능입니다</span>
    </div>
  );
}

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PinModal({ isOpen, onClose }: PinModalProps) {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      icon={Pin}
      title="고정"
      description="현재 주목해야 할 콘텐츠를 상단에 고정합니다. 고정된 콘텐츠는 월별 그룹과 별개로 '고정됨' 섹션에 항상 표시됩니다."
      actions={[{ label: "준비 중인 기능입니다", onClick: onClose, variant: "secondary", disabled: true }]}
    >
      <div className="bg-surface/50 rounded-xl p-4 space-y-2">
        <p className="text-sm text-text-secondary">
          <span className="text-accent font-medium">Tip:</span> 고정은 최대 10개까지 가능하며, "이번 주에 끝낼 콘텐츠"처럼 단기 목표 관리에 활용하세요.
        </p>
      </div>
      <ComingSoonBadge />
    </ActionModal>
  );
}

interface BatchModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BatchModeModal({ isOpen, onClose }: BatchModeModalProps) {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      icon={CheckSquare}
      title="배치 모드"
      description="여러 콘텐츠를 선택하여 일괄 작업을 수행합니다. 삭제, 상태 변경, 분류 이동 등을 한 번에 처리할 수 있습니다."
      actions={[{ label: "준비 중인 기능입니다", onClick: onClose, variant: "secondary", disabled: true }]}
    >
      <div className="bg-surface/50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-text-primary mb-2">지원 예정 작업:</p>
        <ul className="text-sm text-text-secondary space-y-1">
          <li>• 선택 콘텐츠 일괄 삭제</li>
          <li>• 상태 일괄 변경 (관심 → 완료 등)</li>
          <li>• 소분류 일괄 지정</li>
          <li>• 고정/해제 일괄 처리</li>
        </ul>
      </div>
      <ComingSoonBadge />
    </ActionModal>
  );
}
