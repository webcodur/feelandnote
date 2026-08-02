"use client";

import { useTranslations } from "next-intl";
import { ListTree, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FactionDisplayMode } from "../types";
import styles from "../FactionIntroView.module.css";

interface DisplayModePickerProps {
  mode: FactionDisplayMode;
  onChange: (mode: FactionDisplayMode) => void;
}

const MODE_OPTIONS = [
  { value: "atlas", icon: Map },
  { value: "registry", icon: ListTree },
] as const;

/* 보기 전환 — 제목·설명 없이 작은 알약 두 개로만 */
export default function DisplayModePicker({ mode, onChange }: DisplayModePickerProps) {
  const t = useTranslations("explore.faction.intro");

  return (
    <div className={styles.modeBar} role="group" aria-label={t("viewTitle")}>
      {MODE_OPTIONS.map(({ value, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={cn(styles.modeChip, active && styles.modeChipActive)}
          >
            <Icon size={15} />
            {t(`modes.${value}.label`)}
          </button>
        );
      })}
    </div>
  );
}
