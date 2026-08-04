"use client";

import { useEffect, useState, useRef, lazy, Suspense, type CSSProperties, type MouseEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users, UserRound, Images, LoaderCircle, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import type { CelebProfile } from "@/types/home";
import { Z_INDEX } from "@/constants/zIndex";
import { toTeamImages } from "@feelandnote/shared/lib/faction-team-image";
import FactionMediaLinks from "@/components/features/faction/FactionMediaLinks";

const CelebDetailModal = lazy(() => import("@/components/features/celeb/modals/CelebDetailModal"));

const CAPTION_TRANSITION_SEC = 0.42;
// 전환을 발화 시점에 시작하면 fade-in만큼 늦게 읽힌다. 새 문장이 거의 완성된 상태로 발화에 닿게 앞당긴다.
const CAPTION_TRANSITION_LEAD_SEC = 0.2;
const PORTRAIT_TRANSITION_LEAD_SEC = 0.4;
// 화면 클릭 음성 재생을 먼저 검증하는 동안 기존 대사 자막 오버레이는 코드만 보존하고 숨긴다.
const SHOW_FACTION_QUOTE_OVERLAY = false;

/*
  세력도감 쇼케이스.
  단체샷과 개인샷을 한 도화지에서 함께 다룬다.
  - 좌측: 선택된 항목의 사진(단체샷 또는 개인샷) + 제목 + 설명
  - 우측: 단체 + 인물들을 한 리스트로. 맨 위가 단체(기본 선택), 아래가 인물.
  리스트에서 항목을 고르면 좌측 사진과 설명이 그 항목으로 바뀐다.
*/
interface FactionShowcaseProps {
  activeTag: FeaturedTag;
  locale: Locale;
}

type ShowcaseItem =
  | { type: "team"; imageIdx: number }
  | { type: "celeb"; celeb: FeaturedCeleb; celebIdx: number; nested: boolean }
  /*
    세력(그룹) 머리글 — 목록에선 가로선+라벨 한 줄이지만, 고르면 좌측 큰 화면에
    소속 인물 얼굴 격자와 세력 소개(이름·부제·인원·명단)가 뜨는 정식 항목이다.
    memberItemIdxs 는 소속 인물 항목의 자리 번호 — 명단에서 이름을 눌러 건너뛰는 데 쓴다.
  */
  | {
      type: "group";
      label: string;
      labelEn: string | null;
      subtitle: string | null;
      subtitleEn: string | null;
      color: string | null;
      logoUrl: string | null;
      memberItemIdxs: number[];
    };

export default function FactionShowcase({ activeTag, locale }: FactionShowcaseProps) {
  const t = useTranslations("landing");
  const localizedCelebName = (celeb: FeaturedCeleb) =>
    locale === "en" ? celeb.nickname_en?.trim() || t("unknownFigure") : celeb.nickname;

  const celebs = activeTag.celebs;
  /*
    한 번 더 정규화한다 — 화면 저장분(캐시)에는 「주소만 있는」 옛 형태가 남아 있을 수 있고,
    그걸 새 형태로 읽으면 사진이 통째로 사라진다. 두 형태를 다 받는 자리를 여기 둔다.
  */
  const teamImages = toTeamImages(activeTag.team_images);
  const hasTeam = teamImages.length > 0;
  const teamName = locale === "en" ? activeTag.name_en?.trim() || t("unnamedFaction") : activeTag.name;
  const teamDesc = locale === "en" ? activeTag.description_en : activeTag.description;

  /*
    목록은 「단체 사진 한 장 + 그 사진에 나오는 사람들」을 한 덩어리로 세운다.

    사진은 테마 전체가 아니라 그 안의 한 무리를 찍은 것이다(앤트로픽 12명 중 "안전을 설계한
    사람들" 3명). 그래서 사진을 위에 따로 얹고 명단을 그 아래 통으로 늘어놓으면, 사진과 사람이
    서로 남남으로 보인다. 사진 아래에 그 사진의 사람만 매달아 소속이 눈에 보이게 한다.

    어느 사진에도 안 걸린 사람은 맨 아래 모으되, 세력(그룹) 이름이 있으면 세력 머리글 항목으로
    묶어 보여준다. 머리글도 고를 수 있는 항목이라 자리 번호를 갖는다. 사진이 한 장도 없는 테마도
    같은 방식으로 세력별로 묶는다 — 세력이 하나뿐이거나 세력 정보가 아예 없으면 예전 모습(평면
    명단) 그대로다. 단체샷이 있는 세력은 사진 항목이 그 역할을 하므로 머리글을 이중으로 세우지
    않는다(머리글은 사진에 안 매달린 잔여 인물 묶음에만 선다).
  */
  const items: ShowcaseItem[] = [];
  const placed = new Set<string>();

  const pushCeleb = (celeb: FeaturedCeleb, celebIdx: number, nested: boolean) => {
    items.push({ type: "celeb", celeb, celebIdx, nested });
  };

  teamImages.forEach((img, imageIdx) => {
    items.push({ type: "team", imageIdx });
    for (const id of img.celebIds ?? []) {
      if (placed.has(id)) continue;
      const celebIdx = celebs.findIndex(c => c.id === id);
      if (celebIdx < 0) continue;
      placed.add(id);
      pushCeleb(celebs[celebIdx], celebIdx, true);
    }
  });

  // 어느 사진에도 안 걸린 나머지 인물들
  const rest = celebs
    .map((celeb, celebIdx) => ({ celeb, celebIdx }))
    .filter(({ celeb }) => !placed.has(celeb.id));

  // 세력 머리글을 쓸지 — 사진이 있으면 세력 하나만 있어도 묶고,
  // 사진이 없으면 세력이 둘 이상일 때만 묶는다(하나뿐이면 머리글이 소음이다)
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
        pushCeleb(celeb, celebIdx, false);
      });
    }
    // 세력 정보가 없는 인물(수동 배정)은 맨 뒤에 머리글 없이
    unlabeled.forEach(({ celeb, celebIdx }) => pushCeleb(celeb, celebIdx, false));
  }

  /** 단체샷 자리 번호 — 상단 단체샷 점 표시가 해당 항목을 선택할 때 쓴다. */
  const teamItemIdxs = items.flatMap((it, i) => (it.type === "team" ? [i] : []));
  /** 목록 번호 — 단체샷 N 아래 인물은 N-1, N-2처럼 부모 번호를 이어받는다. */
  const listOrdinalLabels = new Map<number, string>();
  let activeTeamOrdinal: number | null = null;
  let teamOrdinal = 0;
  let memberOrdinal = 0;
  let standaloneOrdinal = 0;
  items.forEach((item, itemIdx) => {
    if (item.type === "team") {
      activeTeamOrdinal = ++teamOrdinal;
      memberOrdinal = 0;
      listOrdinalLabels.set(itemIdx, String(activeTeamOrdinal));
      return;
    }
    if (item.type === "group") {
      activeTeamOrdinal = null;
      memberOrdinal = 0;
      return;
    }
    if (item.nested && activeTeamOrdinal !== null) {
      listOrdinalLabels.set(itemIdx, `${activeTeamOrdinal}-${++memberOrdinal}`);
      return;
    }
    listOrdinalLabels.set(itemIdx, String(++standaloneOrdinal));
  });
  /** 전체 슬라이드 — 그룹 소개는 빼되 단체샷과 인물을 화면 순서 그대로 순회한다. */
  const slideItemIdxs = items.flatMap((it, i) => (it.type === "team" || it.type === "celeb" ? [i] : []));

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [modalCeleb, setModalCeleb] = useState<CelebProfile | null>(null);
  const [modalCelebIdx, setModalCelebIdx] = useState(-1);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState(false);
  const [activePortraitIndex, setActivePortraitIndex] = useState(0);
  const activePortraitIndexRef = useRef(0);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(-1);
  const activeCaptionIndexRef = useRef(-1);
  const [isFactionQuoteVisible, setIsFactionQuoteVisible] = useState(false);
  const factionAudioRef = useRef<HTMLAudioElement | null>(null);
  const factionAudioRafRef = useRef<number | null>(null);
  const factionQuoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopFactionQuote = () => {
    if (factionAudioRafRef.current !== null) {
      cancelAnimationFrame(factionAudioRafRef.current);
      factionAudioRafRef.current = null;
    }
    if (factionQuoteTimerRef.current !== null) {
      clearTimeout(factionQuoteTimerRef.current);
      factionQuoteTimerRef.current = null;
    }
    factionAudioRef.current?.pause();
    factionAudioRef.current = null;
    activePortraitIndexRef.current = 0;
    activeCaptionIndexRef.current = -1;
    setActivePortraitIndex(0);
    setActiveCaptionIndex(-1);
    setIsFactionQuoteVisible(false);
  };

  useEffect(() => () => {
    factionAudioRef.current?.pause();
    if (factionAudioRafRef.current !== null) cancelAnimationFrame(factionAudioRafRef.current);
    if (factionQuoteTimerRef.current !== null) clearTimeout(factionQuoteTimerRef.current);
  }, []);

  // 테마 전환 시 상태 초기화는 부모가 key={activeTag.id}로 재마운트해 처리한다.
  const current = items[selectedIdx] ?? items[0];

  if (!current) return null;

  // 리스트 클릭: 좌측 화보·설명·팩션 대사를 한 번에 전환한다.
  const selectItem = (idx: number) => {
    stopFactionQuote();
    setSelectedIdx(idx);
    setModalError(false);
  };

  const currentSlideIdx = slideItemIdxs.indexOf(selectedIdx);
  const selectAdjacentSlide = (direction: -1 | 1, portraitEdge: "first" | "last" = "first") => {
    if (slideItemIdxs.length === 0) return;

    let nextSlideIdx: number;
    if (currentSlideIdx >= 0) {
      nextSlideIdx = (currentSlideIdx + direction + slideItemIdxs.length) % slideItemIdxs.length;
    } else if (direction === 1) {
      const nextAfterGroup = slideItemIdxs.findIndex((itemIdx) => itemIdx > selectedIdx);
      nextSlideIdx = nextAfterGroup >= 0 ? nextAfterGroup : 0;
    } else {
      nextSlideIdx = slideItemIdxs.length - 1;
      for (let i = 0; i < slideItemIdxs.length; i += 1) {
        if (slideItemIdxs[i] >= selectedIdx) break;
        nextSlideIdx = i;
      }
    }

    const targetItemIdx = slideItemIdxs[nextSlideIdx];
    selectItem(targetItemIdx);

    if (portraitEdge === "last") {
      const targetItem = items[targetItemIdx];
      const targetPortraitCount = targetItem?.type === "celeb"
        ? targetItem.celeb.faction_quote_media?.images.length
          || (targetItem.celeb.faction_image_url || targetItem.celeb.avatar_url ? 1 : 0)
        : 0;
      const targetPortraitIndex = Math.max(0, targetPortraitCount - 1);
      activePortraitIndexRef.current = targetPortraitIndex;
      setActivePortraitIndex(targetPortraitIndex);
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

  // ── 좌측 사진 ──
  // 고른 항목이 사진이면 그 사진을, 사람이면 그 사람의 화보를 크게 건다
  const teamSlide = current.type === "team" ? current.imageIdx : 0;
  const teamImage = hasTeam ? teamImages[teamSlide] ?? teamImages[0] : null;
  const teamSrc = teamImage?.url ?? null;
  const teamImageLabel =
    (locale === "en" ? teamImage?.labelEn : teamImage?.label)?.trim() || null;
  // 사진에 나오는 인물을 자리 번호로 바꾼다 — 이름을 눌러 그 사람으로 넘어가기 위해서다
  const teamImageMembers = (teamImage?.celebIds ?? [])
    .map(id => items.findIndex(it => it.type === "celeb" && it.celeb.id === id))
    .filter(i => i >= 0)
    .map(itemIdx => ({ celeb: (items[itemIdx] as { celeb: FeaturedCeleb }).celeb, itemIdx }));
  const quoteMedia = current.type === "celeb" ? current.celeb.faction_quote_media : null;
  const hasPlayableQuoteAudio = Boolean(quoteMedia?.audioUrl && quoteMedia.locale === locale);
  // 배포 직후 서버 캐시에 남은 구형 재생 묶음에는 captions 키가 없을 수 있다.
  const quoteCaptions = quoteMedia?.locale === locale ? quoteMedia.captions ?? [] : [];
  const portraitImages = current.type === "celeb" && quoteMedia?.images.length
    ? quoteMedia.images
    : current.type === "celeb" && current.celeb.faction_image_url
      ? [{ url: current.celeb.faction_image_url, at: 0 }]
      : [];
  const celebSrc = current.type === "celeb"
    ? portraitImages[Math.min(activePortraitIndex, Math.max(0, portraitImages.length - 1))]?.url
      ?? current.celeb.faction_image_url
      ?? current.celeb.avatar_url
    : null;
  const photoSrc = current.type === "team" ? teamSrc : celebSrc;

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
  const currentCelebName = current.type === "celeb" ? localizedCelebName(current.celeb) : null;
  const fallbackInitial =
    current.type === "team" ? teamName[0] : current.type === "group" ? (groupLabel ?? teamName)[0] : currentCelebName?.[0];
  const photoAlt = current.type === "celeb" ? currentCelebName ?? teamName : current.type === "group" ? groupLabel ?? teamName : teamName;
  const currentListOrdinalParts = listOrdinalLabels.get(selectedIdx)?.split("-") ?? [];
  const currentImageOrdinal = current.type === "celeb"
    ? `${currentListOrdinalParts[0] ?? current.celebIdx + 1}-${currentListOrdinalParts[1] ?? 1}-${Math.min(activePortraitIndex, Math.max(0, portraitImages.length - 1)) + 1}`
    : null;

  // 이 인물이 세력도감 영상에서 하는 말. 없으면 아무 표시도 하지 않는다(빈 말풍선을 띄우지 않는다)
  const factionQuote =
    current.type === "celeb"
      ? (locale === "en" ? current.celeb.faction_quote_en : current.celeb.faction_quote)?.trim() || null
      : null;

  const setPortraitForTime = (seconds: number) => {
    if (!portraitImages.length) return;
    let next = 0;
    for (let i = 0; i < portraitImages.length; i += 1) {
      if (portraitImages[i].at <= seconds + PORTRAIT_TRANSITION_LEAD_SEC) next = i;
      else break;
    }
    if (next === activePortraitIndexRef.current) return;
    activePortraitIndexRef.current = next;
    setActivePortraitIndex(next);
  };

  const selectAdjacentPortrait = (direction: -1 | 1) => {
    if (current.type !== "celeb") {
      selectAdjacentSlide(direction, direction === -1 ? "last" : "first");
      return;
    }
    if (portraitImages.length <= 1) {
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

    stopFactionQuote();
    activePortraitIndexRef.current = next;
    setActivePortraitIndex(next);
  };

  const setCaptionForTime = (seconds: number) => {
    if (!quoteCaptions.length) return;
    let next = -1;
    for (let i = 0; i < quoteCaptions.length; i += 1) {
      if (quoteCaptions[i].at <= seconds + CAPTION_TRANSITION_LEAD_SEC) next = i;
      else break;
    }
    if (next === activeCaptionIndexRef.current) return;
    activeCaptionIndexRef.current = next;
    setActiveCaptionIndex(next);
  };

  const visibleFactionQuote = quoteCaptions.length
    ? (activeCaptionIndex >= 0 ? quoteCaptions[activeCaptionIndex]?.text ?? null : null)
    : factionQuote;

  /** 팩션 대사는 전역 게임 대사창을 거치지 않고 화보 안에서 음성·이미지와 함께 재생한다. */
  const fireFactionQuote = () => {
    if (current.type !== "celeb" || !factionQuote) return;
    if (isFactionQuoteVisible) {
      stopFactionQuote();
      return;
    }

    const playableMedia = quoteMedia?.audioUrl && quoteMedia.locale === locale ? quoteMedia : null;
    const audioUrl = playableMedia?.audioUrl;
    activePortraitIndexRef.current = 0;
    activeCaptionIndexRef.current = -1;
    setActivePortraitIndex(0);
    setActiveCaptionIndex(-1);
    setIsFactionQuoteVisible(true);
    setPortraitForTime(0);
    setCaptionForTime(0);

    const startSilentTimeline = () => {
      const fallbackMs = Math.min(10000, Math.max(4200, factionQuote.length * 85));
      const captionMs = quoteCaptions.length
        ? Math.max(0, quoteCaptions[quoteCaptions.length - 1].at * 1000 + 2200)
        : 0;
      const displayMs = Math.max(fallbackMs, captionMs);
      const startedAt = performance.now();
      const tick = () => {
        const seconds = (performance.now() - startedAt) / 1000;
        setPortraitForTime(seconds);
        setCaptionForTime(seconds);
        if (seconds * 1000 < displayMs) {
          factionAudioRafRef.current = requestAnimationFrame(tick);
        }
      };
      factionAudioRafRef.current = requestAnimationFrame(tick);
      factionQuoteTimerRef.current = setTimeout(stopFactionQuote, displayMs);
    };

    if (!playableMedia || !audioUrl) {
      startSilentTimeline();
      return;
    }

    const audio = new Audio(audioUrl);
    audio.volume = 0.7;
    audio.playbackRate = playableMedia.playbackRate || 1;
    factionAudioRef.current = audio;

    const syncPortrait = () => {
      if (factionAudioRef.current !== audio || audio.paused) return;
      const playbackSeconds = audio.currentTime / Math.max(audio.playbackRate, 0.01);
      setPortraitForTime(playbackSeconds);
      setCaptionForTime(playbackSeconds);
      factionAudioRafRef.current = requestAnimationFrame(syncPortrait);
    };

    audio.addEventListener("ended", stopFactionQuote, { once: true });
    audio.addEventListener("error", () => {
      if (factionAudioRef.current !== audio) return;
      factionAudioRef.current = null;
      startSilentTimeline();
    }, { once: true });
    void audio.play().then(() => {
      if (factionAudioRef.current !== audio) return;
      setPortraitForTime(0);
      setCaptionForTime(0);
      factionAudioRafRef.current = requestAnimationFrame(syncPortrait);
    }).catch(() => {
      if (factionAudioRef.current !== audio) return;
      factionAudioRef.current = null;
      startSilentTimeline();
    });
  };

  const handlePhotoClick = (event: MouseEvent<HTMLDivElement>) => {
    if (current.type !== "celeb" || !factionQuote) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button, a")) return;
    fireFactionQuote();
  };
  const longDesc =
    current.type === "celeb"
      ? (locale === "en" ? current.celeb.long_desc_en : current.celeb.long_desc)
      : null;
  // 직함 — 팩션 직함(배정 한 줄 소개, 제작 lines[0]에서 옴)이 있으면 우선, 없으면 프로필 수식어
  const celebTitle =
    current.type === "celeb"
      ? ((locale === "en"
          ? current.celeb.short_desc_en
          : current.celeb.short_desc) ??
          (locale === "en" ? current.celeb.title_en : current.celeb.title))?.trim() || null
      : null;

  const photo = (
    <div
      onClick={handlePhotoClick}
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-xl bg-[#0a0a0a] ring-1 ring-white/10",
        current.type === "celeb" && factionQuote && "cursor-pointer hover:ring-accent/50 active:ring-accent/70",
        isFactionQuoteVisible && "ring-accent/40"
      )}
    >
      {current.type === "group" ? (
        /* 세력 배경 — 인물 사진 없이 인포그래픽으로: 세력 색 광원 + 머리글자 워터마크 + 큰 인원 수치 */
        <div
          aria-hidden
          className="absolute inset-0 animate-fade-in"
          style={{
            background: `radial-gradient(circle at 28% 20%, ${groupColor}4d, transparent 58%), radial-gradient(circle at 80% 88%, ${groupColor}26, #0a0a0a 72%)`,
          }}
        >
          <span
            aria-hidden
            className="absolute -right-4 -top-12 select-none font-serif text-[15rem] font-black leading-none text-white/[0.06]"
          >
            {(groupLabel ?? teamName)[0]}
          </span>

          {/* 세력 로고 — 1:1 크롭본을 우상단에 큼직하게 */}
          {groupLogo && (
            <div className="absolute right-6 top-6 z-10 aspect-square w-24 overflow-hidden rounded-2xl ring-1 ring-white/15 md:right-8 md:top-8 md:w-32">
              <Image src={groupLogo} alt="" fill unoptimized sizes="128px" className="object-cover" />
            </div>
          )}

          <div className="absolute inset-0 flex flex-col p-6 md:p-8">
            {/* 머리 — 테마·세력명·부제 */}
            <span
              className="inline-flex items-center gap-1.5 font-serif text-[11px] font-bold tracking-[0.15em] md:text-xs"
              style={{ color: groupColor }}
            >
              <Users size={13} aria-hidden />
              {teamName}
            </span>
            <h3 className="mt-2 font-serif text-3xl font-black leading-tight text-white md:text-4xl">
              {groupLabel}
            </h3>
            {groupSubtitle && (
              <p className="mt-1.5 break-keep text-sm font-semibold tracking-wide text-white/70">
                {groupSubtitle}
              </p>
            )}
            <span className="mt-4 block h-px w-16" style={{ backgroundColor: groupColor }} />

            {/* 몸통 — 구성원 명단표. 줄을 누르면 그 인물로 넘어간다 */}
            <div className="scrollbar-hidden mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              {groupMembers.map(({ celeb, itemIdx }, i) => {
                const role =
                  ((locale === "en" ? celeb.short_desc_en : celeb.short_desc) ??
                    (locale === "en" ? celeb.title_en : celeb.title))?.trim() || null;
                return (
                  <button
                    key={celeb.id}
                    type="button"
                    onClick={() => selectItem(itemIdx)}
                    className="group/row flex w-full cursor-pointer items-baseline gap-3 border-b border-white/[0.07] py-2.5 text-left"
                  >
                    <span className="w-7 shrink-0 font-serif text-xs font-bold tabular-nums text-white/40 group-hover/row:text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="shrink-0 text-[15px] font-bold text-white/90 group-hover/row:text-accent">
                      {localizedCelebName(celeb)}
                    </span>
                    {role && (
                      <span className="min-w-0 truncate text-xs font-medium text-white/45">{role}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 발치 — 큰 인원 수치 */}
            <p className="mt-3 self-end font-serif text-4xl font-black tabular-nums text-white/85 md:text-5xl">
              {groupMembers.length}
              <span className="ms-1.5 align-baseline text-sm font-bold text-white/50">
                {t("figureUnit")}
              </span>
            </p>
          </div>
        </div>
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
              </div>
            );
          })}
          <div className="absolute inset-0 bg-black/20" />
        </>
      ) : photoSrc ? (
        <>
          {/* 흐린 배경으로 여백을 메우고, 전경은 잘림 없이 노출 */}
          <Image src={photoSrc} alt="" fill unoptimized aria-hidden className="object-cover scale-110 blur-2xl opacity-40" />
          <div className="absolute inset-0 bg-black/20" />
          <Image
            src={photoSrc}
            alt={photoAlt}
            fill
            unoptimized
            priority
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-contain"
          />
        </>
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

      {/* 단체샷 캐러셀 컨트롤 (여러 장일 때) */}
      {current.type === "team" && teamImages.length > 1 && (
        <>
          {/* 장수 카운터 */}
          <div className="absolute right-3 top-3 z-10 hidden items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/90 backdrop-blur-md md:flex">
            <Images size={12} />
            {teamSlide + 1} / {teamImages.length}
          </div>
          {/* 사진끼리 건너뛴다 — 목록에서도 그 사진이 함께 선택된다 */}
          <div className="absolute left-3 top-3 z-20 hidden gap-1.5 md:flex">
            {teamImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={t("photoNumber", { number: i + 1 })}
                onClick={() => selectItem(teamItemIdxs[i])}
                className={cn(
                  "h-2 rounded-full",
                  i === teamSlide ? "bg-accent w-4" : "bg-white/50 w-2 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* 단체샷의 제목·설명·인원도 사진 안에서 끝낸다. */}
      {current.type === "team" && (
        <div className="absolute inset-x-0 bottom-0 z-10 cursor-text select-text bg-gradient-to-t from-black via-black/90 to-transparent px-5 pb-5 pt-24 selection:bg-accent/45 selection:text-white md:px-6 md:pb-6 md:pt-32">
          <span
            className="inline-flex items-center gap-1.5 font-serif text-[11px] font-bold tracking-[0.12em] md:text-xs"
            style={{ color: activeTag.color }}
          >
            <Users size={13} aria-hidden />
            {teamImageLabel ? teamName : t("groupShot")}
          </span>
          <h3 className="mt-1.5 font-serif text-2xl font-black leading-tight text-white md:text-3xl">
            {teamImageLabel ?? teamName}
          </h3>
          {teamDesc && !teamImageLabel && (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/80 break-keep md:text-[15px]">
              {teamDesc}
            </p>
          )}
          {teamImageMembers.length > 0 && (
            <p className="mt-2 text-xs font-semibold text-white/65">
              {t("figureCount", { count: teamImageMembers.length })}
            </p>
          )}
        </div>
      )}

      {/* 세력 선택 시 정보·명단은 캔버스 인포그래픽이 전부 담는다 — 하단 오버레이 없음 */}

      {/* 인물 선택의 정보와 행동은 화보 한 장 안에서 끝낸다. */}
      {current.type === "celeb" && (!SHOW_FACTION_QUOTE_OVERLAY || !isFactionQuoteVisible) && (
        <div className="absolute inset-x-0 bottom-0 z-10 cursor-text select-text bg-gradient-to-t from-black via-black/90 to-transparent px-5 pb-5 pt-24 selection:bg-accent/45 selection:text-white md:px-6 md:pb-6 md:pt-32">
          <div className="flex items-center gap-2.5">
            <h3 className="font-serif text-2xl font-black leading-tight text-white md:text-3xl">
              {currentCelebName}
            </h3>
            {/* 인물 상세 열기 — 이름 옆 프로필 아이콘 하나로 */}
            <button
              type="button"
              onClick={openModal}
              disabled={isModalLoading}
              aria-busy={isModalLoading}
              aria-label={t("viewDetail")}
              title={t("viewDetail")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white/90 hover:border-accent hover:bg-accent hover:text-black disabled:cursor-wait disabled:opacity-60"
            >
              {isModalLoading ? (
                <LoaderCircle size={16} className="animate-spin" aria-hidden />
              ) : (
                <UserRound size={16} aria-hidden />
              )}
            </button>
          </div>
          {celebTitle && (
            <p className="mt-1 text-[13px] font-semibold tracking-wide text-white/75">
              {celebTitle}
            </p>
          )}
          {longDesc && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/78 break-keep md:text-[15px]">
              {longDesc}
            </p>
          )}
          {modalError && (
            <p role="alert" className="mt-2 text-xs leading-5 text-red-200">
              {t("detailUnavailable")}
            </p>
          )}
        </div>
      )}

      {SHOW_FACTION_QUOTE_OVERLAY && current.type === "celeb" && factionQuote && isFactionQuoteVisible && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center overflow-hidden px-7 py-16 md:px-14"
        >
          <figure className="relative w-full max-w-[88%] translate-y-3 animate-fade-in text-center md:max-w-[86%] md:translate-y-5">
            <div className="grid min-h-[5.5rem] place-items-center md:min-h-[7rem]">
              <AnimatePresence initial={false}>
                {visibleFactionQuote && (
                  <motion.blockquote
                    key={activeCaptionIndex}
                    initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
                    transition={{ duration: CAPTION_TRANSITION_SEC, ease: [0.22, 1, 0.36, 1] }}
                    className="col-start-1 row-start-1 break-keep font-serif text-[clamp(1.35rem,4.8vw,1.75rem)] font-bold leading-[1.48] text-[#f2ebe0] md:text-[clamp(1.65rem,2.5vw,2.25rem)]"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,.98), 0 0 24px rgba(0,0,0,.9)" }}
                  >
                    {visibleFactionQuote}
                  </motion.blockquote>
                )}
              </AnimatePresence>
            </div>
          </figure>
        </div>
      )}

    </div>
  );

  // ── 우측 리스트 ──
  const list = (
    <div className="custom-scrollbar mx-auto flex max-h-[min(42svh,360px)] w-full max-w-[400px] flex-col gap-0 overflow-y-scroll overscroll-contain rounded-[22px] border border-white/10 bg-[#111211] p-3 pr-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.24)] md:mx-0 md:max-h-[600px]">
      {items.map((item, idx) => {
        const isSel = idx === selectedIdx;

        // 세력 머리글 — 가로선+라벨 모양은 그대로 두되, 누르면 좌측에 그 세력이 뜬다.
        if (item.type === "group") {
          const headerLabel =
            (locale === "en" ? item.labelEn : item.label)?.trim() ||
            (locale === "en" ? t("unnamedFaction") : item.label);
          return (
            <button
              key={`group-${item.label}`}
              type="button"
              onClick={() => selectItem(idx)}
              className={cn(
                "group mt-4 flex w-full cursor-pointer items-center gap-2 border-y px-2 py-3 text-left first:mt-0",
                isSel
                  ? "border-accent/40 bg-accent/[0.08]"
                  : "border-white/[0.07] bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.04]"
              )}
            >
              <span aria-hidden className="h-5 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? activeTag.color }} />
              {item.logoUrl && (
                <Image src={item.logoUrl} alt="" width={18} height={18} unoptimized className="h-[18px] w-[18px] shrink-0 self-center rounded object-cover" />
              )}
              <span
                className={cn(
                  "font-cinzel text-[10px] font-bold uppercase tracking-widest",
                  isSel ? "text-white" : "text-white/60 group-hover:text-white/90"
                )}
              >
                {headerLabel}
              </span>
            </button>
          );
        }
        const isTeam = item.type === "team";
        const isNested = item.type === "celeb" && item.nested;
        const nextItem = items[idx + 1];
        const isLastNested = isNested && !(nextItem?.type === "celeb" && nextItem.nested);
        const img = isTeam ? teamImages[item.imageIdx] : null;
        // 사진에 무리 이름이 있으면 그것이 제목이다. 없는 옛 사진은 테마 이름으로 대신한다
        const imgLabel = (locale === "en" ? img?.labelEn : img?.label)?.trim() || null;
        const label = isTeam
          ? imgLabel ?? teamName
          : localizedCelebName(item.celeb);
        // 인물 부제 — 팩션 직함(배정 한 줄 소개) 우선, 없으면 프로필 수식어
        const sub = isTeam
          ? null
          : locale === "en"
            ? item.celeb.short_desc_en ?? item.celeb.title_en
            : item.celeb.short_desc ?? item.celeb.title;
        const thumb = isTeam ? img?.url ?? null : item.celeb.avatar_url;
        const assetOrdinal = listOrdinalLabels.get(idx) ?? String(idx + 1);
        const assetTypeLabel = isTeam ? t("groupShot") : t("personShot");
        return (
          <button
            key={isTeam ? `team-${item.imageIdx}` : item.celeb.id}
            type="button"
            onClick={() => selectItem(idx)}
            className={cn(
              "group/entry relative grid cursor-pointer items-stretch gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isTeam
                ? "z-10 mt-4 w-full grid-cols-[96px_minmax(0,1fr)] rounded-2xl border border-accent/20 bg-[linear-gradient(110deg,rgba(212,175,55,0.09),rgba(212,175,55,0.025))] p-2 shadow-[0_14px_28px_rgba(0,0,0,0.2)] first:mt-0 hover:border-accent/45 md:grid-cols-[52px_96px_minmax(0,1fr)]"
                : isNested
                  ? "w-full grid-cols-[74px_minmax(0,1fr)] py-1.5 md:ml-5 md:w-[calc(100%_-_1.25rem)] md:grid-cols-[46px_74px_minmax(0,1fr)]"
                  : "w-full grid-cols-[74px_minmax(0,1fr)] py-1.5 md:grid-cols-[46px_74px_minmax(0,1fr)]"
            )}
          >
            {/* 단체는 장 번호, 개인은 그 장에서 뻗는 연결선 위의 하위 번호로 읽힌다. */}
            <span
              className={cn(
                "relative hidden min-w-0 flex-col items-center justify-center md:flex",
                isTeam
                  ? "h-24 gap-1 rounded-xl border border-accent/20 bg-black/25"
                  : "h-[74px]"
              )}
              aria-hidden
            >
              {isNested && (
                <>
                  <span
                    className={cn(
                      "absolute left-1/2 top-[-14px] w-px bg-accent/25",
                      isLastNested ? "bottom-1/2" : "bottom-[-8px]"
                    )}
                  />
                  <span className="absolute left-1/2 top-1/2 h-px w-1/2 bg-accent/25" />
                </>
              )}
              {isTeam && (
                <span className="text-[9px] font-black leading-none tracking-[0.16em] text-accent/80">
                  {assetTypeLabel}
                </span>
              )}
              <span
                className={cn(
                  "relative z-10 font-cinzel font-black leading-none tabular-nums",
                  isTeam
                    ? "text-3xl text-accent"
                    : "rounded-md border bg-[#111211] px-1.5 py-1 text-[15px]",
                  !isTeam && (isSel
                    ? "border-accent/60 text-accent"
                    : "border-white/10 text-white/48 group-hover/entry:border-white/30 group-hover/entry:text-white")
                )}
              >
                {assetOrdinal}
              </span>
            </span>

            {/* 단체샷은 크고 각진 장표, 개인샷은 작은 하위 초상으로 구분한다. */}
            <span
              className={cn(
                "relative shrink-0 overflow-hidden border bg-neutral-900",
                isTeam ? "h-24 w-24 rounded-xl" : "h-[74px] w-[74px] rounded-lg",
                isSel
                  ? "border-accent shadow-[0_0_0_2px_rgba(212,175,55,0.16)]"
                  : isTeam
                    ? "border-accent/35 shadow-[0_8px_22px_rgba(0,0,0,0.28)] group-hover/entry:border-accent/70"
                    : "border-white/12 group-hover/entry:border-white/35"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute left-1 top-1 z-10 inline-flex min-w-5 items-center justify-center rounded border bg-black/80 px-1 py-0.5 font-cinzel text-[10px] font-black leading-none tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.75)] md:hidden",
                  isTeam || isSel ? "border-accent/60 text-accent" : "border-white/25 text-white/85"
                )}
              >
                {assetOrdinal}
              </span>
              {thumb ? (
                <Image src={thumb} alt={label} fill sizes={isTeam ? "96px" : "74px"} className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-neutral-800">
                  {isTeam ? (
                    <Users size={22} className="text-white/30" />
                  ) : (
                    <span className="font-serif text-xl font-black text-white/25">{label[0]}</span>
                  )}
                </span>
              )}
            </span>

            <span
              className={cn(
                "flex min-w-0 flex-col justify-center border",
                isTeam ? "rounded-xl px-4 py-3" : "rounded-lg px-3 py-2",
                isTeam
                  ? isSel
                    ? "border-accent/65 bg-accent/[0.14]"
                    : "border-accent/25 bg-black/20 group-hover/entry:border-accent/55 group-hover/entry:bg-accent/[0.08]"
                  : isSel
                    ? "border-accent/60 bg-accent/[0.08]"
                    : "border-white/[0.07] bg-white/[0.025] group-hover/entry:border-white/20 group-hover/entry:bg-white/[0.055]"
              )}
            >
              {isTeam ? (
                <span className="line-clamp-3 min-w-0 font-serif text-lg font-black leading-snug text-white">
                  {label}
                </span>
              ) : (
                <>
                  <span
                    className={cn(
                      "line-clamp-1 text-[12px] font-semibold leading-tight tracking-wide",
                      isSel ? "text-accent" : "text-amber-500/75"
                    )}
                  >
                    {sub ?? "\u00a0"}
                  </span>
                  <span
                    className={cn(
                      "mt-1.5 truncate font-serif text-[17px] font-black leading-tight",
                      isSel ? "text-white" : "text-text-secondary"
                    )}
                  >
                    {label}
                  </span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-0 md:px-4">
      <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-center">
        {/* 좌측: 정보가 결합된 사진 + 테마 미디어 */}
        <div className="flex w-full flex-col gap-5 md:w-[56%] md:max-w-[560px]">
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
                disabled={slideItemIdxs.length <= 1}
                onClick={() => selectAdjacentSlide(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-accent active:bg-white/15 disabled:pointer-events-none disabled:text-white/20"
              >
                <ChevronsLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t("previousPhoto")}
                title={t("previousPhoto")}
                disabled={portraitImages.length <= 1 && slideItemIdxs.length <= 1}
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
                onClick={fireFactionQuote}
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
                disabled={portraitImages.length <= 1 && slideItemIdxs.length <= 1}
                onClick={() => selectAdjacentPortrait(1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-accent active:bg-white/15 disabled:pointer-events-none disabled:text-white/20"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t("nextFigureOrGroup")}
                title={t("nextFigureOrGroup")}
                disabled={slideItemIdxs.length <= 1}
                onClick={() => selectAdjacentSlide(1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-accent active:bg-white/15 disabled:pointer-events-none disabled:text-white/20"
              >
                <ChevronsRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
          {/*
            이 테마를 다룬 세력도감 영상과 그 구간에 흐르는 배경음악. 고른 항목이 사람이든 단체든
            테마 자체의 것이라 선택과 무관하게 같은 자리에 둔다. 없으면 아무것도 뜨지 않는다.
          */}
          <FactionMediaLinks videos={activeTag.videos} music={activeTag.music} title={teamName} />
        </div>
        {/* 우측: 단체 + 인물 리스트 */}
        <div className="mx-auto w-full max-w-[400px] md:mx-0 md:w-[40%]">{list}</div>
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
