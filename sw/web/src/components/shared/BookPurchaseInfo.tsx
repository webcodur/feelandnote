"use client";

import { useRef, useState } from "react";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import BookPurchaseInfoModal from "./BookPurchaseInfoModal";

/* 수수료 안내는 판매 단추 우단에 묻히는 작은 아이콘 하나다. 자리·칸 모양은 호출부가 className으로 잡는다 */
export default function BookPurchaseInfo({ className = "" }: { className?: string }) {
  const t = useTranslations("content.purchaseInfo");
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <span className={className} onClick={(event) => event.stopPropagation()}>
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
        className="flex h-full w-full items-center justify-center text-text-tertiary/80 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <Info size={14} aria-hidden="true" />
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
