"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ServiceItem, ServiceTarget } from "./celebServiceItems";
import styles from "./CelebSectionHeading.module.css";

interface CelebSectionHeadingProps {
  item: ServiceItem;
  previousItem?: ServiceItem;
  nextItem?: ServiceItem;
  onNavigate: (target: ServiceTarget) => void;
}

export default function CelebSectionHeading({
  item,
  previousItem,
  nextItem,
  onNavigate,
}: CelebSectionHeadingProps) {
  const t = useTranslations("celebPage");

  return (
    <header className={styles.heading}>
      <button
        type="button"
        onClick={() => previousItem && onNavigate(previousItem.target)}
        disabled={!previousItem}
        aria-label={
          previousItem
            ? t("previousSection", { name: previousItem.label })
            : t("noPreviousSection")
        }
        className={styles.navButton}
      >
        <ChevronLeft size={22} strokeWidth={1.7} aria-hidden />
      </button>

      <div className={styles.identity}>
        <h2 className={styles.title}>
          <span className={styles.label}>{item.label}</span>
        </h2>
      </div>

      <button
        type="button"
        onClick={() => nextItem && onNavigate(nextItem.target)}
        disabled={!nextItem}
        aria-label={
          nextItem
            ? t("nextSection", { name: nextItem.label })
            : t("noNextSection")
        }
        className={styles.navButton}
      >
        <ChevronRight size={22} strokeWidth={1.7} aria-hidden />
      </button>
    </header>
  );
}
