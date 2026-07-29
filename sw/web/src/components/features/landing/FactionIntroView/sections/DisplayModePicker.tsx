"use client";

import { useTranslations } from "next-intl";
import { Images, ListTree, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FactionDisplayMode } from "../types";
import styles from "../FactionIntroView.module.css";

interface DisplayModePickerProps {
  mode: FactionDisplayMode;
  onChange: (mode: FactionDisplayMode) => void;
}

const MODE_OPTIONS = [
  { value: "atlas", icon: Map },
  { value: "gallery", icon: Images },
  { value: "registry", icon: ListTree },
] as const;

export default function DisplayModePicker({ mode, onChange }: DisplayModePickerProps) {
  const t = useTranslations("explore.faction.intro");

  return (
    <section className={styles.modeSection} aria-labelledby="faction-view-heading">
      <div>
        <p className="font-cinzel text-sm font-bold tracking-[0.18em] text-accent">
          VIEW
        </p>
        <h2 id="faction-view-heading" className={styles.sectionTitle}>
          {t("viewTitle")}
        </h2>
      </div>
      <div className={styles.modeGrid} role="group" aria-label={t("viewTitle")}>
        {MODE_OPTIONS.map(({ value, icon: Icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(value)}
              className={cn(styles.modeButton, active && styles.modeButtonActive)}
            >
              <Icon size={20} />
              <span>
                <strong className="block text-base text-text-primary">
                  {t(`modes.${value}.label`)}
                </strong>
                <span className={`${styles.modeDescription} mt-1 text-sm font-normal text-text-secondary`}>
                  {t(`modes.${value}.description`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
