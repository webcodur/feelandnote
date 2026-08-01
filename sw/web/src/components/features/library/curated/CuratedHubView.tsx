/*
  파일명: /components/features/library/curated/CuratedHubView.tsx
  기능: 기관 선정 허브
  책임: 선정 주체를 갈래(대학·언론·시상기관·투표 등)별 탭으로 가르고, 고른 갈래의 기관만 진열한다.
        데이터는 서버가 한 번에 실어 보내므로 탭 전환은 서버를 다시 다녀오지 않는다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import NationalityText from "@/components/ui/NationalityText";
import FilterTabs from "@/components/ui/FilterTabs";
import type { CuratedHub } from "@/actions/library/types";
import CuratedListCard from "./CuratedListCard";

/** 갈래 진열 순서. 여기 없는 갈래는 뒤에 붙는다 */
const KIND_ORDER = ["university", "media", "award", "festival", "community", "bookstore", "library", "organization"];

/** 한 기관 카드에서 펼치는 목록 수. 나머지는 기관 화면에서 본다 */
const LISTS_PER_CURATOR = 2;

type Curator = CuratedHub["curators"][number];

function CuratorCard({ curator }: { curator: Curator }) {
  const t = useTranslations("library.curated");

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#161616]/80 p-4 hover:border-white/[0.12] sm:p-5">
      <div className="flex items-start gap-3">
        {curator.logoUrl ? (
          // 기관 로고는 대부분 흰 종이 위에 쓰이도록 만들어져 검은 글자가 많다.
          // 어두운 화면에 그대로 얹으면 묻히므로 밝은 타일 위에 올린다
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white p-1">
            <Image src={curator.logoUrl} alt={curator.name} fill className="object-contain p-1" sizes="44px" />
          </div>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-neutral-900 text-[15px] font-serif font-bold text-text-tertiary">
            {curator.name.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/library/curated/${curator.slug}`}
            className="text-[16px] font-serif font-bold text-text-primary hover:text-accent"
          >
            {curator.name}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-text-tertiary">
            {curator.country && <NationalityText code={curator.country} />}
            {curator.foundedYear && <span>{curator.foundedYear}</span>}
            <span>{t("listCount", { count: curator.listCount })}</span>
          </div>
          {curator.description && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">{curator.description}</p>
          )}
        </div>
      </div>

      {curator.lists.length > 0 && (
        <>
          {/* 기관 카드가 절반 폭이므로 목록은 한 줄에 하나씩 — 더 쪼개면 글자가 뭉갠다 */}
          <div className="mt-4 grid gap-3">
            {curator.lists.slice(0, LISTS_PER_CURATOR).map((list) => (
              <CuratedListCard key={list.slug} list={list} />
            ))}
          </div>
          {curator.lists.length > LISTS_PER_CURATOR && (
            <Link
              href={`/library/curated/${curator.slug}`}
              className="mt-3 inline-block text-[12px] text-text-tertiary hover:text-accent"
            >
              {t("moreLists", { count: curator.lists.length - LISTS_PER_CURATOR })}
            </Link>
          )}
        </>
      )}
    </div>
  );
}

/** 매체 진열 순서 */
const MEDIA_ORDER = ["BOOK", "VIDEO", "GAME", "MUSIC"];

export default function CuratedHubView({
  hub,
  selectedKind,
  selectedMedia,
  selectedTopic,
}: {
  hub: CuratedHub;
  selectedKind: string | null;
  selectedMedia: string | null;
  selectedTopic: string | null;
}) {
  const t = useTranslations("library.curated");

  // 매체는 목록의 성질이라 기관이 아니라 목록을 기준으로 센다
  const mediaCounts = new Map<string, number>();
  for (const c of hub.curators) for (const l of c.lists) mediaCounts.set(l.contentType, (mediaCounts.get(l.contentType) ?? 0) + 1);
  const medias = [...mediaCounts.keys()].sort((a, b) => MEDIA_ORDER.indexOf(a) - MEDIA_ORDER.indexOf(b));

  const [media, setMedia] = useState(() =>
    selectedMedia && mediaCounts.has(selectedMedia) ? selectedMedia : (medias[0] ?? "BOOK")
  );
  const [kind, setKind] = useState<string | null>(selectedKind);
  // 주제는 갈래를 가로지른다 — 공포는 타임아웃(언론)과 브램 스토커(상)에 나뉘어 있다.
  // 그래서 갈래와 나란히 두지 않고 「무엇으로 훑을지」를 갈아끼우는 방식으로 둔다
  const [byTopic, setByTopic] = useState(!!selectedTopic);
  const [topic, setTopic] = useState<string | null>(selectedTopic);

  // 고른 매체의 목록만 남기고, 그 매체를 하나도 안 낸 기관은 뺀다
  const inMedia = hub.curators
    .map((c) => ({ ...c, lists: c.lists.filter((l) => l.contentType === media) }))
    .filter((c) => c.lists.length > 0);

  const byKind = new Map<string, Curator[]>();
  for (const c of inMedia) {
    const arr = byKind.get(c.kind);
    if (arr) arr.push(c);
    else byKind.set(c.kind, [c]);
  }
  const kinds = [...byKind.keys()].sort((a, b) => {
    const ia = KIND_ORDER.indexOf(a);
    const ib = KIND_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  // 주제별 묶음 — 한 목록이 주제를 여럿 달 수 있어 기관이 여러 주제에 나타난다
  const byTopicMap = new Map<string, Curator[]>();
  for (const c of inMedia) {
    const seen = new Set<string>();
    for (const l of c.lists) for (const tp of l.topics) seen.add(tp);
    for (const tp of seen) {
      const scoped = { ...c, lists: c.lists.filter((l) => l.topics.includes(tp)) };
      const arr = byTopicMap.get(tp);
      if (arr) arr.push(scoped);
      else byTopicMap.set(tp, [scoped]);
    }
  }
  const topics = [...byTopicMap.keys()].sort((a, b) => byTopicMap.get(b)!.length - byTopicMap.get(a)!.length);

  // 매체를 갈아타면 구성이 통째로 바뀐다. 지금 매체에 없는 값은 첫 항목으로 흘려보낸다
  const activeKind = kind && byKind.has(kind) ? kind : kinds[0];
  const activeTopic = topic && byTopicMap.has(topic) ? topic : topics[0];
  const useTopics = byTopic && topics.length > 0;
  const shown = useTopics ? (byTopicMap.get(activeTopic) ?? []) : (byKind.get(activeKind) ?? []);

  if (hub.curators.length === 0) {
    return <p className="py-16 text-center text-[14px] text-text-tertiary">{t("empty")}</p>;
  }

  /**
   * 탭을 갈아도 서버를 다시 다녀오지 않는다 — 기관 자료는 이미 전부 받아 두었다.
   * 주소만 바꿔 링크 공유와 새로고침이 듣게 한다(라우터로 밀면 왕복이 생겨 반응이 늦다).
   */
  const syncUrl = (next: { media: string; kind?: string; topic?: string }) => {
    const q = new URLSearchParams({ media: next.media });
    if (next.kind) q.set("kind", next.kind);
    if (next.topic) q.set("topic", next.topic);
    window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
  };

  return (
    <div className="space-y-6">
      {/* 서가로 돌아가는 길은 서가 레이아웃의 공통 뒤로가기가 맡는다 */}
      <p className="max-w-3xl text-[14px] leading-relaxed text-text-secondary">{t("intro")}</p>

      {/* 무엇을 뽑았나 — 책과 영상은 오가며 보는 것이 아니라 갈라서는 축이다 */}
      {medias.length > 1 && (
        <div className="flex gap-2">
          {medias.map((m) => {
            const on = m === media;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMedia(m);
                  setKind(null);
                  setTopic(null);
                  syncUrl({ media: m });
                }}
                className={
                  on
                    ? "rounded-lg border border-accent/50 bg-accent/15 px-4 py-2 text-[14px] font-bold text-accent"
                    : "rounded-lg border border-white/[0.08] px-4 py-2 text-[14px] text-text-secondary hover:border-accent/40 hover:text-accent"
                }
              >
                {t.has(`mediaLabel.${m}`) ? t(`mediaLabel.${m}`) : m}
                <span className="ml-1.5 text-[11px] opacity-60">{mediaCounts.get(m)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 무엇으로 훑을지 — 누가 뽑았나(갈래) 또는 무엇에 관한 목록인가(주제) */}
      {topics.length > 0 && (
        <div className="flex items-center gap-3 text-[12px]">
          <button
            type="button"
            onClick={() => {
              setByTopic(false);
              syncUrl({ media, kind: activeKind });
            }}
            className={useTopics ? "text-text-tertiary hover:text-accent" : "font-bold text-accent"}
          >
            {t("viewByKind")}
          </button>
          <span className="text-text-tertiary/40">/</span>
          <button
            type="button"
            onClick={() => {
              setByTopic(true);
              syncUrl({ media, topic: activeTopic });
            }}
            className={useTopics ? "font-bold text-accent" : "text-text-tertiary hover:text-accent"}
          >
            {t("viewByTopic")}
          </button>
        </div>
      )}

      {useTopics ? (
        <FilterTabs
          items={topics.map((tp) => ({
            value: tp,
            label: t.has(`topicLabel.${tp}`) ? t(`topicLabel.${tp}`) : tp,
          }))}
          activeValue={activeTopic}
          counts={Object.fromEntries(topics.map((tp) => [tp, byTopicMap.get(tp)!.length]))}
          onSelect={(tp) => {
            setTopic(tp);
            syncUrl({ media, topic: tp });
          }}
        />
      ) : (
        <FilterTabs
          items={kinds.map((k) => ({ value: k, label: t(`kind.${k}`) }))}
          activeValue={activeKind}
          counts={Object.fromEntries(kinds.map((k) => [k, byKind.get(k)!.length]))}
          onSelect={(k) => {
            setKind(k);
            syncUrl({ media, kind: k });
          }}
        />
      )}

      {/* 기관이 스물이 넘어 한 줄에 하나씩 쌓으면 스크롤이 끝없다. 넓은 화면은 두 줄로 나눈다 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((curator) => (
          <CuratorCard key={curator.slug} curator={curator} />
        ))}
      </div>
    </div>
  );
}
