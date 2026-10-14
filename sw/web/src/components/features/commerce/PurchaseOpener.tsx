"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { BOOK_PURCHASE_LABEL_STYLE, BOOK_PURCHASE_OPENER_STYLE } from "@/constants/affiliatePlatforms";
import { cn } from "@/lib/utils";
import { ACCESS_OPENER_SPECTRUM } from "./contentAccessStyles";

// 모든 구매·감상 진입점의 이름·누르는 크기·즉각 반응을 한곳에서 맞춘다.
// 포스터 아래에서는 포스터 열의 폭을 그대로 채운다. 글자 길이·고정 최대 폭으로 줄이지 않는다.
// 판매처는 구매 창 안에서 보여 준다.
export default function PurchaseOpener({ type, onOpen, expanded, className, primary = false }: {
  type: string;
  onOpen: () => void;
  expanded?: boolean;
  className?: string;
  primary?: boolean;
}) {
  const t = useTranslations("content.access");
  const spectrum = ACCESS_OPENER_SPECTRUM[type as keyof typeof ACCESS_OPENER_SPECTRUM];
  return <button type="button" aria-haspopup="dialog" aria-expanded={expanded}
    style={spectrum && !primary ? { "--purchase-spectrum": spectrum } as CSSProperties : undefined}
    onClick={event => { event.preventDefault(); event.stopPropagation(); onOpen(); }}
    className={cn(
      "group/purchase flex h-11 cursor-pointer items-center justify-center overflow-hidden rounded-control border text-center font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-accent",
      primary ? "w-fit max-w-full px-3 text-sm" : "w-full max-w-full px-1.5 text-xs @min-[128px]/purchase:px-3 @min-[128px]/purchase:text-sm",
      primary ? "border-accent bg-accent text-bg-main hover:border-accent-hover hover:bg-accent-hover"
        : BOOK_PURCHASE_OPENER_STYLE,
      className,
    )}>
    <span className={cn("min-w-0", !primary && BOOK_PURCHASE_LABEL_STYLE)}>{t("open")}</span>
  </button>;
}
