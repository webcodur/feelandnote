"use client";

import { useRef, useState } from "react";
import { ChevronRight, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import BookPurchaseInfoModal from "./BookPurchaseInfoModal";

export default function BookPurchaseInfo({ className = "" }: { className?: string }) {
  const t = useTranslations("content.purchaseInfo");
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <span className={`block min-w-0 ${className}`} onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("trigger")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={t("trigger")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(true);
        }}
        className="group mx-auto grid min-h-9 w-full max-w-[180px] grid-cols-[0.875rem_minmax(0,1fr)_0.875rem] items-center gap-2 rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-center text-sm text-text-secondary hover:border-accent hover:bg-bg-card hover:text-accent active:bg-bg-stone-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Info size={14} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 font-medium leading-snug">{t("trigger")}</span>
        <ChevronRight size={14} className="shrink-0 text-text-tertiary group-hover:text-accent rtl:rotate-180" aria-hidden="true" />
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
