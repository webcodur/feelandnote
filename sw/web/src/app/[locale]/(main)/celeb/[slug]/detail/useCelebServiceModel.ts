/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 모델(서비스 아이템 조립)
 * - 목차 위치: 공통 (전 구획: introduction/reading/timeline/library/affiliateBooks/analysis/connections/media/guestbook)
 * - 데이터: profile/timelineEvents/sideAvailability/dialogueLines/figureBooks/initialContents props
 * - 함께 보기: celebServiceItems.ts
 * ───────────────────────────────────────────── */
"use client";

import { useMemo } from "react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";

import { useTranslations } from "next-intl";

import {
  type CelebServiceAvailability,
  type ServiceItem,
  useCelebServiceItems,
} from "../celebServiceItems";
import { CELEB_SERVICE_ICONS } from "../celebServiceIcons";
import { getCelebSectionOrder } from "../celebSectionChapters";

/**
 * 부가 구획의 목차 가용도는 서버가 확정한다.
 * 초기 본문과 사용자 선택 뒤 조회하는 탭이 같은 목차를 공유한다.
 */
export interface CelebSideAvailability {
  relations: boolean;
  faction: boolean;
  influence: boolean;
  spectrum: boolean;
  /** 이어지는 인물 구획이 그려지는가(관계가 있어야 채운다) */
  relatedFigures: boolean;
  /** 요청 언어에서 판매할 연관 도서 또는 기존 관련 상품이 있는가 */
  affiliateBooks: boolean;
}

interface UseCelebServiceModelProps {
  profile: CelebBySlugProfile;
  timelineEvents: CelebTimelineEvent[];
  sideAvailability: CelebSideAvailability;
  dialogueLines?: Record<string, string[]> | null;
  figureBooks: FigureBookContent[];
  authoredBooks: FigureBookContent[];
  readBooks: AffiliateBook[];
  initialContents: GetUserContentsResponse;
}

export interface CelebServiceModel {
  items: ServiceItem[];
  hasVoice: boolean;
  /** 전 구획 제목 중 가장 긴 것. 3열 너비를 한 값으로 고정한다 */
  widestSectionLabel: string;
}

/**
 * 인물 화면의 목차를 만든다.
 * 머리말의 이동 화살표와 옆 목차, 본문 구획이 모두 이 결과 하나를 보게 해서
 * 자료가 없어 사라진 구획으로 안내하는 일이 없도록 한다.
 */
export function useCelebServiceModel({
  profile,
  timelineEvents,
  sideAvailability,
  dialogueLines,
  figureBooks,
  authoredBooks,
  readBooks,
  initialContents,
}: UseCelebServiceModelProps): CelebServiceModel {
  const celebTier = profile.celeb_tier ?? "full";
  const celebReality = profile.celeb_reality ?? "REAL";
  const hasVoice = profile.has_voice ?? false;
  const hasDialogues = Boolean(
    dialogueLines && Object.keys(dialogueLines).length > 0,
  );

  const availability: CelebServiceAvailability = {
    reading: Boolean(profile.reading),
    relations: sideAvailability.relations,
    timeline: timelineEvents.length > 0,
    faction: sideAvailability.faction,
    dialogues: hasDialogues,
    dialogueVoice: hasDialogues && hasVoice,
    influence: sideAvailability.influence,
    spectrum: sideAvailability.spectrum,
    library: initialContents.items.length > 0,
  };
  /* 참고도서 구획의 네 모드(등장·감상·집필·추천) 가용도 —
     어느 하나라도 채울 자료가 있으면 구획이 선다. */
  const hasWorks = figureBooks.length > 0;
  const hasReadBooks = readBooks.length > 0;
  const hasAuthoredBooks = authoredBooks.length > 0;

  const baseItems = useCelebServiceItems({
    reality: celebReality,
    showLibrary: celebTier === "full",
    availability,
  });

  // 참고도서·관련 인물은 구획 순서표(celebSectionChapters)가 정한 자리로 끼운다 —
  // 참고도서는 리뷰 다음, 관련 인물은 꼬리, 방명록이 맨 끝.
  // 장 번호는 매기지 않는다(히어로는 앞 두 항목만 쓴다).
  const t = useTranslations("celebPage");
  const items = useMemo(() => {
    const positionByKey = new Map(
      getCelebSectionOrder(celebReality).map((key, index) => [key, index]),
    );
    const ordered: ServiceItem[] = [...baseItems];
    if (sideAvailability.relatedFigures) {
      ordered.push({
        key: "relatedFigures",
        chapter: "",
        label: t("relatedLinksTitle"),
        icon: CELEB_SERVICE_ICONS.relatedFigures,
        ready: true,
        target: { sectionId: "related-figures" },
      });
    }
    if (
      sideAvailability.affiliateBooks
      || hasWorks
      || hasReadBooks
      || hasAuthoredBooks
    ) {
      ordered.push({
        key: "affiliateBooks",
        chapter: "",
        label: t("relatedProducts"),
        icon: CELEB_SERVICE_ICONS.affiliateBooks,
        ready: true,
        target: { sectionId: "affiliate-books" },
      });
    }
    return ordered.toSorted(
      (first, second) =>
        (positionByKey.get(first.key) ?? Number.MAX_SAFE_INTEGER) -
        (positionByKey.get(second.key) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [baseItems, sideAvailability.relatedFigures, sideAvailability.affiliateBooks, hasWorks, hasReadBooks, hasAuthoredBooks, t, celebReality]);

  const widestSectionLabel = useMemo(
    () =>
      items.reduce(
        (widest, item) =>
          item.label.length > widest.length ? item.label : widest,
        "",
      ),
    [items],
  );

  return { items, hasVoice, widestSectionLabel };
}
