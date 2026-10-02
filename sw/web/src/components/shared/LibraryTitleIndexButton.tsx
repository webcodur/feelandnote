"use client";

import { Menu } from "lucide-react";
import styles from "./LibraryDetailNavigation.module.css";

export interface LibraryTitleIndexControl {
  label: string;
  isOpen: boolean;
  indexId: string;
  onToggle: () => void;
  /** 칩을 누를 때마다 증가시켜 목록을 여는 위치를 잠깐 강조한다. */
  pulseRequest?: number;
}

export default function LibraryTitleIndexButton({
  title,
  control,
  testPrefix = "expand",
}: {
  title: string;
  control: LibraryTitleIndexControl;
  testPrefix?: string;
}) {
  return (
    <button
      type="button"
      onClick={control.onToggle}
      aria-label={`${title} · ${control.label}`}
      aria-haspopup="dialog"
      aria-expanded={control.isOpen}
      aria-controls={control.isOpen ? control.indexId : undefined}
      title={control.label}
      data-testid={`${testPrefix}-title-index-toggle`}
      className={`${styles.titleIndexButton} group absolute inset-0 min-h-11 w-full hover:bg-accent/[0.08] active:bg-accent/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70`}
    >
      {Boolean(control.pulseRequest) && <span key={control.pulseRequest} aria-hidden
        data-library-title-cue={control.pulseRequest} className={styles.titleIndexCue} />}
      <Menu
        size={16}
        strokeWidth={1.6}
        aria-hidden
        className="absolute end-2 top-1/2 -translate-y-1/2 text-text-tertiary opacity-40 group-hover:text-accent group-hover:opacity-100 group-focus-visible:text-accent group-focus-visible:opacity-100"
      />
    </button>
  );
}
