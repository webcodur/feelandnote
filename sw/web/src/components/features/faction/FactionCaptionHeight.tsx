"use client";

import { ArrowDownUp } from "lucide-react";
import { useTranslations } from "next-intl";

export const CAPTION_HEIGHT_OFFSETS = { low: "0%", middle: "10%", high: "20%" };
export type CaptionHeight = keyof typeof CAPTION_HEIGHT_OFFSETS;
const NEXT_HEIGHT: { [Height in CaptionHeight]: CaptionHeight } = { low: "middle", middle: "high", high: "low" };

export default function FactionCaptionHeight({ value, onChange }: {
  value: CaptionHeight;
  onChange: (height: CaptionHeight) => void;
}) {
  const t = useTranslations("explore.hub.myth");
  const label = `${t("captionHeightLabel")}: ${t(`captionHeight.${value}`)}`;
  return (
    <button type="button" data-scene-caption-height={value} aria-label={label}
      title={label} onClick={() => onChange(NEXT_HEIGHT[value])}
      className="flex min-h-9 min-w-9 items-center justify-center text-white outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
      <ArrowDownUp size={20} aria-hidden />
    </button>
  );
}
