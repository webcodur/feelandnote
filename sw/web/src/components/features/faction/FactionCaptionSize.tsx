"use client";

import { useTranslations } from "next-intl";

export const CAPTION_SIZE_CLASSES = {
  small: "text-base md:text-lg",
  medium: "text-xl md:text-2xl",
  large: "text-2xl md:text-3xl",
};
export type CaptionSize = keyof typeof CAPTION_SIZE_CLASSES;
const NEXT_SIZE: { [Size in CaptionSize]: CaptionSize } = { small: "medium", medium: "large", large: "small" };

export default function FactionCaptionSize({ value, onChange }: {
  value: CaptionSize;
  onChange: (size: CaptionSize) => void;
}) {
  const t = useTranslations("explore.hub.myth");
  const label = `${t("captionFontSize")}: ${t(`captionSize.${value}`)}`;
  return (
    <button type="button" data-scene-caption-size={value} aria-label={label}
      title={label} onClick={() => onChange(NEXT_SIZE[value])}
      className={`flex min-h-9 min-w-9 items-center justify-center px-1 font-medium leading-none text-white outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent ${CAPTION_SIZE_CLASSES[value]}`}>
      <span aria-hidden>{t("captionSizeSample")}</span>
    </button>
  );
}
