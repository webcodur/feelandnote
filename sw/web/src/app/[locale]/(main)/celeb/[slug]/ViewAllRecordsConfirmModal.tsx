"use client";

import { useTranslations } from "next-intl";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface ViewAllRecordsConfirmModalProps {
  isOpen: boolean;
  nickname: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ViewAllRecordsConfirmModal({
  isOpen,
  nickname,
  onClose,
  onConfirm,
}: ViewAllRecordsConfirmModalProps) {
  const t = useTranslations("celebPage.records");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("viewAllConfirmTitle")}
      size="sm"
      closeOnOverlayClick
    >
      <div className="space-y-5 p-5">
        <p className="text-sm leading-6 text-text-secondary">
          {t("viewAllConfirmDescription", { name: nickname })}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            {t("viewAllConfirmCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            {t("viewAllConfirmAction")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
