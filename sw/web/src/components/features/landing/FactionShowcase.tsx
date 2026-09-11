"use client";

import { useEffect, useState, useRef, lazy, Suspense, type CSSProperties } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, LoaderCircle, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import type { CelebProfile } from "@/types/home";
import { Z_INDEX } from "@/constants/zIndex";
import BlurDissolve from "@/components/ui/BlurDissolve";
import { toTeamImages } from "@feelandnote/shared/lib/faction-team-image";
import FactionMediaLinks from "@/components/features/faction/FactionMediaLinks";
import FactionQuoteOverlay from "@/components/features/faction/quote/FactionQuoteOverlay";
import { useFactionQuoteStage } from "@/components/features/faction/quote/useFactionQuoteStage";
import FactionMobileInfoPanel from "./FactionMobileInfoPanel";
import FactionRoster, { type FactionRosterEntry } from "./FactionRoster";
import FactionMemberLineup, { type FactionLineupMember } from "./FactionMemberLineup";
import CelebDetailCardButton from "@/components/shared/CelebDetailCardButton";

const CelebDetailModal = lazy(() => import("@/components/features/celeb/modals/CelebDetailModal"));

/*
  세력도감 쇼케이스.
  묶음과 인물을 같은 위계로 늘어놓는다. 단체샷은 띄우지 않는다(V1).
  - 좌측: 고른 항목의 화면 — 인물이면 개인 화보, 묶음·세력이면 구성원 얼굴을 모은 출연진 판
  - 우측: 묶음 + 그 묶음 인물들을 한 리스트로. 맨 위 항목이 기본 선택.
  리스트에서 항목을 고르면 좌측 화면과 설명이 그 항목으로 바뀐다.
*/
interface FactionShowcaseProps {
  activeTag: FeaturedTag;
  locale: Locale;
  initialCelebId?: string;
  variant?: "standalone" | "embedded";
  atlasLinkLabel?: string;
}

type ShowcaseItem =
  /* 묶음 — 이름·구성원은 단체 사진 자료(team_images)에서 읽고, 사진 자체는 쓰지 않는다 */
  | { type: "team"; imageIdx: number }
  | { type: "celeb"; celeb: FeaturedCeleb; celebIdx: number; nested: boolean }
  /*
    세력(그룹) 머리글 — 목록에선 가로선+라벨 한 줄이지만, 고르면 좌측 큰 화면에
    소속 인물 얼굴 격자와 세력 소개(이름·부제·인원·명단)가 뜨는 정식 항목이다.
    memberItemIdxs 는 소속 인물 항목의 자리 번호 — 명단에서 이름을 눌러 건너뛰는 데 쓴다.
  */
  | {
      type: "group";
      /** 묶음도 세력도 없는 평면 명단의 맨 앞 — 테마 전체 출연진 */
      overview?: true;
      label: string;
      labelEn: string | null;
      subtitle: string | null;
      subtitleEn: string | null;
      color: string | null;
      logoUrl: string | null;
      memberItemIdxs: number[];
    };

export default function FactionShowcase({
  activeTag,
  locale,
  initialCelebId,
  variant = "standalone",
  atlasLinkLabel,
}: FactionShowcaseProps) {
  const t = useTranslations("landing");
  const localizedCelebName = (celeb: FeaturedCeleb) =>
    locale === "en" ? celeb.nickname_en?.trim() || t("unknownFigure") : celeb.nickname;
  // 직함 — 팩션 직함(배정 한 줄 소개, 제작 lines[0]에서 옴)이 있으면 우선, 없으면 프로필 수식어
  const roleOf = (celeb: FeaturedCeleb) =>
    ((locale === "en" ? celeb.short_desc_en : celeb.short_desc) ??
      (locale === "en" ? celeb.title_en : celeb.title))?.trim() || null;

  const celebs = activeTag.celebs;
  /*
    한 번 더 정규화한다 — 화면 저장분(캐시)에는 「주소만 있는」 옛 형태가 남아 있을 수 있고,
    그걸 새 형태로 읽으면 사진이 통째로 사라진다. 두 형태를 다 받는 자리를 여기 둔다.
  */
  const teamImages = toTeamImages(activeTag.team_images);
  const teamName = locale === "en" ? activeTag.name_en?.trim() || t("unnamedFaction") : activeTag.name;
  const teamDesc = locale === "en" ? activeTag.description_en : activeTag.description;

  /*
    목록은 「묶음 하나 + 그 묶음 사람들」을 한 덩어리로 세운다.

    묶음은 테마 전체가 아니라 그 안의 한 무리다(앤트로픽 12명 중 "아모데이 남매" 2명). 묶음의
    이름과 구성원은 단체 사진 자료(team_images)에만 있어 그것을 읽되, 사진은 띄우지 않고 구성원
    얼굴을 모은 출연진 판으로 대신한다. 묶음 아래에 그 묶음 사람만 매달아 소속이 눈에 보이게 한다.
    같은 사람들을 다시 찍은 사진처럼 새 사람이 한 명도 없는 묶음은 세우지 않는다.

    어느 묶음에도 안 걸린 사람은 맨 아래 모으되, 세력(그룹) 이름이 있으면 세력 머리글 항목으로
    묶어 보여준다. 머리글도 고를 수 있는 항목이라 자리 번호를 갖는다. 묶음이 하나도 없는 테마도
    같은 방식으로 세력별로 묶는다 — 세력이 하나뿐이거나 세력 정보가 아예 없으면 예전 모습(평면
    명단) 그대로다. 묶음이 있는 세력은 묶음 항목이 그 역할을 하므로 머리글을 이중으로 세우지
    않는다(머리글은 묶음에 안 매달린 잔여 인물에만 선다).
  */
  const items: ShowcaseItem[] = [];
  const placed = new Set<string>();

  const pushCeleb = (celeb: FeaturedCeleb, celebIdx: number, nested: boolean) => {
    items.push({ type: "celeb", celeb, celebIdx, nested });
  };

  /*
    세력이 둘 이상인 테마는 세력으로 묶고 단체 사진 묶음은 쓰지 않는다. 세력(뷰의 group_label — 영상
    세력 또는 웹 그룹 표 celeb_tag_groups)은 도감과 신화 탐색이 함께 읽는 그룹 원천이라, 사진 묶음을
    앞세우면 두 화면의 묶음이 갈린다. 사진 묶음은 한 회사처럼 세력이 하나뿐인 테마를 잘게 나눌 때만 쓴다.
  */
  const groupCount = new Set(celebs.map((celeb) => celeb.group_label).filter(Boolean)).size;
  (groupCount >= 2 ? [] : teamImages).forEach((img, imageIdx) => {
    const fresh: number[] = [];
    for (const id of img.celebIds ?? []) {
      const celebIdx = celebs.findIndex(c => c.id === id);
      if (celebIdx < 0 || placed.has(id) || fresh.includes(celebIdx)) continue;
      fresh.push(celebIdx);
    }
    if (fresh.length === 0) return;
    items.push({ type: "team", imageIdx });
    for (const celebIdx of fresh) {
      placed.add(celebs[celebIdx].id);
      pushCeleb(celebs[celebIdx], celebIdx, true);
    }
  });
  const hasTeam = items.length > 0;

  // 어느 묶음에도 안 걸린 나머지 인물들
  const rest = celebs
    .map((celeb, celebIdx) => ({ celeb, celebIdx }))
    .filter(({ celeb }) => !placed.has(celeb.id));

  // 세력 머리글을 쓸지 — 묶음이 있으면 세력 하나만 있어도 묶고,
  // 묶음이 없으면 세력이 둘 이상일 때만 묶는다(하나뿐이면 머리글이 소음이다)
  const restGroupKeys = new Set(rest.map(({ celeb }) => celeb.group_label).filter(Boolean));
  const useGroupHeaders = restGroupKeys.size >= (hasTeam ? 1 : 2);

  if (!useGroupHeaders) {
    rest.forEach(({ celeb, celebIdx }) => pushCeleb(celeb, celebIdx, false));
  } else {
    interface GroupBucket {
      labelEn: string | null;
      subtitle: string | null;
      subtitleEn: string | null;
      color: string | null;
      logoUrl: string | null;
      position: number;
      members: { celeb: FeaturedCeleb; celebIdx: number }[];
    }
    const buckets = new Map<string, GroupBucket>();
    const unlabeled: { celeb: FeaturedCeleb; celebIdx: number }[] = [];

    for (const entry of rest) {
      const key = entry.celeb.group_label;
      if (!key) {
        unlabeled.push(entry);
        continue;
      }
      const bucket = buckets.get(key) ?? { labelEn: entry.celeb.group_label_en, subtitle: null, subtitleEn: null, color: null, logoUrl: null, position: Number.MAX_SAFE_INTEGER, members: [] };
      bucket.position = Math.min(bucket.position, entry.celeb.group_position ?? Number.MAX_SAFE_INTEGER);
      bucket.subtitle ??= entry.celeb.group_subtitle;
      bucket.subtitleEn ??= entry.celeb.group_subtitle_en;
      bucket.color ??= entry.celeb.group_color;
      bucket.logoUrl ??= entry.celeb.group_logo_url;
      bucket.members.push(entry);
      buckets.set(key, bucket);
    }

    // 세력 순번 순으로 머리글 항목 + 소속 인물. 순번이 같으면 등장 순서를 지킨다(sort는 안정 정렬)
    const orderedGroups = [...buckets.entries()].sort((a, b) => a[1].position - b[1].position);
    for (const [key, bucket] of orderedGroups) {
      const memberItemIdxs: number[] = [];
      items.push({
        type: "group",
        label: key,
        labelEn: bucket.labelEn,
        subtitle: bucket.subtitle,
        subtitleEn: bucket.subtitleEn,
        color: bucket.color,
        logoUrl: bucket.logoUrl,
        memberItemIdxs,
      });
      bucket.members.forEach(({ celeb, celebIdx }) => {
        memberItemIdxs.push(items.length);
        pushCeleb(celeb, celebIdx, true);
      });
    }
    // 세력 정보가 없는 인물(수동 배정)은 맨 뒤에 머리글 없이
    unlabeled.forEach(({ celeb, celebIdx }) => pushCeleb(celeb, celebIdx, false));
  }

  /*
    묶음도 세력 머리글도 없는 평면 명단이면 맨 앞에 테마 전체 출연진 판을 세운다 —
    단체샷이 없어도 첫 화면에서 이 사람들이 한 무리라는 것이 보이게 한다.
  */
  const isFlatRoster = items.length > 0 && !items.some((item) => item.type !== "celeb");
  if (isFlatRoster) {
    items.forEach((item) => {
      if (item.type === "celeb") item.nested = true;
    });
    items.unshift({
      type: "group",
      overview: true,
      label: activeTag.name,
      labelEn: activeTag.name_en,
      subtitle: null,
      subtitleEn: null,
      color: null,
      logoUrl: null,
      memberItemIdxs: items.map((_, index) => index + 1),
    });
  }

  /** 목록 번호 — 묶음 N 아래 인물은 N-1, N-2처럼 부모 번호를 이어받는다. */
  const listOrdinalLabels = new Map<number, string>();
  let activeTeamOrdinal: number | null = null;
  let teamOrdinal = 0;
  let memberOrdinal = 0;
  let standaloneOrdinal = 0;
  items.forEach((item, itemIdx) => {
    if (item.type === "team" || item.type === "group") {
      activeTeamOrdinal = ++teamOrdinal;
      memberOrdinal = 0;
      listOrdinalLabels.set(itemIdx, String(activeTeamOrdinal));
      return;
    }
    if (item.nested && activeTeamOrdinal !== null) {
      listOrdinalLabels.set(itemIdx, `${activeTeamOrdinal}-${++memberOrdinal}`);
      return;
    }
    listOrdinalLabels.set(itemIdx, String(++standaloneOrdinal));
  });
  /* 넘김은 목록 전체를 화면 순서 그대로 순회한다 — 세력 머리글도 묶음처럼 출연진 판을 띄운다 */

  const [selectedIdx, setSelectedIdx] = useState(() => {
    if (!initialCelebId) return 0;

    const initialIndex = items.findIndex(
      (item) => item.type === "celeb" && item.celeb.id === initialCelebId,
    );
    return initialIndex >= 0 ? initialIndex : 0;
  });
  const listRef = useRef<HTMLDivElement>(null);
  const listItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [modalCeleb, setModalCeleb] = useState<CelebProfile | null>(null);
  const [modalCelebIdx, setModalCelebIdx] = useState(-1);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState(false);
  // 테마 전환 시 상태 초기화는 부모가 key={activeTag.id}로 재마운트해 처리한다.
  const current = items[selectedIdx] ?? items[0];

  // 이 인물이 세력도감 영상에서 하는 말. 없으면 아무 표시도 하지 않는다(빈 말풍선을 띄우지 않는다)
  const factionQuote =
    current?.type === "celeb"
      ? (locale === "en" ? current.celeb.faction_quote_en : current.celeb.faction_quote)?.trim() || null
      : null;
  const quoteMedia = current?.type === "celeb" ? current.celeb.faction_quote_media : null;
  const portraitImages = current?.type === "celeb" && quoteMedia?.images.length
    ? quoteMedia.images
    : current?.type === "celeb" && current.celeb.faction_image_url
      ? [{ url: current.celeb.faction_image_url, at: 0 }]
      : [];
  /* 대사 재생은 신화 아틀라스와 같은 무대를 쓴다 — 규칙이 갈리지 않게 한 곳에 둔다 */
  const quoteStage = useFactionQuoteStage({
    quote: factionQuote,
    media: quoteMedia,
    locale,
    portraits: portraitImages,
  });
  const {
    isVisible: isFactionQuoteVisible,
    portraitIndex: activePortraitIndex,
    hasPlayableAudio: hasPlayableQuoteAudio,
  } = quoteStage;
  /** 이름 아래 소개를 다 펼쳐 놓았는지 — 잘린 글을 끝까지 읽는 자리다 */
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  /** 소개가 실제로 잘렸는지. 다 보이는 글에까지 「더 보기」를 달면 눌러도 아무 일이 없다 */
  const [isIntroClipped, setIsIntroClipped] = useState(false);
  const introRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const listElement = listRef.current;
    const selectedElement = listItemRefs.current[selectedIdx];
    if (!listElement || !selectedElement) return;

    const frame = requestAnimationFrame(() => {
      const listRect = listElement.getBoundingClientRect();
      const selectedRect = selectedElement.getBoundingClientRect();
      const safeInset = 12;

      if (selectedRect.top < listRect.top + safeInset) {
        listElement.scrollTop -= listRect.top + safeInset - selectedRect.top;
      } else if (selectedRect.bottom > listRect.bottom - safeInset) {
        listElement.scrollTop += selectedRect.bottom - listRect.bottom + safeInset;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedIdx]);

  /*
    소개가 두 줄에서 잘렸는지 직접 재서 「더 보기」를 달지 정한다.
    글이 짧아 다 보이는데도 단추가 있으면 눌러도 아무 변화가 없다.
    창 폭이 바뀌면 줄 수가 달라지므로 그때도 다시 잰다.
  */
  useEffect(() => {
    if (isInfoExpanded) return; // 펼친 동안은 접을 단추가 필요하니 다시 재지 않는다
    const measure = () => {
      const el = introRef.current;
      setIsIntroClipped(el ? el.scrollHeight > el.clientHeight + 1 : false);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [selectedIdx, locale, isInfoExpanded, isFactionQuoteVisible]);

  if (!current) return null;

  // 리스트 클릭: 좌측 화보·설명·팩션 대사를 한 번에 전환한다.
  const selectItem = (idx: number) => {
    quoteStage.stop();
    setSelectedIdx(idx);
    setModalError(false);
    setIsInfoExpanded(false);
  };

  const selectAdjacentSlide = (direction: -1 | 1, portraitEdge: "first" | "last" = "first") => {
    if (items.length === 0) return;

    const targetItemIdx = (selectedIdx + direction + items.length) % items.length;
    selectItem(targetItemIdx);

    if (portraitEdge === "last") {
      const targetItem = items[targetItemIdx];
      const targetPortraitCount = targetItem?.type === "celeb"
        ? targetItem.celeb.faction_quote_media?.images.length
          || (targetItem.celeb.faction_image_url || targetItem.celeb.avatar_url ? 1 : 0)
        : 0;
      quoteStage.movePortrait(Math.max(0, targetPortraitCount - 1));
    }
  };

  const loadModalCeleb = async (celebIdx: number) => {
    const target = celebs[celebIdx];
    if (!target || isModalLoading) return;

    setIsModalLoading(true);
    setModalError(false);
    try {
      const detail = await getCelebForModal(target.id, activeTag.id);
      if (!detail) {
        setModalError(true);
        return;
      }
      setModalCeleb(detail);
      setModalCelebIdx(celebIdx);
    } catch (error) {
      console.error("[FactionShowcase] Failed to load celeb detail:", error);
      setModalError(true);
    } finally {
      setIsModalLoading(false);
    }
  };

  const openModal = () => {
    if (current.type !== "celeb") return;
    void loadModalCeleb(current.celebIdx);
  };

  // ── 좌측 화면 ──
  // 고른 항목이 묶음이면 구성원 출연진 판을, 사람이면 그 사람의 화보를 크게 건다
  const teamImage = current.type === "team" ? teamImages[current.imageIdx] ?? null : null;
  const teamImageLabel =
    (locale === "en" ? teamImage?.labelEn : teamImage?.label)?.trim() || null;
  // 묶음 구성원을 자리 번호로 바꾼다 — 얼굴을 눌러 그 사람으로 넘어가기 위해서다
  const teamImageMembers = (teamImage?.celebIds ?? [])
    .map(id => items.findIndex(it => it.type === "celeb" && it.celeb.id === id))
    .filter(i => i >= 0)
    .map(itemIdx => ({ celeb: (items[itemIdx] as { celeb: FeaturedCeleb }).celeb, itemIdx }));
  const celebSrc = current.type === "celeb"
    ? portraitImages[Math.min(activePortraitIndex, Math.max(0, portraitImages.length - 1))]?.url
      ?? current.celeb.faction_image_url
      ?? current.celeb.avatar_url
    : null;
  const photoSrc = celebSrc;
  /** 팩션 화보가 하나도 없어 프로필 얼굴 사진으로 대신하는 인물인지 */
  const usesAvatarFallback = current.type === "celeb" && !portraitImages.length && !!celebSrc;

  // ── 세력(그룹) 항목 ──
  // 소속 인물을 자리 번호와 함께 푼다 — 명단 칩을 눌러 그 사람으로 건너뛰기 위해서다
  const groupMembers: { celeb: FeaturedCeleb; itemIdx: number }[] =
    current.type === "group"
      ? current.memberItemIdxs.flatMap((itemIdx) => {
          const it = items[itemIdx];
          return it?.type === "celeb" ? [{ celeb: it.celeb, itemIdx }] : [];
        })
      : [];
  const groupLabel =
    current.type === "group"
      ? (locale === "en" ? current.labelEn : current.label)?.trim() || null
      : null;
  const groupSubtitle =
    current.type === "group"
      ? (locale === "en" ? current.subtitleEn : current.subtitle)?.trim() || null
      : null;
  // 세력 고유 색·로고(제작 브랜드 자산) — 없으면 테마 색으로
  const groupColor = current.type === "group" ? current.color ?? activeTag.color : activeTag.color;
  const groupLogo = current.type === "group" ? current.logoUrl : null;
  const lineupMembers = current.type === "group" ? groupMembers : teamImageMembers;
  const toLineupMember = ({ celeb, itemIdx }: { celeb: FeaturedCeleb; itemIdx: number }): FactionLineupMember => ({
    id: celeb.id,
    name: localizedCelebName(celeb),
    role: roleOf(celeb),
    avatarUrl: celeb.avatar_url,
    influence: celeb.influence,
    itemIndex: itemIdx,
  });
  const currentCelebName = current.type === "celeb" ? localizedCelebName(current.celeb) : null;
  const fallbackInitial =
    current.type === "team" ? teamName[0] : current.type === "group" ? (groupLabel ?? teamName)[0] : currentCelebName?.[0];
  const photoAlt = current.type === "celeb" ? currentCelebName ?? teamName : current.type === "group" ? groupLabel ?? teamName : teamName;
  const currentListOrdinalParts = listOrdinalLabels.get(selectedIdx)?.split("-") ?? [];
  const currentImageOrdinal = current.type === "celeb"
    ? `${currentListOrdinalParts[0] ?? current.celebIdx + 1}-${currentListOrdinalParts[1] ?? 1}-${Math.min(activePortraitIndex, Math.max(0, portraitImages.length - 1)) + 1}`
    : null;

  const selectAdjacentPortrait = (direction: -1 | 1) => {
    if (current.type !== "celeb" || portraitImages.length <= 1) {
      selectAdjacentSlide(direction, direction === -1 ? "last" : "first");
      return;
    }

    const next = activePortraitIndex + direction;
    if (next < 0) {
      selectAdjacentSlide(-1, "last");
      return;
    }
    if (next >= portraitImages.length) {
      selectAdjacentSlide(1);
      return;
    }

    quoteStage.movePortrait(next);
  };

  const longDesc =
    current.type === "celeb"
      ? (locale === "en" ? current.celeb.long_desc_en : current.celeb.long_desc)
      : null;
  const celebTitle = current.type === "celeb" ? roleOf(current.celeb) : null;

  const mobileInfo = variant !== "embedded" ? null : current.type === "team" ? (
    <FactionMobileInfoPanel
      kind="team"
      eyebrow={teamImageLabel ? teamName : t("groupShot")}
      title={teamImageLabel ?? teamName}
      description={teamDesc}
      meta={teamImageMembers.length > 0 ? t("figureCount", { count: teamImageMembers.length }) : null}
      accentColor={activeTag.color}
    />
  ) : current.type === "celeb" && currentCelebName ? (
    <FactionMobileInfoPanel
      kind="celeb"
      eyebrow={t("personShot")}
      title={currentCelebName}
      subtitle={celebTitle}
      description={longDesc}
      accentColor={activeTag.color}
      detailLabel={t("viewDetail")}
      detailLoading={isModalLoading}
      detailError={modalError ? t("detailUnavailable") : null}
      onOpenDetail={openModal}
    />
  ) : null;

  const photo = (
    <div
      onClick={quoteStage.handleSurfaceClick}
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-[#0a0a0a] ring-1 ring-white/10",
        current.type === "celeb" && variant === "embedded"
          ? "aspect-[4/5] md:aspect-square"
          : current.type === "team" && variant === "embedded"
            ? "aspect-[4/3] md:aspect-square"
            : "aspect-square",
        current.type === "celeb" && factionQuote && "cursor-pointer hover:ring-accent/50 active:ring-accent/70",
        isFactionQuoteVisible && "ring-accent/40"
      )}
    >
      {current.type === "group" || current.type === "team" ? (
        /* 묶음·세력 — 단체샷 대신 구성원 얼굴을 모은 출연진 판. 얼굴을 누르면 그 인물로 넘어간다 */
        <FactionMemberLineup
          eyebrow={current.type === "group" && current.overview ? t("factionRoster") : teamName}
          title={(current.type === "group" ? groupLabel : teamImageLabel) ?? teamName}
          subtitle={groupSubtitle}
          color={groupColor}
          logoUrl={groupLogo}
          members={lineupMembers.map(toLineupMember)}
          countLabel={t("figureCount", { count: lineupMembers.length })}
          onSelect={selectItem}
        />
      ) : current.type === "celeb" && portraitImages.length ? (
        <>
          {/* 다음 화보까지 미리 겹쳐 두고 opacity만 바꾼다. 교체 순간의 흰 프레임·점프를 없앤다. */}
          {portraitImages.map((portrait, index) => {
            const isActive = index === activePortraitIndex;
            // 한 사진의 체류시간이 아니라 전체 오디오 길이를 기준으로 같은 느린 줌 속도를 유지한다.
            // 단일 화보는 대사 종료 시 1.04배에 닿고, 다중 화보는 교체 때 같은 속도로 다시 시작한다.
            const zoomDuration = quoteMedia?.duration && quoteMedia.duration > 0
              ? quoteMedia.duration
              : 8;
            const focus = portrait.focus ?? { x: 50, y: 50 };
            const maxShift = (50 * 0.04) / 1.04;
            const shiftX = Math.max(-maxShift, Math.min(maxShift, (50 - focus.x) * 0.12));
            const shiftY = Math.max(-maxShift, Math.min(maxShift, (50 - focus.y) * 0.12));
            return (
              <div
                key={`${current.celeb.id}-${portrait.url}-${index}`}
                aria-hidden={!isActive}
                className={cn(
                  "absolute inset-0 will-change-[opacity] transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              >
                <BlurDissolve className="absolute inset-0">
                  <Image
                    src={portrait.url}
                    alt=""
                    fill
                    unoptimized
                    aria-hidden
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="scale-110 object-cover opacity-40 blur-2xl"
                  />
                  <Image
                    src={portrait.url}
                    alt={isActive ? photoAlt : ""}
                    fill
                    unoptimized
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, 600px"
                    className={cn(
                      "object-contain",
                      // 이미 지나간 레이어도 페이드아웃 중에는 확대 상태를 유지해야 교체 직전 역줌이 생기지 않는다.
                      isFactionQuoteVisible && index <= activePortraitIndex && "animate-faction-portrait-push-in"
                    )}
                    style={{
                      animationDuration: `${zoomDuration}s`,
                      transformOrigin: "50% 50%",
                      "--faction-portrait-shift-x": `${shiftX}%`,
                      "--faction-portrait-shift-y": `${shiftY}%`,
                    } as CSSProperties}
                  />
                </BlurDissolve>
              </div>
            );
          })}
          <div
            className={cn(
              "absolute inset-0",
              variant === "embedded" ? "bg-black/5 md:bg-black/20" : "bg-black/20",
            )}
          />
        </>
      ) : photoSrc ? (
        <BlurDissolve key={photoSrc} className="absolute inset-0">
          {/* 흐린 배경으로 여백을 메우고, 전경은 잘림 없이 노출 */}
          <Image src={photoSrc} alt="" fill unoptimized aria-hidden className="object-cover scale-110 blur-2xl opacity-40" />
          <div
            className={cn(
              "absolute inset-0",
              variant === "embedded" ? "bg-black/5 md:bg-black/20" : "bg-black/20",
            )}
          />
          {/*
            팩션 화보가 없어 얼굴 사진으로 대신하는 인물은 사진이 정사각이라 액자를 꽉 채운다.
            그러면 아래쪽 이름·소개 글이 턱과 입을 덮는다(좁은 화면에서 글이 사진의 42%를 차지한다).
            그래서 얼굴만 글 위쪽에 앉히고, 여백은 뒤의 흐린 배경이 메운다.
          */}
          {/* 자리를 상태에 따라 옮기지 않는다 — 사진이 오르내리면 어지럽고, 전환이 어긋나면 어중간한 데 멈춘다 */}
          <div
            className={cn(
              "absolute inset-x-0 top-0",
              usesAvatarFallback
                ? variant === "embedded"
                  ? "bottom-0 md:bottom-44"
                  : "bottom-44"
                : "bottom-0",
            )}
          >
            <Image
              src={photoSrc}
              alt={photoAlt}
              fill
              unoptimized
              priority
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-contain"
            />
          </div>
        </BlurDissolve>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 30% 25%, ${activeTag.color}40, #0a0a0a 70%)` }}
        >
          <span className="font-serif font-black text-white/25 text-8xl">{fallbackInitial}</span>
        </div>
      )}

      {currentImageOrdinal && (
        <div
          className="absolute left-3 top-3 z-30 rounded-md border border-accent/50 bg-black/80 px-2.5 py-1.5 font-cinzel text-sm font-black tracking-[0.08em] text-accent shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
          aria-label={t("imageOrdinal", { ordinal: currentImageOrdinal })}
          title={t("imageOrdinalTitle")}
        >
          {currentImageOrdinal}
        </div>
      )}

      {/* 묶음·세력 선택 시 정보·명단은 출연진 판이 전부 담는다 — 하단 오버레이 없음 */}

      {/* 인물 선택의 정보와 행동은 화보 한 장 안에서 끝낸다. */}
      {current.type === "celeb" && !isFactionQuoteVisible && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 cursor-text select-text bg-gradient-to-t from-black via-black/90 to-transparent px-5 pb-5 pt-24 selection:bg-accent/45 selection:text-white md:px-6 md:pb-6 md:pt-32",
            variant === "embedded" && "hidden md:block",
          )}
        >
          <div className="flex items-center gap-2.5">
            <h3 className="font-serif text-2xl font-black leading-tight text-white md:text-3xl">
              {currentCelebName}
            </h3>
            {/* 인물 상세 열기 — 이름 옆 인물 카드 아이콘 하나로 */}
            <CelebDetailCardButton
              label={t("viewDetail")}
              loading={isModalLoading}
              onClick={openModal}
              size="compact"
              iconSize={16}
            />
          </div>
          {celebTitle && (
            <p className="mt-1 break-keep text-[13px] font-semibold tracking-wide text-white/75">
              {celebTitle}
            </p>
          )}
          {longDesc && (
            <p
              ref={introRef}
              className={cn(
                "mt-2 text-sm leading-6 text-white/78 break-keep md:text-[15px]",
                // 펼치면 사진을 다 덮지 않도록 높이를 묶고 그 안에서 굴린다
                isInfoExpanded ? "max-h-40 overflow-y-auto pr-1" : "line-clamp-2"
              )}
            >
              {longDesc}
            </p>
          )}
          {/*
            두 줄에서 잘린 소개만 여기서 펼쳐 끝까지 읽고 다시 접는다.
            다 보이는 글에는 단추를 달지 않는다 — 눌러도 아무 일이 없어 고장으로 읽힌다.
          */}
          {longDesc && (isIntroClipped || isInfoExpanded) && (
            <button
              type="button"
              onClick={() => setIsInfoExpanded((prev) => !prev)}
              className="mt-1 inline-flex items-center gap-1 rounded text-[12px] font-bold tracking-wide text-accent/90 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {isInfoExpanded ? t("collapseIntro") : t("expandIntro")}
              {isInfoExpanded ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />}
            </button>
          )}
          {modalError && (
            <p role="alert" className="mt-2 text-xs leading-5 text-red-200">
              {t("detailUnavailable")}
            </p>
          )}
        </div>
      )}

      {current.type === "celeb" && factionQuote && isFactionQuoteVisible && (
        <FactionQuoteOverlay
          stage={quoteStage}
          labels={{ tapForNextLine: t("tapForNextLine"), tapToCloseQuote: t("tapToCloseQuote") }}
        />
      )}

    </div>
  );

  const faceOf = (celeb: FeaturedCeleb) => ({ id: celeb.id, url: celeb.avatar_url, name: localizedCelebName(celeb) });
  // 묶음과 세력 머리글은 같은 위계라 목록에서도 같은 얼굴 카드로 선다
  const rosterEntries: FactionRosterEntry[] = items.map((item, idx) => {
    if (item.type === "group") {
      const title =
        (locale === "en" ? item.labelEn : item.label)?.trim() ||
        (locale === "en" ? t("unnamedFaction") : item.label);

      return {
        key: `group-${item.label}-${idx}`,
        itemIndex: idx,
        kind: "group",
        title,
        faces: item.memberItemIdxs.flatMap((memberIdx) => {
          const member = items[memberIdx];
          return member?.type === "celeb" ? [faceOf(member.celeb)] : [];
        }),
      };
    }

    if (item.type === "team") {
      const teamImage = teamImages[item.imageIdx];
      const imageLabel = (locale === "en" ? teamImage?.labelEn : teamImage?.label)?.trim() || null;

      return {
        key: `team-${item.imageIdx}`,
        itemIndex: idx,
        kind: "group",
        title: imageLabel ?? teamName,
        faces: (teamImage?.celebIds ?? []).flatMap((id) => {
          const celeb = celebs.find((c) => c.id === id);
          return celeb ? [faceOf(celeb)] : [];
        }),
      };
    }

    const meta = roleOf(item.celeb);
    const hasVoice = Boolean(item.celeb.faction_quote_media?.audioUrl)
      && item.celeb.faction_quote_media?.locale === locale;

    return {
      key: item.celeb.id,
      itemIndex: idx,
      kind: "celeb",
      title: localizedCelebName(item.celeb),
      meta,
      hasVoice,
    };
  });

  const roster = (
    <FactionRoster
      entries={rosterEntries}
      selectedIndex={selectedIdx}
      rosterLabel={t("factionRoster")}
      voiceLabel={t("hasVoice")}
      accentColor={activeTag.color}
      containerRef={listRef}
      registerItemRef={(index, element) => {
        listItemRefs.current[index] = element;
      }}
      onSelect={selectItem}
    />
  );

  // ── 독립 세력도감의 기존 화보형 우측 목록 ──
  const list = roster;

  return (
    <div className="mx-auto w-full max-w-5xl px-0 md:px-4">
      <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-center">
        {/* 임베디드는 명단 다음, 독립 화면은 기존처럼 먼저 나오는 화보 + 정보 */}
        <div
          className={cn(
            "flex w-full flex-col gap-5",
            variant === "embedded"
              ? "order-2 mx-auto max-w-[760px] md:mx-0 md:w-[60%] md:max-w-[560px]"
              : "md:w-[56%] md:max-w-[560px]",
          )}
        >
          <div className="flex flex-col gap-2">
            {photo}
            <div
              role="group"
              className="flex h-12 items-center justify-center gap-1 rounded-xl border border-white/10 bg-[#111211] px-2 shadow-[0_10px_28px_rgba(0,0,0,0.24)]"
              aria-label={t("imageControls")}
            >
              <button
                type="button"
                aria-label={t("previousFigureOrGroup")}
                title={t("previousFigureOrGroup")}
                disabled={items.length <= 1}
                onClick={() => selectAdjacentSlide(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-accent active:bg-white/15 disabled:pointer-events-none disabled:text-white/20"
              >
                <ChevronsLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t("previousPhoto")}
                title={t("previousPhoto")}
                disabled={portraitImages.length <= 1 && items.length <= 1}
                onClick={() => selectAdjacentPortrait(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-accent active:bg-white/15 disabled:pointer-events-none disabled:text-white/20"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={isFactionQuoteVisible ? t("pauseQuote") : hasPlayableQuoteAudio ? t("playQuote") : t("showQuote")}
                title={isFactionQuoteVisible ? t("pauseQuote") : hasPlayableQuoteAudio ? t("playQuote") : t("showQuote")}
                disabled={current.type !== "celeb" || !factionQuote}
                onClick={quoteStage.toggle}
                className="mx-1 flex h-10 w-12 items-center justify-center rounded-lg border border-accent/35 bg-accent/10 text-accent hover:border-accent/70 hover:bg-accent/20 active:bg-accent/25 disabled:pointer-events-none disabled:border-white/10 disabled:bg-transparent disabled:text-white/20"
              >
                {isFactionQuoteVisible ? (
                  <Pause className="h-5 w-5" fill="currentColor" aria-hidden />
                ) : (
                  <Play className="h-5 w-5" fill="currentColor" aria-hidden />
                )}
              </button>
              <button
                type="button"
                aria-label={t("nextPhoto")}
                title={t("nextPhoto")}
                disabled={portraitImages.length <= 1 && items.length <= 1}
                onClick={() => selectAdjacentPortrait(1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-accent active:bg-white/15 disabled:pointer-events-none disabled:text-white/20"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t("nextFigureOrGroup")}
                title={t("nextFigureOrGroup")}
                disabled={items.length <= 1}
                onClick={() => selectAdjacentSlide(1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-accent active:bg-white/15 disabled:pointer-events-none disabled:text-white/20"
              >
                <ChevronsRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
          {mobileInfo}
          {/*
            이 테마를 다룬 세력도감 영상과 그 구간에 흐르는 배경음악. 고른 항목이 사람이든 단체든
            테마 자체의 것이라 선택과 무관하게 같은 자리에 둔다. 없으면 아무것도 뜨지 않는다.
          */}
          <FactionMediaLinks
            videos={activeTag.videos}
            music={activeTag.music}
            title={teamName}
            atlasLink={variant === "embedded" && activeTag.slug && atlasLinkLabel
              ? { href: `/explore/faction/${activeTag.slug}`, label: atlasLinkLabel }
              : undefined}
          />
        </div>
        {/* 임베디드는 PC 좌측·모바일 상단, 독립 화면은 기존 우측 명단 */}
        <div
          className={cn(
            "mx-auto w-full",
            variant === "embedded"
              ? "order-1 max-w-[760px] md:mx-0 md:w-[36%] md:max-w-[360px]"
              : "max-w-[400px] md:mx-0 md:w-[40%]",
          )}
        >
          {list}
        </div>
      </div>

      {/* 인물 상세 모달 */}
      {modalCeleb && (
        <Suspense
          fallback={
            <div
              className="fixed inset-0 grid place-items-center bg-black/75 backdrop-blur-sm"
              style={{ zIndex: Z_INDEX.modal }}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3 border border-white/15 bg-bg-main px-5 py-4 text-sm font-semibold text-white">
                <LoaderCircle size={18} className="animate-spin text-accent" aria-hidden />
                {t("loadingDetail")}
              </div>
            </div>
          }
        >
          <CelebDetailModal
            celeb={modalCeleb}
            isOpen={!!modalCeleb}
            onClose={() => {
              setModalCeleb(null);
              setModalCelebIdx(-1);
            }}
            onNavigate={(dir) => {
              const next = dir === "prev" ? modalCelebIdx - 1 : modalCelebIdx + 1;
              if (next >= 0 && next < celebs.length) {
                void loadModalCeleb(next);
              }
            }}
            hasPrev={modalCelebIdx > 0}
            hasNext={modalCelebIdx < celebs.length - 1}
          />
        </Suspense>
      )}
    </div>
  );
}
