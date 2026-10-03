"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Modal, ScoreBar } from "@/components/ui";

interface Props {
  label: string;
  value: number;
  max?: number;
  empty: string;
  reason?: string | null;
  isTranslationFallback?: boolean;
  onClose: () => void;
  children?: ReactNode;
}

export default function StatReasonModal({ label, value, max = 100, empty, reason, isTranslationFallback, onClose, children }: Props) {
  const t = useTranslations("profilePage.influence");

  return (
    <Modal isOpen onClose={onClose} title={label} size="xl" stickyHeader animateHeight={false}>
      <div className="space-y-3 p-5">
        {children ?? <ScoreBar label={label} value={value} max={max} maxText={t("scoreOutOf", { max })} />}
        {isTranslationFallback && <p className="text-sm text-text-tertiary">{t("originalKorean")}</p>}
        <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary break-keep">
          {reason?.trim() || empty}
        </p>
      </div>
    </Modal>
  );
}
