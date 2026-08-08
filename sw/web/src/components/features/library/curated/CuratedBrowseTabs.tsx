/*
  파일명: /components/features/library/curated/CuratedBrowseTabs.tsx
  기능: 기관 선정 둘러보기 조작대 — 카테고리(매체) 선택과 「기관별/주제별」 전환을 묶은 UI
  책임: 허브(모든 기관)·기관 상세(그 기관)·목록 상세(이동용 링크)가 이 하나를 쓴다.
        - browse 모드(onSelect*): 선택값을 부모가 쥐고, 화면 안에서 목록을 갈아끼운다
        - link 모드(linkHref): 고른 항목이 기관 선정 허브 조합으로 이동한다
        시각은 서비스 공용 필터 부품(CategoryTabFilter)을 그대로 쓴다 — 새로 그리지 않는다.
  상태는 훅(useCuratedBrowse)이 쥐고, 이 파일은 그린다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { CategoryTabFilter, type CategoryTabOption } from "@/components/ui/CategoryTabFilter";
import type { CuratedBrowse } from "./useCuratedBrowse";

export interface CuratedBrowseTabsLinkQuery {
  media?: string;
  kind?: string;
  topic?: string;
}

export interface CuratedBrowseTabsProps {
  browse: CuratedBrowse;
  /** 이 값이 있으면 link 모드다 — 항목이 주어진 주소로 이동한다 */
  linkHref?: (query: CuratedBrowseTabsLinkQuery) => string;
  onSelectMedia?: (media: string | null) => void;
  onSelectKind?: (kind: string) => void;
  onSelectTopic?: (topic: string) => void;
  onView?: (viewTopic: boolean) => void;
  /** 매체 탭 표시 여부를 강제할 때(단일 매체 화면 등) */
  showMedia?: boolean;
  /** pill 정렬 — 허브처럼 제목이 중앙일 때 맞춘다. 기본은 왼쪽 */
  align?: "center" | "left";
  /** pill 크기 — 허브처럼 넉넉한 구획은 기본 크기, 좁은 하단 줄은 작은 크기 */
  size?: "md" | "sm";
}

const mediaLabel = (t: ReturnType<typeof useTranslations>, value: string): string =>
  t.has(`mediaLabel.${value}`) ? t(`mediaLabel.${value}`) : value;
const kindLabel = (t: ReturnType<typeof useTranslations>, value: string): string =>
  t(`kind.${value}`);
const topicLabel = (t: ReturnType<typeof useTranslations>, value: string): string =>
  t.has(`topicLabel.${value}`) ? t(`topicLabel.${value}`) : value;

export default function CuratedBrowseTabs({
  browse,
  linkHref,
  onSelectMedia,
  onSelectKind,
  onSelectTopic,
  onView,
  showMedia,
  align = "left",
  size = "sm",
}: CuratedBrowseTabsProps) {
  const t = useTranslations("library.curated");
  const { summary, activeMedia, activeTopic, activeKind, viewTopic } = browse;

  const linkFor = (query: CuratedBrowseTabsLinkQuery) => (linkHref ? linkHref(query) : undefined);

  // 보여줄 매체 — 값이 없는 매체 탭은 세지 않는다(항목이 없는데 pill만 차지하면 어색하다)
  const medias = summary.medias.filter((m) => (summary.mediaCounts.get(m) ?? 0) > 0);
  const mediaOptions: CategoryTabOption[] = medias.map((m) => ({
    value: m,
    label: mediaLabel(t, m),
    count: summary.mediaCounts.get(m) ?? 0,
  }));
  const showMediaRow = showMedia ?? medias.length > 1;

  // 「기관별/주제별」 토글 — 고른 매체 안에 주제가 있을 때만 의미가 있다.
  // link 모드에서도 토글 자체는 살아 있어 탭 줄을 바꾼다(허브 조합으로 이동하는 길목을 제공).
  const showViewToggle = browse.topics.length > 0;

  // 고른 갈래에 따라 탭 줄이 바뀐다 — 주제를 안 골랐으면 기관(성격) 탭을 본다.
  // 책↔영상으로 갈아타면 이 집계도 매체 안에서 다시 센 값으로 따라 갈린다.
  const showTopicView = browse.useTopics;
  const tabOptions: CategoryTabOption[] = showTopicView
    ? browse.topics.map((tp) => ({
        value: tp,
        label: topicLabel(t, tp),
        count: browse.topicCounts.get(tp) ?? 0,
      }))
    : browse.kinds.map((k) => ({
        value: k,
        label: kindLabel(t, k),
        count: browse.kindCounts.get(k) ?? 0,
      }));
  const activeTab = showTopicView ? activeTopic : activeKind;

  // 책/영상 갈래와 「기관별/주제별」 토글은 같은 성격의 선택(카테고리)이라 한 행에 두고,
  // 그 아래에 고른 갈래의 세부 탭(기관 목록·주제 목록) 줄을 별도로 둔다.
  return (
    <div className="space-y-3">
      {/* ── 카테고리 행 — 매체(책·영상) + 갈라서기 토글(기관별/주제별) */}
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${
          align === "center" ? "justify-center" : "justify-start"
        }`}
      >
        {/* 매체(책·영상) 탭 — 책과 영상은 오가며 보는 것이 아니라 갈라서는 축이다 */}
        {showMediaRow && (
          <CategoryTabFilter
            options={mediaOptions}
            value={activeMedia ?? ""}
            linkTo={linkHref ? (m) => linkFor({ media: m }) : undefined}
            onChange={linkHref ? undefined : (m) => onSelectMedia?.(m)}
            align={align}
            size={size}
          />
        )}

{/* 무엇으로 훑을지 — 누가 뽑았나(기관) 또는 무엇에 관한 목록인가(주제) */}
        {showViewToggle && (
          <CategoryTabFilter
            options={[
              { value: "kind", label: t("viewByKind") },
              { value: "topic", label: t("viewByTopic") },
            ]}
            value={viewTopic ? "topic" : "kind"}
            onChange={(v) => onView?.(v === "topic")}
            align={align}
            size={size}
          />
        )}
      </div>

      {/* ── 세부 탭 줄 — 고른 갈래(기관 or 주제)의 목록 */}
      {showTopicView && tabOptions.length > 0 && (
        <CategoryTabFilter
          options={tabOptions}
          value={activeTab ?? ""}
          linkTo={linkHref ? (v) => linkFor({ media: activeMedia ?? undefined, topic: v }) : undefined}
          onChange={linkHref ? undefined : (v) => onSelectTopic?.(v)}
          align={align}
          size={size}
          subtle
        />
      )}
      {!showTopicView && tabOptions.length > 0 && (
        <CategoryTabFilter
          options={tabOptions}
          value={activeTab ?? ""}
          linkTo={linkHref ? (v) => linkFor({ media: activeMedia ?? undefined, kind: v }) : undefined}
          onChange={linkHref ? undefined : (v) => onSelectKind?.(v)}
          align={align}
          size={size}
          subtle
        />
      )}
    </div>
  );
}