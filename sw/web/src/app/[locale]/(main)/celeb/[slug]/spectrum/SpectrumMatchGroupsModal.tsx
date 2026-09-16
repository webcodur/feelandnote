/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 모바일 비교 묶음 겹창(캐러셀)
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: categories·subjectName·matchesByCategory·suspended·onClose·onOpenMatch
 * - 함께 보기: SpectrumMatchGroup.tsx, SpectrumSectionMain.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { Carousel } from "@/components/ui";
import Modal from "@/components/ui/Modal";
import type {
  SpectrumMatch,
  SpectrumMatchCategory,
  SpectrumMatchGroups,
} from "@/lib/spectrum/utils";
import {
  MATCH_CATEGORY_TITLE_KEYS,
  SpectrumMatchGroup,
} from "./SpectrumMatchGroup";

/* ── 1. 모바일 비교 묶음 겹창 ── */

export function SpectrumMatchGroupsModal({
  categories,
  subjectName,
  matchesByCategory,
  suspended,
  onClose,
  onOpenMatch,
}: {
  categories: SpectrumMatchCategory[];
  subjectName: string;
  matchesByCategory: SpectrumMatchGroups;
  /** 비교 상세 모달이 위에 떠 있는 동안에는 닫기 조작을 받지 않는다 */
  suspended: boolean;
  onClose: () => void;
  onOpenMatch: (category: SpectrumMatchCategory, match: SpectrumMatch) => void;
}) {
  const t = useTranslations("celebPage");
  const titleId = useId();

  const title =
    categories.length > 1
      ? t("spectrumMatches")
      : t(MATCH_CATEGORY_TITLE_KEYS[categories[0]]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      frame="plain"
      widthClassName="max-w-[540px]"
      overlayClassName="bg-black/75 backdrop-blur-sm"
      boxClassName="rounded-lg border border-white/10 bg-bg-main shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      showCloseButton={false}
      closeOnOverlayClick={!suspended}
      closeOnEscape={!suspended}
      animateHeight={false}
    >
      <div className="flex max-h-[calc(100dvh-4rem)] flex-col">
        <header className="relative shrink-0 border-b border-white/[0.07] px-12 py-3.5 text-center">
          <h2 id={titleId} className="font-serif text-lg font-bold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("spectrumMatchModalClose")}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-white/10 text-text-secondary hover:border-white/25 hover:bg-white/[0.06] hover:text-text-primary"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 [overflow-anchor:none] custom-scrollbar md:p-3">
          <Carousel
            labels={{
              previous: t("carouselComparePrev"),
              next: t("carouselCompareNext"),
              dot: (index, count) => t("carouselDot", { index, count }),
            }}
            tabLabels={
              categories.length > 1
                ? categories.map((category) =>
                    t(MATCH_CATEGORY_TITLE_KEYS[category]),
                  )
                : undefined
            }
          >
            {categories.map((category) => (
              <SpectrumMatchGroup
                key={category}
                category={category}
                subjectName={subjectName}
                matches={matchesByCategory[category]}
                onOpen={(match) => onOpenMatch(category, match)}
                bare
              />
            ))}
          </Carousel>
        </div>
      </div>
    </Modal>
  );
}
