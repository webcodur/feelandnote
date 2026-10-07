"use client";

import { ImageOff, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface ContentCoverFallbackProps {
  title: string;
  ContentIcon?: LucideIcon;
  iconSize?: number;
  label?: string;
}

/** 실제 표지의 부재를 알린다. 제목·저자·장정처럼 보이는 임의의 표지를 만들지 않는다. */
export default function ContentCoverFallback({ ContentIcon = ImageOff, iconSize = 28, label }: ContentCoverFallbackProps) {
  const t = useTranslations("content");
  return <div data-cover-unavailable className="flex h-full w-full flex-col items-center justify-center gap-2 bg-bg-secondary px-3 py-4 text-text-tertiary">
    <ContentIcon size={iconSize} strokeWidth={1.5} aria-hidden="true" />
    <span className="text-center text-xs leading-snug">{label ?? t("coverUnavailable")}</span>
  </div>;
}
