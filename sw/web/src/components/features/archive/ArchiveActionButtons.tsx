/*
  파일명: /components/features/archive/ArchiveActionButtons.tsx
  기능: 기록관 액션 버튼 그룹
  책임: 추가, 내보내기, 공유, 히스토리 등 액션 버튼과 모달을 관리한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Plus, Download, Share2, Pin, History, CheckSquare } from "lucide-react";
import ControlIconButton from "./contentLibrary/controlBar/components/ControlIconButton";
import ExportModal from "./modals/ExportModal";
import { ShareModal, HistoryModal } from "./modals/ActionModals";
import type { ContentType } from "@/types/database";

// #region 타입
interface ArchiveActionButtonsProps {
  activeType?: ContentType;
  selectedCategoryId?: string | null;
  progressFilter?: string;
  onAddContent: () => void;
  onBatchMode?: () => void;
  isBatchMode?: boolean;
  // 핀 모드
  togglePinMode?: () => void;
  isPinMode?: boolean;
}

type ModalType = "export" | "share" | "history" | null;
// #endregion

export default function ArchiveActionButtons({
  activeType,
  selectedCategoryId,
  progressFilter,
  onAddContent,
  onBatchMode,
  isBatchMode = false,
  togglePinMode,
  isPinMode = false,
}: ArchiveActionButtonsProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        <ControlIconButton
          icon={Plus}
          onClick={onAddContent}
          title="커스텀 추가"
        />
        <ControlIconButton
          icon={Download}
          onClick={() => setActiveModal("export")}
          title="내보내기"
        />
        <ControlIconButton
          icon={Share2}
          onClick={() => setActiveModal("share")}
          title="공유"
        />
        <ControlIconButton
          icon={Pin}
          onClick={togglePinMode ?? (() => {})}
          active={isPinMode}
          title={isPinMode ? "핀 모드 종료" : "핀 모드"}
        />
        <ControlIconButton
          icon={History}
          onClick={() => setActiveModal("history")}
          title="히스토리"
        />
        <ControlIconButton
          icon={CheckSquare}
          onClick={onBatchMode ?? (() => {})}
          active={isBatchMode}
          title={isBatchMode ? "배치 모드 종료" : "배치 모드"}
        />
      </div>

      {/* 모달들 */}
      <ExportModal
        isOpen={activeModal === "export"}
        onClose={closeModal}
        activeType={activeType}
        selectedCategoryId={selectedCategoryId}
        progressFilter={progressFilter}
      />
      <ShareModal isOpen={activeModal === "share"} onClose={closeModal} />
      <HistoryModal isOpen={activeModal === "history"} onClose={closeModal} />
    </>
  );
}
