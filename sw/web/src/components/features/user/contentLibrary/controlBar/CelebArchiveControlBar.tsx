"use client";

import { useTranslations } from "next-intl";

import LibraryCategoryPicker from "@/components/shared/LibraryCategoryPicker";
import { LIBRARY_CONTROL_LAYOUT as layout } from "@/components/shared/libraryControlLayout";
import { CATEGORIES, getCategoryById } from "@/constants/categories";

import type { ArchiveControlBarProps } from "./types";

/** 인물 서가 조작대. 보기는 펼침으로 고정이라 목록·펼침 전환 단추가 없다 */
export default function CelebArchiveControlBar({
  categoryItems = [],
  ...props
}: ArchiveControlBarProps) {
  const t = useTranslations("archiveSearch");
  const tCategory = useTranslations("content.category");
  const options = CATEGORIES.map((category) => {
    const count = props.typeCounts?.[category.dbType]
      ?? categoryItems.filter((item) => item.type === category.dbType).length;
    return { key: category.id, label: tCategory(category.id), count, disabled: count === 0 };
  });

  return (
    <div className={`mx-auto flex flex-col items-center gap-2 ${layout.width}`}>
      <LibraryCategoryPicker
        options={options}
        value={props.activeTab}
        ariaLabel={t("filter.category")}
        onChange={(key) => {
          const category = getCategoryById(key as ArchiveControlBarProps["activeTab"]);
          if (!category) return;
          props.onTabChange(category.id);
        }}
      />
      {props.trailing}
    </div>
  );
}
