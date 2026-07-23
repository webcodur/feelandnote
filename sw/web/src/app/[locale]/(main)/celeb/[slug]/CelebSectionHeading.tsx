import type { LucideIcon } from "lucide-react";

import styles from "./CelebSectionHeading.module.css";

interface CelebSectionHeadingProps {
  chapter: string;
  label: string;
  icon: LucideIcon;
}

export default function CelebSectionHeading({
  chapter,
  label,
  icon: Icon,
}: CelebSectionHeadingProps) {
  const isChapterRange = chapter.includes("/");

  return (
    <header className={styles.heading}>
      <span
        className={`${styles.chapter} ${isChapterRange ? styles.chapterRange : ""}`}
        aria-hidden
      >
        {chapter}
      </span>
      <h2 className={styles.title}>
        <span className={styles.seal} aria-hidden>
          <Icon size={16} strokeWidth={1.8} />
        </span>
        <span className={styles.label}>{label}</span>
      </h2>
    </header>
  );
}
