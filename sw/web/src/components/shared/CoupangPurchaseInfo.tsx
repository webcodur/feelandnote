"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

const CoupangPurchaseInfoModal = dynamic(() => import("./CoupangPurchaseInfoModal"));

export default function CoupangPurchaseInfo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const t = useTranslations("content.coupangPurchaseInfo");
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
        style={compact ? { minWidth: "2rem", minHeight: "2rem" } : undefined}
        onClick={() => setIsOpen(true)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-inherit hover:bg-white/15 active:bg-white/25 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
      >
        <Info size={16} aria-hidden="true" />
      </button>
      {isOpen && (
        <CoupangPurchaseInfoModal
          onClose={() => {
            setIsOpen(false);
            triggerRef.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </span>
  );
}
