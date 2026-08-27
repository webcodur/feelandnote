/*
  파일명: /components/features/celeb/RelationMap/RelationExplorer.tsx
  기능: 관계망 탐색기 — 인물을 골라 그 둘레를 보고, 얼굴을 눌러 파고든다
  책임: 중심을 옮기는 일만 여기서 쥔다. 관계를 나누는 규칙은 서버가 정해 넘긴다.

        고정된 판을 늘어놓던 자리를 대신한다 — 몇 개를 골라 박아 두면 방문자는
        고른 것을 볼 뿐 관계망을 뒤질 수 없었다.
        얼굴을 누르면 중심이 옮겨 가고, 이름 옆 화살표는 인물 상세로 나간다.
        첫 화면은 서버가 그려 두므로 크롤러도 관계와 링크를 그대로 받는다.
*/

"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, CornerUpLeft, Loader2, Search, User, X } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { withParticle } from "@/lib/korean-particle";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import { searchCelebs } from "@/actions/search/searchCelebs";
import { getRelationNeighborhood, type RelationNeighborhood } from "@/actions/home/getRelationNeighborhood";
import type { RelationStarter } from "@/actions/home/getRelationShapes";
import type { NeighborKind } from "@/lib/celeb/relationNeighborhood";

/** 검색어를 친 뒤 이만큼 쉬면 찾으러 간다. 글자마다 부르면 조회가 쏟아진다 */
const SEARCH_DEBOUNCE_MS = 250;

/** 검색 결과로 세울 최대 인원 */
const SEARCH_LIMIT = 6;

/** 얼굴 한 변(px) */
const CENTER_AVATAR_PX = 128;
const NEIGHBOR_AVATAR_PX = 64;

interface SearchHit {
  id: string;
  nickname: string;
  nickname_en?: string | null;
  avatar_url: string | null;
  title?: string | null;
}

interface RelationExplorerProps {
  initial: RelationNeighborhood;
  starters: RelationStarter[];
  isEn: boolean;
}

export default function RelationExplorer({ initial, starters, isEn }: RelationExplorerProps) {
  const t = useTranslations("explore.hub.relationMap");
  /* 관계 유형 이름은 인물 상세와 한 곳을 쓴다 — 같은 관계가 화면마다 다른 말로 불리면 안 된다 */
  const tRel = useTranslations("celebPage");
  const [current, setCurrent] = useState(initial);
  const [trail, setTrail] = useState<RelationNeighborhood[]>([]);
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* 늦게 도착한 옛 검색 결과가 새 결과를 덮지 않게 차례를 센다 */
  const searchSeq = useRef(0);

  const nameOf = useCallback(
    (celeb: { nickname: string; nicknameEn?: string | null; nickname_en?: string | null }) =>
      (isEn && (celeb.nicknameEn ?? celeb.nickname_en)) || celeb.nickname,
    [isEn],
  );

  /** 중심을 옮긴다. 옮기기 전 자리는 되돌아갈 수 있게 쌓아 둔다 */
  const moveTo = useCallback(
    (celebId: string) => {
      if (celebId === current.center.id) return;
      setQuery("");
      setHits([]);
      startTransition(async () => {
        const next = await getRelationNeighborhood(celebId);
        // 관계가 하나도 없는 인물로는 옮기지 않는다 — 빈 판을 보여 주면 길이 끊긴다
        if (!next || next.groups.length === 0) return;
        setTrail((previous) => [...previous, current]);
        setCurrent(next);
      });
    },
    [current],
  );

  const goBack = useCallback(() => {
    setTrail((previous) => {
      if (previous.length === 0) return previous;
      setCurrent(previous[previous.length - 1]);
      return previous.slice(0, -1);
    });
  }, []);

  const onQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const keyword = value.trim();
    if (keyword.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++searchSeq.current;
      const result = await searchCelebs({ query: keyword, limit: SEARCH_LIMIT });
      if (seq !== searchSeq.current) return;
      setHits((result.items ?? []) as SearchHit[]);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  /* 묶음 이름이 이미 말하고 있는 유형은 배지로 되풀이하지 않는다.
     「영향을 준 인물」 안의 influence는 당연하고, 그 안에 섞인 teacher(스승)만 표가 난다 */
  const impliedType: Partial<Record<NeighborKind, string>> = useMemo(
    () => ({ gave: "influence", took: "influenced", rival: "rival" }),
    [],
  );

  const groupLabel = useMemo(
    () => (kind: NeighborKind) =>
      ({
        gave: t("groupGave"),
        took: t("groupTook"),
        rival: t("groupRival"),
        together: t("groupTogether"),
        family: t("groupFamily"),
      })[kind],
    [t],
  );

  const centerName = nameOf(current.center);
  /* 「아리스토텔레스(으)로」가 남지 않게 조사를 여기서 붙여 넘긴다 */
  const previousName = trail.length > 0 ? nameOf(trail[trail.length - 1].center) : "";
  const backLabel = isEn ? previousName : withParticle(previousName, "direction");
  const centerTitle = (isEn && current.center.titleEn) || current.center.title;

  return (
    <div className="rounded-2xl border border-white/5 bg-card p-5 md:p-7">
      {/* 찾기 줄 — 아무 인물이나 골라 그 둘레로 갈 수 있다 */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-main px-3 py-2.5 focus-within:border-accent/50">
          <Search aria-hidden size={16} className="shrink-0 text-text-secondary" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/70"
          />
          {searching && <Loader2 aria-hidden size={15} className="shrink-0 animate-spin text-accent" />}
          {query && !searching && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label={t("searchClear")}
              className="shrink-0 text-text-secondary hover:text-text-primary"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {hits.length > 0 && (
          <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-main p-1 shadow-xl">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => moveTo(hit.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent/10"
                >
                  <span className="relative block size-8 shrink-0 overflow-hidden rounded-full bg-card">
                    {hit.avatar_url ? (
                      <CelebAvatarImage src={hit.avatar_url} alt={nameOf(hit)} boxPx={32} className="size-full object-cover" />
                    ) : (
                      <User aria-hidden size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">{nameOf(hit)}</span>
                    {hit.title && (
                      <span className="block truncate text-xs text-text-secondary">{hit.title}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 시작점 — 어디부터 볼지 모르는 사람에게 건네는 손잡이 */}
      {starters.length > 0 && (
        <div className="mb-7 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-text-secondary">{t("startersLead")}</span>
          {starters.map((starter) => (
            <button
              key={starter.id}
              type="button"
              onClick={() => moveTo(starter.id)}
              disabled={starter.id === current.center.id}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-text-secondary hover:border-accent/40 hover:text-accent disabled:border-accent/40 disabled:text-accent"
            >
              {(isEn && starter.nicknameEn) || starter.nickname}
            </button>
          ))}
        </div>
      )}

      {/* 중심 — 지금 보고 있는 인물 */}
      <div className={`relative ${pending ? "opacity-60" : ""}`}>
        {pending && (
          <span className="absolute inset-x-0 top-0 z-10 flex justify-center">
            <Loader2 aria-hidden className="size-6 animate-spin text-accent" />
          </span>
        )}

        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="relative block size-24 overflow-hidden rounded-full border-2 border-accent/70 bg-main md:size-32">
            {current.center.avatarUrl ? (
              <CelebAvatarImage
                src={current.center.avatarUrl}
                alt={centerName}
                boxPx={CENTER_AVATAR_PX}
                className="size-full object-cover"
              />
            ) : (
              <User aria-hidden size={40} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary" />
            )}
          </span>
          <span>
            <span className="flex items-center justify-center gap-1.5">
              <span className="text-lg font-semibold text-text-primary md:text-xl">{centerName}</span>
              {current.center.slug && (
                <Link
                  href={`/celeb/${current.center.slug}`}
                  aria-label={t("openDetail", { name: centerName })}
                  className="text-text-secondary hover:text-accent"
                >
                  <ArrowUpRight size={18} />
                </Link>
              )}
            </span>
            {centerTitle && <span className="mt-0.5 block text-sm text-text-secondary">{centerTitle}</span>}
          </span>

          {trail.length > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="mt-1 flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-text-secondary hover:border-accent/40 hover:text-accent"
            >
              <CornerUpLeft size={13} />
              {t("goBack", { name: backLabel })}
            </button>
          )}
        </div>

        {/* 둘레 — 묶음마다 어떻게 이어졌는지를 함께 적는다. 이 문장이 이 화면의 알맹이다 */}
        <div className="space-y-7">
          {current.groups.map((group) => (
            <section key={group.kind}>
              <h5 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-text-primary">
                {groupLabel(group.kind)}
                <span className="text-xs font-normal tabular-nums text-text-secondary">
                  {group.total > group.items.length
                    ? t("groupCountPartial", { shown: group.items.length, total: group.total })
                    : t("groupCount", { count: group.total })}
                </span>
              </h5>

              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => {
                  const name = nameOf(item.celeb);
                  const note = (isEn && item.noteEn) || item.note;
                  /* 설명이 없으면 유형이라도 남긴다 — 묶음 이름과 겹쳐 평소엔 감추던 배지를
                     이때는 세운다. 「아직 적히지 않았습니다」를 세 줄로 띄우면
                     빈 자리가 오히려 크게 보인다 */
                  const typeTag =
                    note && item.relType === impliedType[group.kind]
                      ? null
                      : tRel(`relType_${item.relType}`);

                  return (
                    <li key={item.celeb.id}>
                      {/* 카드를 누르면 중심이 그 사람으로 옮겨 간다 */}
                      <button
                        type="button"
                        onClick={() => moveTo(item.celeb.id)}
                        className="group flex h-full w-full gap-3 rounded-xl border border-white/5 bg-main p-3 text-left hover:border-accent/40 hover:bg-accent/5"
                      >
                        <span className="relative block size-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-card group-hover:border-accent/50 md:size-16">
                          {item.celeb.avatarUrl ? (
                            <CelebAvatarImage
                              src={item.celeb.avatarUrl}
                              alt={name}
                              boxPx={NEIGHBOR_AVATAR_PX}
                              className="size-full object-cover"
                            />
                          ) : (
                            <User aria-hidden size={20} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1">
                            <span className="truncate break-keep text-sm font-semibold text-text-primary group-hover:text-accent">
                              {name}
                            </span>
                            {/* 상세로 나가는 길. 카드 전체는 파고들기라 여기만 따로 연다 */}
                            <Link
                              href={`/celeb/${item.celeb.slug}`}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={t("openDetail", { name })}
                              className="shrink-0 text-text-secondary/60 hover:text-accent"
                            >
                              <ArrowUpRight size={14} />
                            </Link>
                            {typeTag && (
                              <span className="ml-auto shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] leading-none text-text-secondary">
                                {typeTag}
                              </span>
                            )}
                          </span>
                          {note && (
                            <span className="mt-1 line-clamp-3 break-keep text-xs leading-relaxed text-text-secondary">
                              {note}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
