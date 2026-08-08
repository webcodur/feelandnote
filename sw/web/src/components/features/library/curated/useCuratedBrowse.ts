/*
  파일명: /components/features/library/curated/useCuratedBrowse.ts
  기능: 기관 선정 둘러보기 상태 관리
  책임: 카테고리(책·영상 매체)와 「기관별/주제별」 선택을 한 곳에서 쥐고,
        고른 선택에 따라 보일 기관 목록을 계산한다.
        허브(모든 기관)와 기관 상세(그 한 기관)가 같은 훅을 써서,
        매체·기관·주제를 가로지르는 둘러보기 동작이 안에서 밖에서 똑같다.
*/ // ------------------------------

"use client";

import { useState, useMemo } from "react";
import type { CuratedHub } from "@/actions/library/types";

export type ScopeCurator = CuratedHub["curators"][number];

/** 갈래 진열 순서. 여기 없는 갈래는 뒤에 붙는다 */
export const KIND_ORDER = [
  "university",
  "media",
  "award",
  "festival",
  "community",
  "bookstore",
  "library",
  "organization",
] as const;

/** 매체 진열 순서 */
export const MEDIA_ORDER = ["BOOK", "VIDEO", "GAME", "MUSIC"] as const;

// ────────────────────────────────────────────────────
// #region 순수 집계 — 서버 화면(목록 상세의 이동 탭)도 같은 수를 만든다

export interface CuratedBrowseSummary {
  medias: string[];
  mediaCounts: Map<string, number>;
  kinds: string[];
  kindCounts: Map<string, number>;
  topics: string[];
  topicCounts: Map<string, number>;
}

/** 고른 범위(기관들)가 낸 목록의 매체·기관·주제를 집계한다.
 *  server/client 양쪽에서 쓸 수 있도록 상태가 없는 순수 함수다. */
export function summarizeBrowse(scope: ScopeCurator[]): CuratedBrowseSummary {
  // 매체는 목록의 성질이라 기관이 아니라 목록을 기준으로 센다
  const mediaCounts = new Map<string, number>();
  for (const c of scope) {
    for (const l of c.lists) {
      mediaCounts.set(l.contentType, (mediaCounts.get(l.contentType) ?? 0) + 1);
    }
  }
  const medias = [...mediaCounts.keys()].sort(
    (a, b) => MEDIA_ORDER.indexOf(a as never) - MEDIA_ORDER.indexOf(b as never)
  );

  const kindCounts = new Map<string, number>();
  for (const c of scope) kindCounts.set(c.kind, (kindCounts.get(c.kind) ?? 0) + 1);
  const kinds = [...kindCounts.keys()].sort((a, b) => {
    const ia = KIND_ORDER.indexOf(a as never);
    const ib = KIND_ORDER.indexOf(b as never);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  // 주제별 — 한 목록이 주제를 여럿 달 수 있어 기관이 여러 주제에 나타난다
  const topicCounts = new Map<string, number>();
  for (const c of scope) {
    const seen = new Set<string>();
    for (const l of c.lists) for (const tp of l.topics) seen.add(tp);
    for (const tp of seen) topicCounts.set(tp, (topicCounts.get(tp) ?? 0) + 1);
  }
  const topics = [...topicCounts.keys()].sort(
    (a, b) => (topicCounts.get(b) ?? 0) - (topicCounts.get(a) ?? 0)
  );

  return { medias, mediaCounts, kinds, kindCounts, topics, topicCounts };
}

// #endregion

export interface CuratedBrowseInitial {
  media?: string | null;
  kind?: string | null;
  topic?: string | null;
}

export interface CuratedBrowse {
  summary: CuratedBrowseSummary;
  media: string | null;
  viewTopic: boolean;
  kind: string | null;
  topic: string | null;
  activeMedia: string | null;
  activeKind: string | null;
  activeTopic: string | null;
  useTopics: boolean;
  /** 고른 매체 안에서 다시 센 갈래 — 책↔영상 갈아탈 때 함께 갈린다 */
  kinds: string[];
  kindCounts: Map<string, number>;
  topics: string[];
  topicCounts: Map<string, number>;
  shown: ScopeCurator[];
  setMedia: (media: string | null) => void;
  setViewTopic: (view: boolean) => void;
  setKind: (kind: string) => void;
  setTopic: (topic: string) => void;
}

export function useCuratedBrowse(
  scope: ScopeCurator[],
  initial?: CuratedBrowseInitial
): CuratedBrowse {
  const summary = useMemo(() => summarizeBrowse(scope), [scope]);

  const [media, setMediaState] = useState<string | null>(() =>
    initial?.media && summary.mediaCounts.has(initial.media) ? initial.media : summary.medias[0] ?? null
  );
  const [viewTopic, setViewTopicState] = useState(() => Boolean(initial?.topic));
  const [kind, setKindState] = useState<string | null>(() =>
    initial?.kind && summary.kindCounts.has(initial.kind) ? initial.kind : null
  );
  const [topic, setTopicState] = useState<string | null>(() =>
    initial?.topic && summary.topicCounts.has(initial.topic) ? initial.topic : null
  );

  // 고른 매체의 목록만 남기고, 그 매체를 하나도 안 낸 기관은 뺀다
  const inMedia = useMemo(() => {
    if (!media) return [];
    return scope
      .map((c) => ({
        ...c,
        lists: c.lists.filter((l) => l.contentType === media),
      }))
      .filter((c) => c.lists.length > 0);
  }, [scope, media]);

  const kindCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of inMedia) m.set(c.kind, (m.get(c.kind) ?? 0) + 1);
    return m;
  }, [inMedia]);
  const kinds = useMemo(
    () =>
      [...kindCounts.keys()].sort((a, b) => {
        const ia = KIND_ORDER.indexOf(a as never);
        const ib = KIND_ORDER.indexOf(b as never);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      }),
    [kindCounts]
  );

  // 주제별 묶음 — 매체를 고르면 그 안에서만 묶는다
  const topicGroups = useMemo(() => {
    const map = new Map<string, ScopeCurator[]>();
    for (const c of inMedia) {
      const seen = new Set<string>();
      for (const l of c.lists) for (const tp of l.topics) seen.add(tp);
      for (const tp of seen) {
        const scoped = { ...c, lists: c.lists.filter((l) => l.topics.includes(tp)) };
        const arr = map.get(tp);
        if (arr) arr.push(scoped);
        else map.set(tp, [scoped]);
      }
    }
    return map;
  }, [inMedia]);
  const topicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const [tp, arr] of topicGroups) m.set(tp, arr.length);
    return m;
  }, [topicGroups]);
  const topics = useMemo(
    () => [...topicCounts.keys()].sort((a, b) => (topicCounts.get(b) ?? 0) - (topicCounts.get(a) ?? 0)),
    [topicCounts]
  );

  // 매체를 갈아타면 구성이 통째로 바뀐다. 지금 매체에 없는 값은 첫 항목으로 흘려보낸다
  const activeKind = kind && kindCounts.has(kind) ? kind : kinds[0] ?? null;
  const activeTopic = topic && topicCounts.has(topic) ? topic : topics[0] ?? null;
  const useTopics = viewTopic && topics.length > 0;
  const inMediaShown = useTopics
    ? (topicGroups.get(activeTopic ?? "") ?? [])
    : inMedia.filter((c) => c.kind === activeKind);

  const setMedia = (m: string | null) => {
    setMediaState(m);
    setKindState(null);
    setTopicState(null);
  };
  const setViewTopic = (v: boolean) => setViewTopicState(v);
  const setKind = (k: string) => {
    setKindState(k);
    setViewTopicState(false);
  };
  const setTopic = (t: string) => {
    setTopicState(t);
    setViewTopicState(true);
  };

  return {
    summary,
    media,
    viewTopic,
    kind,
    topic,
    activeMedia: media,
    activeKind,
    activeTopic,
    useTopics,
    kinds,
    kindCounts,
    topics,
    topicCounts,
    shown: inMediaShown,
    setMedia,
    setViewTopic,
    setKind,
    setTopic,
  };
}