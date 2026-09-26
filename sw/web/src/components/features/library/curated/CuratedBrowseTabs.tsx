/*
  파일명: /components/features/library/curated/CuratedBrowseTabs.tsx
  기능: 기관 선정 둘러보기 조작대 — 카테고리(매체) 선택, 「기관별/주제별」 전환, 세부 선택(기관 종류·주제)을 묶은 UI
  책임: 허브(모든 기관)·기관 상세(그 기관)·목록 상세(이동용 링크)가 이 하나를 쓴다.
        - browse 모드(onSelect*): 선택값을 부모가 쥐고, 화면 안에서 목록을 갈아끼운다
        - link 모드(linkHref): 고른 항목이 기관 선정 허브 조합으로 이동한다
        짧은 선택(매체·기관별/주제별)은 공용 pill(CategoryTabFilter)을, 항목이 많은 세부 선택은
        공용 선택 단추+모달(FilterSelect)을 그대로 쓴다 — 새로 그리지 않는다.
  상태는 훅(useCuratedBrowse)이 쥐고, 이 파일은 그린다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CategoryTabFilter, type CategoryTabOption } from "@/components/ui/CategoryTabFilter";
import FilterSelect from "@/components/shared/filters/FilterSelect";
import type { FilterOption } from "@/components/shared/filters";
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
  onSelectKind?: (kind: string | null) => void;
  onSelectTopic?: (topic: string | null) => void;
  onView?: (viewTopic: boolean) => void;
  /** 매체 탭 표시 여부를 강제할 때(단일 매체 화면 등) */
  showMedia?: boolean;
  /** pill 정렬 — 허브처럼 제목이 중앙일 때 맞춘다. 기본은 왼쪽 */
  align?: "center" | "left";
  /** pill 크기 — 허브처럼 넉넉한 구획은 기본 크기, 좁은 하단 줄은 작은 크기 */
  size?: "md" | "sm";
}

/** 세부 선택의 전체 모드 값 — 기관 종류·주제 값과 겹치지 않는다 */
const ALL = "all";

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
  const router = useRouter();
  const { summary, activeMedia, activeTopic, activeKind, viewTopic } = browse;
  const justify = align === "center" ? "justify-center" : "justify-start";

  /**
   * 탭이 가리킬 주소.
   *
   * 링크 모드가 아니어도 주소는 만들어 둔다. 허브에서 탭은 화면만 갈아 끼우지만,
   * 주소가 없으면 서버가 보내는 HTML 에 다른 탭으로 가는 길이 한 줄도 남지 않아
   * 그 탭에만 걸린 기관들이 크롤러에게 통째로 안 보인다(영상 매체 8곳이 그랬다).
   */
  const linkFor = (query: CuratedBrowseTabsLinkQuery) => {
    if (linkHref) return linkHref(query);
    const params = new URLSearchParams();
    if (query.media) params.set("media", query.media);
    if (query.topic) params.set("topic", query.topic);
    if (!query.topic && query.kind) params.set("kind", query.kind);
    const qs = params.toString();
    return qs ? `/explore/works/curated?${qs}` : "/explore/works/curated";
  };

  // 보여줄 매체 — 목록이 없는 매체는 탭을 세우지 않는다. 게임·음악도 목록이 생기면 저절로 탭이 선다
  const medias = summary.medias.filter((m) => (summary.mediaCounts.get(m) ?? 0) > 0);
  const mediaOptions: CategoryTabOption[] = medias.map((m) => ({
    value: m,
    label: mediaLabel(t, m),
  }));
  const showMediaRow = showMedia ?? medias.length > 1;

  // 「기관별/주제별」 토글 — 고른 매체 안에 주제가 있을 때만 의미가 있다.
  // link 모드에서도 토글 자체는 살아 있어 세부 선택을 바꾼다(허브 조합으로 이동하는 길목을 제공).
  const showViewToggle = browse.topics.length > 0;

  // 세부 선택 — 고른 갈래(기관 종류 or 주제)의 항목. 책↔영상으로 갈아타면 매체 안에서 다시 모은 항목으로 따라 갈린다.
  // 항목이 많아 한 줄에 늘어놓으면 가로로 넘쳐, 지금 고른 값을 단추로 보이고 모달에서 다시 고르게 한다.
  // 모달 맨 위 「전체」가 선택을 풀어 매체 안 전부를 보인다.
  // 세부 선택은 링크를 내보내지 않는다 — 전체 모드에서 매체 안 기관이 모두 그려지므로 크롤러가 잃는 길은 없다.
  const showTopicView = browse.useTopics;
  const detailItems: FilterOption[] = showTopicView
    ? browse.topics.map((tp) => ({ value: tp, label: topicLabel(t, tp) }))
    : browse.kinds.map((k) => ({ value: k, label: kindLabel(t, k) }));
  const detailOptions: FilterOption[] = [{ value: ALL, label: t("filterAll") }, ...detailItems];
  const detailValue = (showTopicView ? activeTopic : activeKind) ?? ALL;

  const selectDetail = (value: string) => {
    // 같은 값을 다시 고르면 훅이 선택을 풀어 버린다 — 모달에서는 그대로 두는 것이 맞다
    if (value === detailValue) return;
    const picked = value === ALL ? undefined : value;
    if (linkHref) {
      const media = activeMedia ?? undefined;
      router.push(linkHref(showTopicView ? { media, topic: picked } : { media, kind: picked }));
      return;
    }
    if (showTopicView) onSelectTopic?.(picked ?? null);
    else onSelectKind?.(picked ?? null);
  };

  // 책/영상 갈래와 「기관별/주제별」 토글은 같은 성격의 선택(카테고리)이라 한 행에 두고,
  // 그 아래에 세부 선택 단추를 둔다.
  // 조작대가 아래 카드보다 도드라지지 않게 pill은 여백만 줄였다(글자 크기는 유지).
  // 탭에 숫자는 달지 않는다 — 매체가 게임·음악까지 늘면 한 줄이 넘친다
  return (
    <div className="space-y-1.5">
      {/* ── 카테고리 행 — 매체(책·영상) + 갈라서기 토글(기관별/주제별) */}
      <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 ${justify}`}>
        {/* 매체(책·영상) 탭 — 책과 영상은 오가며 보는 것이 아니라 갈라서는 축이다 */}
        {showMediaRow && (
          <CategoryTabFilter
            options={mediaOptions}
            value={activeMedia ?? ""}
            linkTo={(m) => linkFor({ media: m })}
            onChange={linkHref ? undefined : (m) => onSelectMedia?.(m)}
            align={align}
            size={size}
            compact
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
            compact
          />
        )}
      </div>

      {/* ── 세부 선택 — 지금 고른 기관 종류·주제를 단추로 보이고, 누르면 모달에서 다시 고른다.
          항목이 하나뿐이면(기관 하나의 화면 등) 고를 것이 없어 세우지 않는다 */}
      {detailItems.length > 1 && (
        <div className={`flex ${justify}`}>
          <FilterSelect
            label={showTopicView ? t("filterTopic") : t("filterKind")}
            value={detailOptions.find((o) => o.value === detailValue)?.label ?? t("filterAll")}
            isActive={detailValue !== ALL}
            options={detailOptions}
            currentValue={detailValue}
            onSelect={selectDetail}
          />
        </div>
      )}
    </div>
  );
}
