/*
  파일명: /components/features/user/modals/ExportModal.tsx
  기능: 콘텐츠 내보내기 모달
  책임: 현재 필터 기준 콘텐츠를 CSV 형식으로 내보내기한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";
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

export default function ExportModal({
  isOpen,
  onClose,
  activeType,
  progressFilter,
}: ExportModalProps) {
  const t = useTranslations("export");
  const tc = useTranslations("content.category");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat] = useState<ExportFormat>("csv");

  // #region 핸들러
  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const statusMap: Record<string, ContentStatus | undefined> = {
        all: undefined,
        WANT: "WANT",
        FINISHED: "FINISHED",
      };

      const rows = await getContentsForExport({
        type: activeType,
        status: statusMap[progressFilter || "all"],
      });

      if (rows.length === 0) {
        alert(t("noContent"));
        setIsExporting(false);
        return;
      }

      const csv = convertToCSV(rows);
      const filename = generateExportFilename(activeType);
      downloadCSV(csv, filename);

      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      alert(t("failed"));
    } finally {
      setIsExporting(false);
    }
  };
  // #endregion

  // #region 내보내기 범위 텍스트
  const getScopeText = () => {
    const parts: string[] = [];

    const typeKeyMap: Record<string, string> = {
      BOOK: "book", VIDEO: "video", GAME: "game", MUSIC: "music", CERTIFICATE: "certificate",
    };

    if (activeType && typeKeyMap[activeType]) {
      parts.push(`${tc(typeKeyMap[activeType])} ${t("category")}`);
    } else {
      parts.push(t("allCategories"));
    }

    if (progressFilter && progressFilter !== "all") {
      const statusKeyMap: Record<string, string> = {
        WANT: "statusWant",
        FINISHED: "statusFinished",
      };
      const key = statusKeyMap[progressFilter];
      if (key) parts.push(`${t(key)} ${t("status")}`);
    }

    return parts.join(", ");
  };
  // #endregion

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      icon={Download}
      title={t("title")}
      description={t("description")}
      actions={[
        {
          label: t("cancel"),
          onClick: onClose,
          variant: "secondary",
        },
        {
          label: t("export"),
          onClick: handleExport,
          variant: "primary",
          loading: isExporting,
        },
      ]}
    >
      {/* 내보내기 정보 */}
      <div className="text-[13px] text-text-tertiary leading-relaxed border-t border-border/50 pt-2">
        {t("columns")}
      </div>
    </ActionModal>
  );
}
