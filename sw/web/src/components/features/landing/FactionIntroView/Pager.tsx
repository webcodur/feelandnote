"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./SectionCarousel.module.css";

interface PagerProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

export default function Pager({ page, pages, onChange }: PagerProps) {
  const t = useTranslations("explore.faction.intro");
  if (pages <= 1) return null;

  return (
    <nav className={styles.pager} aria-label={t("carousel.themePages")}>
      <button
        type="button"
        className={styles.pagerButton}
        disabled={page === 0}
        aria-label={t("carousel.previousThemes")}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      <span className={styles.pagerLabel}>
        {String(page + 1).padStart(2, "0")} / {String(pages).padStart(2, "0")}
      </span>
      <button
        type="button"
        className={styles.pagerButton}
        disabled={page === pages - 1}
        aria-label={t("carousel.nextThemes")}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
