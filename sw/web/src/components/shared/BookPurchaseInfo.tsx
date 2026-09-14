"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

const BookPurchaseInfoModal = dynamic(() => import("./BookPurchaseInfoModal"));

export default function BookPurchaseInfo({ className = "" }: { className?: string }) {
  const t = useTranslations("content.purchaseInfo");
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <span className={`inline-flex shrink-0 items-center ${className}`} onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("trigger")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={t("trigger")}
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs text-text-tertiary hover:bg-white/5 hover:text-accent active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Info size={16} aria-hidden="true" />
        <span>{t("trigger")}</span>
      </button>
      {isOpen && (
        <BookPurchaseInfoModal
          onClose={() => {
            setIsOpen(false);
            triggerRef.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </span>
  );
}
