"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { BOOK_PURCHASE_LABEL_STYLE, BOOK_PURCHASE_OPENER_STYLE } from "@/constants/affiliatePlatforms";
import { cn } from "@/lib/utils";
import { ACCESS_OPENER_SPECTRUM } from "./contentAccessStyles";

// 모든 구매·감상 진입점의 이름·누르는 크기·즉각 반응을 한곳에서 맞춘다.
export default function PurchaseOpener({ type, onOpen, expanded, full = true, stores = [], className, primary = false }: {
  type: string;
  onOpen: () => void;
  expanded?: boolean;
  full?: boolean;
  stores?: string[];
  className?: string;
  primary?: boolean;
}) {
  const t = useTranslations("content.access");
  const spectrum = ACCESS_OPENER_SPECTRUM[type as keyof typeof ACCESS_OPENER_SPECTRUM];
  return <button type="button" aria-haspopup="dialog" aria-expanded={expanded}
    style={spectrum && !primary ? { "--purchase-spectrum": spectrum } as CSSProperties : undefined}
    onClick={event => { event.preventDefault(); event.stopPropagation(); onOpen(); }}
    className={cn(
      "group/purchase flex min-h-11 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-control border px-3 py-2.5 text-center text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent",
      full ? "w-full" : "mx-auto w-fit max-w-full",
      primary ? "border-accent bg-accent text-bg-main hover:border-accent-hover hover:bg-accent-hover"
        : `h-11 whitespace-nowrap px-1.5 text-[11px] [--purchase-label-scale:1.04] @min-[128px]/purchase:text-xs @min-[160px]/purchase:gap-3 @min-[160px]/purchase:px-3 @min-[160px]/purchase:text-sm @min-[160px]/purchase:[--purchase-label-scale:1.07] ${BOOK_PURCHASE_OPENER_STYLE}`,
      className,
    )}>
    <span className={cn("min-w-0", !primary && BOOK_PURCHASE_LABEL_STYLE)}>{t("open")}</span>
    {stores.length > 0 && <span className={cn("items-center gap-2 border-s ps-3 text-xs font-normal",
      primary ? "flex border-bg-main/25 text-bg-main" : "hidden border-purchase-ink/30 text-purchase-ink @min-[360px]/purchase:flex")}>
      {stores.map(store => <span key={store} className="whitespace-nowrap">{store}</span>)}
    </span>}
  </button>;
}
