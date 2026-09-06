"use client";

import { useTranslations } from "next-intl";
import { TENDENCY_KEYS } from "@/lib/spectrum/constants";

interface Props {
  activeIndex?: number;
  onChange?: (index: number) => void;
}

export default function SpectrumTabs({ activeIndex = 0, onChange }: Props) {
  const t = useTranslations("explore.ui.spectrumDistribution");

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
      {TENDENCY_KEYS.map((key, index) => (
        <button
          key={key}
          type="button"
          disabled={!onChange}
          aria-pressed={index === activeIndex}
          onClick={() => onChange?.(index)}
          className={"rounded-full border px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm " + (
            index === activeIndex
              ? "border-accent/40 bg-accent/15 text-accent"
              : "border-border/40 bg-bg-card/40 text-text-secondary hover:border-border hover:bg-bg-card hover:text-text-primary"
          )}
        >
          {t(`axes.${key}.negative`)} ↔ {t(`axes.${key}.positive`)}
        </button>
      ))}
    </div>
  );
}
