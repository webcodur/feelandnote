"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import { Z_INDEX } from "@/constants/zIndex";

/** 분류와 검색을 위에 고정하고, 화면별 작품 목록을 아래에 넣는다. */
const MAX_HEIGHT_CLASS = "max-h-[min(84dvh,42rem)]";

export default function LibraryIndexModal({ title, controls, count, description, children, onClose, animateHeight = true }: {
  title: string; controls?: ReactNode; count?: number; description?: string; children: ReactNode; onClose: () => void; animateHeight?: boolean;
}) {
  const t = useTranslations("shared.accessibility");
  const content = <>
      <header className="flex min-h-11 shrink-0 items-center gap-2 border-b border-white/10 ps-3 pe-1">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{title}</h2>
        {count !== undefined && <span className="text-xs tabular-nums text-text-tertiary" aria-live="polite">{count}</span>}
        <button type="button" onClick={onClose} aria-label={t("close")}
          className="flex size-11 shrink-0 items-center justify-center rounded text-text-secondary outline-none hover:bg-white/10 hover:text-text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
          <X size={18} aria-hidden />
        </button>
      </header>
      {description && <p className="sr-only">{description}</p>}
      {controls && <div className="shrink-0 border-b border-white/10 px-2 py-2">{controls}</div>}
      {children}
  </>;
  return (
    <Modal isOpen onClose={onClose} ariaLabel={title} size="lg" frame="plain" showCloseButton={false}
      maxHeightClassName={MAX_HEIGHT_CLASS}
      boxClassName="overflow-hidden rounded-xl border border-white/15 bg-bg-card shadow-2xl [&>div]:flex [&>div]:flex-col [&>div]:overflow-hidden"
      animateHeight={false} escapeCapture zIndex={Z_INDEX.modal + 1}>
      {animateHeight ? <AnimatedHeight independent duration={240} className="min-h-0 shrink-0"
        innerClassName={`flex! flex-col overflow-hidden [overflow-anchor:none] ${MAX_HEIGHT_CLASS}`}>{content}</AnimatedHeight> : content}
    </Modal>
  );
}
