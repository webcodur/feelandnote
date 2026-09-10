"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";

export default function CoupangPurchaseInfoModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("content.coupangPurchaseInfo");
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
    <Modal isOpen onClose={onClose} title={t("title")} size="sm">
      <div ref={contentRef} tabIndex={-1} className="p-6 outline-none">
        <p className="text-base leading-relaxed text-text-primary break-keep">{t("decision")}</p>
      </div>
    </Modal>
  );
}
