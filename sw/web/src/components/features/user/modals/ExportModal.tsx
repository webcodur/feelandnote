/*
  파일명: /components/features/user/modals/ExportModal.tsx
  기능: 콘텐츠 내보내기 모달
  책임: 현재 필터 기준 콘텐츠를 CSV 형식으로 내보내기한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import ActionModal from "./ActionModal";
import { getContentsForExport } from "@/actions/contents/exportContents";
import { convertToCSV, downloadCSV, generateExportFilename } from "@/lib/utils/export";
import type { ContentType, ContentStatus } from "@/types/database";

// #region 타입
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeType?: ContentType;
  progressFilter?: string;
}

type ExportFormat = "csv";
// #endregion

// #region 상수
const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: "csv", label: "CSV", description: "엑셀, 구글 스프레드시트 호환" },
];

const TYPE_LABELS: Record<string, string> = {
  BOOK: "도서",
  VIDEO: "영상",
  GAME: "게임",
  MUSIC: "음악",
  CERTIFICATE: "자격증",
};
// #endregion

export default function ExportModal({
  isOpen,
  onClose,
  activeType,
  progressFilter,
}: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat] = useState<ExportFormat>("csv");

  // #region 핸들러
  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const statusMap: Record<string, ContentStatus | undefined> = {
        all: undefined,
        not_started: "WANT",
        in_progress: "WATCHING",
        completed: "FINISHED",
      };

      const rows = await getContentsForExport({
        type: activeType,
        status: statusMap[progressFilter || "all"],
      });

      if (rows.length === 0) {
        alert("내보낼 콘텐츠가 없습니다.");
        setIsExporting(false);
        return;
      }

      const csv = convertToCSV(rows);
      const filename = generateExportFilename(activeType);
      downloadCSV(csv, filename);

      onClose();
    } catch (error) {
      console.error("내보내기 실패:", error);
      alert("내보내기에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };
  // #endregion

  // #region 내보내기 범위 텍스트
  const getScopeText = () => {
    const parts: string[] = [];

    if (activeType) {
      parts.push(`${TYPE_LABELS[activeType] || activeType} 카테고리`);
    } else {
      parts.push("전체 카테고리");
    }

    if (progressFilter && progressFilter !== "all") {
      const statusLabels: Record<string, string> = {
        not_started: "관심",
        in_progress: "감상 중",
        completed: "완료",
      };
      parts.push(`${statusLabels[progressFilter]} 상태`);
    }

    return parts.join(", ");
  };
  // #endregion

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      icon={Download}
      title="내보내기"
      description="현재 라이브러리의 콘텐츠 목록을 파일로 다운로드합니다. 백업이나 다른 서비스로 이전할 때 활용하세요."
      actions={[
        {
          label: "취소",
          onClick: onClose,
          variant: "secondary",
        },
        {
          label: "내보내기",
          onClick: handleExport,
          variant: "primary",
          loading: isExporting,
        },
      ]}
    >
      {/* 내보내기 정보 */}
      <div className="text-[13px] text-text-tertiary leading-relaxed border-t border-border/50 pt-2">
        [제목, 저자, 타입, 상태, 진행도, 평점, 리뷰, 추가일, 수정일, 완료일]
      </div>
    </ActionModal>
  );
}
