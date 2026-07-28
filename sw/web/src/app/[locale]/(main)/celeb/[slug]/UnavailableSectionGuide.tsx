"use client";

import { useTranslations } from "next-intl";

import type { ServiceItem } from "./celebServiceItems";
import styles from "./UnavailableSectionGuide.module.css";

interface Props {
  item: ServiceItem;
}

export default function UnavailableSectionGuide({ item }: Props) {
  const t = useTranslations("celebPage");
  const guide = item.unavailableGuide;
  const Icon = item.icon;

  if (!guide) return null;

  return (
    <div className={styles.shell}>
      <span className={styles.cornerTop} aria-hidden />
      <span className={styles.cornerBottom} aria-hidden />

      <header className={styles.header}>
        <span className={styles.icon} aria-hidden>
          <Icon size={25} strokeWidth={1.65} />
        </span>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>
            {item.chapter} · {t("atlasGuideConcept")}
          </p>
          <h3>{item.label}</h3>
          <p className={styles.about}>{guide.about}</p>
        </div>
      </header>

      <p className={styles.noData}>
        {t("atlasGuideNoData", { section: item.label })}
      </p>
    </div>
  );
}
