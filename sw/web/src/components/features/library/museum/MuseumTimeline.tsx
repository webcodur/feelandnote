/*
  파일명: /components/features/library/museum/MuseumTimeline.tsx
  기능: 서고 전시관 타임라인 뷰
  책임: 카테고리/서브 탭 + 간트 차트 + 시대 섹션 + 네비게이터를 조합한다.
*/ // ------------------------------

"use client";

import hubStyles from "@/components/shared/HubSection.module.css";

import { motion } from "framer-motion";
import { getLibraryData, MUSEUM_CATEGORY_IDS, SUB_CATEGORY_VIEW_TYPE } from "@/constants/libraryMuseum";
import TypographyCatalog from "./TypographyCatalog";
import AtlasNav, { type AtlasNavItem } from "@/components/shared/atlasNav/AtlasNav";
import { useSectionNavigation } from "@/lib/scroll/useSectionNavigation";
import MuseumEraSection from "./MuseumEraSection";
import type { TargetProductMatch } from "@/components/features/commerce/targetProducts";
import { useState, useMemo } from "react";
import EraGanttChart from "./EraGanttChart";
import { useLocale, useTranslations } from "next-intl";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";

// #region 카테고리 탭
function CategoryTabs({ activeId, onChange }: { activeId: string; onChange: (id: string) => void }) {
  const t = useTranslations("library.museum.category");
  return (
    <CategoryTabFilter media wrap value={activeId} onChange={onChange}
      options={MUSEUM_CATEGORY_IDS.map(cat => ({ value: cat.id, label: t(`${cat.id}.label`) }))} />
  );
}
// #endregion

// #region 서브 카테고리 탭
function SubCategoryTabs({ categoryId, subIds, activeId, onChange }: { categoryId: string; subIds: readonly { id: string }[]; activeId: string; onChange: (id: string) => void }) {
  const t = useTranslations(`library.museum.sub.${categoryId}`);
  return (
    <CategoryTabFilter wrap subtle size="sm" className="mt-3 sm:mt-4" value={activeId} onChange={onChange}
      options={subIds.map(sub => ({ value: sub.id, label: t(`${sub.id}.label`) }))} />
  );
}
// #endregion

// #region 메인 컴포넌트
interface MuseumTimelineProps {
  targetProducts?: TargetProductMatch[];
  eras?: import("@/constants/libraryMuseum").HistoryEra[];
  categoryId?: string;
  subCategoryId?: string;
}

export default function MuseumTimeline({
  targetProducts = [],
  eras: erasProp,
  categoryId: categoryIdProp = "book",
  subCategoryId: subCategoryIdProp,
}: MuseumTimelineProps) {
  const locale = useLocale();
  const t = useTranslations("library.museum");
  const data = useMemo(() => getLibraryData(locale), [locale]);

  const [activeCategoryId, setActiveCategoryId] = useState(categoryIdProp);
  const activeCategory = MUSEUM_CATEGORY_IDS.find((c) => c.id === activeCategoryId);
  const subIds = activeCategory?.subCategories;
  const [activeSubId, setActiveSubId] = useState(
    subCategoryIdProp && subIds?.some((s) => s.id === subCategoryIdProp)
      ? subCategoryIdProp
      : subIds?.[0]?.id ?? ""
  );

  const validSubId = subIds?.some((s) => s.id === activeSubId)
    ? activeSubId
    : subIds?.[0]?.id ?? "";

  // 갈래를 바꾸면 곁가지 선택을 그 갈래의 첫 항목으로 되돌린다.
  // 이펙트가 아니라 렌더 도중에 맞춘다(리액트 권장 패턴) — 이펙트로 하면 옛 곁가지가
  // 한 번 그려진 뒤에야 바뀌어 화면이 깜빡이고, 그리는 횟수도 늘어난다.
  const [lastCategoryId, setLastCategoryId] = useState(activeCategoryId);
  if (activeCategoryId !== lastCategoryId) {
    setLastCategoryId(activeCategoryId);
    setActiveSubId(subIds?.[0]?.id ?? "");
  }

  const timelineKey = subIds ? `${activeCategoryId}/${validSubId}` : activeCategoryId;
  const viewType = SUB_CATEGORY_VIEW_TYPE[timelineKey] ?? 'timeline';
  const eras = erasProp ?? data.timelines[timelineKey] ?? data.defaultTimeline;

  /* 시대 목차 — 공용 아틀라스 내비(넓은 화면 옆 레일·좁은 화면 하단 띠+시트).
     현재 시대 추적·부드러운 이동·해시 새김도 같은 공용 엔진이 쥔다 */
  const eraSectionIds = useMemo(() => eras.map((era) => `era-${era.id}`), [eras]);
  const { activeSectionId, navigate } = useSectionNavigation(eraSectionIds);
  const atlasItems: AtlasNavItem[] = eras.map((era, index) => ({
    key: era.id,
    chapter: String(index + 1).padStart(2, "0"),
    label: era.name,
    sectionId: `era-${era.id}`,
  }));

  const description = subIds
    ? t(`sub.${activeCategoryId}.${validSubId}.description`)
    : t(`category.${activeCategoryId}.description`);

  return (
    <div className={`w-full max-w-5xl mx-auto ${hubStyles.page} ${hubStyles.intro}`}>
      {viewType === 'timeline' && (
        <AtlasNav items={atlasItems} activeId={activeSectionId} onNavigate={navigate} />
      )}

      <div className={`text-center px-4 ${hubStyles.header}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8 line-clamp-2">
            {description ?? t("defaultDescription")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <CategoryTabs activeId={activeCategoryId} onChange={setActiveCategoryId} />
          {subIds && subIds.length > 1 && (
            <SubCategoryTabs categoryId={activeCategoryId} subIds={subIds} activeId={validSubId} onChange={setActiveSubId} />
          )}
        </motion.div>
      </div>

      {viewType === 'timeline' && (
        <>
          <div className="px-4 sm:px-0">
            <EraGanttChart key={timelineKey} eras={eras} />
          </div>
          <div>
            {eras.map((era, index) => (
              <MuseumEraSection key={era.id} era={era} index={index} eras={eras} keyContentsLabel={t("keyContents")}
                targetProducts={targetProducts.filter((match) => match.timelineKey === timelineKey && match.eraId === era.id)} />
            ))}
          </div>
        </>
      )}
      {viewType === 'catalog' && <TypographyCatalog data={data.typographyClasses} />}
    </div>
  );
}
// #endregion
