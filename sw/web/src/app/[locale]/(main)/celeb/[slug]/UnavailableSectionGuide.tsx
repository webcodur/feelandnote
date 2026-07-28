"use client";

import { useTranslations } from "next-intl";

import type { ServiceItem } from "./celebServiceItems";
import styles from "./UnavailableSectionGuide.module.css";

interface Props {
  item: ServiceItem;
}

/** 아직 채우지 못한 구획에 놓는 안내. 위쪽 제목·탭이 이미 이름을 말하므로 설명만 담는다. */
export default function UnavailableSectionGuide({ item }: Props) {
  const t = useTranslations("celebPage");
  const guide = item.unavailableGuide;

  if (!guide) return null;

  return (
    <div className={styles.shell}>
      <p className={styles.about}>{guide.about}</p>
      <p className={styles.notice}>
        {t("atlasGuideNoData", { section: item.label })}
      </p>
    </div>
  );
}
