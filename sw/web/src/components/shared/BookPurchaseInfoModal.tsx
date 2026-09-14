"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";

export default function BookPurchaseInfoModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("content.purchaseInfo");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = contentRef.current?.closest('[role="dialog"]');
    contentRef.current?.focus({ preventScroll: true });
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      event.preventDefault();
      dialog.querySelector<HTMLButtonElement>("button")?.focus();
    };
    document.addEventListener("keydown", keepFocusInDialog);
    return () => document.removeEventListener("keydown", keepFocusInDialog);
  }, []);

  return (
    <Modal isOpen onClose={onClose} title={t("title")} size="sm" animateHeight={false}>
      <div ref={contentRef} tabIndex={-1} className="space-y-3 break-keep p-6 text-sm leading-relaxed outline-none">
        <p className="text-text-primary">{t("benefit")}</p>
        <p className="text-text-secondary">{t("notice")}</p>
      </div>
    </Modal>
  );
}
