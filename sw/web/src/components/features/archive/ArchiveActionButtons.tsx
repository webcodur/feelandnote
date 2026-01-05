"use client";

import { useState } from "react";
import { Plus, Download, Share2, Pin, History, CheckSquare } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import ExportModal from "./ExportModal";
import { ShareModal, HistoryModal } from "./ActionModals";
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
  onEnterPinMode?: () => void;
  isPinMode?: boolean;
}

type ModalType = "export" | "share" | "history" | null;
// #endregion

// #region 버튼 스타일
const buttonClass = "w-9 h-9 rounded-lg border bg-surface/50 border-border/40 text-text-tertiary hover:bg-surface-hover hover:border-border hover:text-text-primary";
// #endregion

export default function ArchiveActionButtons({
  activeType,
  selectedCategoryId,
  progressFilter,
  onAddContent,
  onBatchMode,
  isBatchMode = false,
  onEnterPinMode,
  isPinMode = false,
}: ArchiveActionButtonsProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        <IconButton
          icon={Plus}
          size={16}
          onClick={onAddContent}
          title="커스텀 추가"
          className={buttonClass}
        />
        <IconButton
          icon={Download}
          size={16}
          onClick={() => setActiveModal("export")}
          title="내보내기"
          className={buttonClass}
        />
        <IconButton
          icon={Share2}
          size={16}
          onClick={() => setActiveModal("share")}
          title="공유"
          className={buttonClass}
        />
        <IconButton
          icon={Pin}
          size={16}
          onClick={onEnterPinMode}
          title={isPinMode ? "핀 모드 종료" : "핀 모드"}
          className={isPinMode
            ? "w-9 h-9 rounded-lg border bg-accent/10 border-accent/20 text-accent"
            : buttonClass
          }
        />
        <IconButton
          icon={History}
          size={16}
          onClick={() => setActiveModal("history")}
          title="히스토리"
          className={buttonClass}
        />
        <IconButton
          icon={CheckSquare}
          size={16}
          onClick={onBatchMode}
          title={isBatchMode ? "배치 모드 종료" : "배치 모드"}
          className={isBatchMode
            ? "w-9 h-9 rounded-lg border bg-accent/10 border-accent/20 text-accent"
            : buttonClass
          }
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
