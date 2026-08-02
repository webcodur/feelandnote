"use client";

import { useState, lazy, Suspense } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Users, UserRound, Volume2, Images, Quote, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import type { CelebProfile } from "@/types/home";
import { Z_INDEX } from "@/constants/zIndex";
import { toTeamImages } from "@feelandnote/shared/lib/faction-team-image";
import FactionMediaLinks from "@/components/features/faction/FactionMediaLinks";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";

const CelebDetailModal = lazy(() => import("@/components/features/celeb/modals/CelebDetailModal"));

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
  onSubtitle?: (data: DialogueSubtitleData) => void;
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

export default function FactionShowcase({ activeTag, locale, onSubtitle }: FactionShowcaseProps) {
  const t = useTranslations("landing");
  const { fireGreeting } = useCelebGreeting({ onSubtitle, locale });

  const celebs = activeTag.celebs;
  /*
    한 번 더 정규화한다 — 화면 저장분(캐시)에는 「주소만 있는」 옛 형태가 남아 있을 수 있고,
    그걸 새 형태로 읽으면 사진이 통째로 사라진다. 두 형태를 다 받는 자리를 여기 둔다.
  */
  const teamImages = toTeamImages(activeTag.team_images);
  const hasTeam = teamImages.length > 0;
  const teamName = locale === "en" ? activeTag.name_en ?? activeTag.name : activeTag.name;
  const teamDesc = locale === "en" ? activeTag.description_en ?? activeTag.description : activeTag.description;

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

  /** 사진 항목의 자리 번호 — 좌우 화살표가 사진에서 사진으로 건너뛰는 데 쓴다 */
  const teamItemIdxs = items.flatMap((it, i) => (it.type === "team" ? [i] : []));

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [modalCeleb, setModalCeleb] = useState<CelebProfile | null>(null);
  const [modalCelebIdx, setModalCelebIdx] = useState(-1);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState(false);

  // 테마 전환 시 상태 초기화는 부모가 key={activeTag.id}로 재마운트해 처리한다.
  const current = items[selectedIdx] ?? items[0];

  if (!current) return null;

  // 리스트 클릭: 좌측 화보·설명·팩션 대사를 한 번에 전환한다.
  const selectItem = (idx: number) => {
    setSelectedIdx(idx);
    setModalError(false);
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
    (locale === "en" ? teamImage?.labelEn ?? teamImage?.label : teamImage?.label)?.trim() || null;
  // 사진에 나오는 인물을 자리 번호로 바꾼다 — 이름을 눌러 그 사람으로 넘어가기 위해서다
  const teamImageMembers = (teamImage?.celebIds ?? [])
    .map(id => items.findIndex(it => it.type === "celeb" && it.celeb.id === id))
    .filter(i => i >= 0)
    .map(itemIdx => ({ celeb: (items[itemIdx] as { celeb: FeaturedCeleb }).celeb, itemIdx }));
  const celebSrc = current.type === "celeb" ? current.celeb.faction_image_url ?? current.celeb.avatar_url : null;
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
      ? (locale === "en" ? current.labelEn ?? current.label : current.label).trim() || current.label
      : null;
  const groupSubtitle =
    current.type === "group"
      ? (locale === "en" ? current.subtitleEn ?? current.subtitle : current.subtitle)?.trim() || null
      : null;
  // 세력 고유 색·로고(제작 브랜드 자산) — 없으면 테마 색으로
  const groupColor = current.type === "group" ? current.color ?? activeTag.color : activeTag.color;
  const groupLogo = current.type === "group" ? current.logoUrl : null;
  // 인물이 속한 세력 색 — 대사 마커 등 인물 화보의 강조는 테마 색이 아니라 제 세력 색을 쓴다
  const celebGroupColor =
    current.type === "celeb" ? current.celeb.group_color ?? activeTag.color : activeTag.color;
  const fallbackInitial =
    current.type === "team" ? teamName[0] : current.type === "group" ? (groupLabel ?? teamName)[0] : current.celeb.nickname[0];
  const photoAlt = current.type === "celeb" ? current.celeb.nickname : current.type === "group" ? groupLabel ?? teamName : teamName;

  // 이 인물이 세력도감 영상에서 하는 말. 없으면 아무 표시도 하지 않는다(빈 말풍선을 띄우지 않는다)
  const factionQuote =
    current.type === "celeb"
      ? (locale === "en" ? current.celeb.faction_quote_en ?? current.celeb.faction_quote : current.celeb.faction_quote)?.trim() || null
      : null;
  const longDesc =
    current.type === "celeb"
      ? (locale === "en"
          ? current.celeb.long_desc_en ?? current.celeb.long_desc
          : current.celeb.long_desc)
      : null;
  // 직함 — 팩션 직함(배정 한 줄 소개, 제작 lines[0]에서 옴)이 있으면 우선, 없으면 프로필 수식어
  const celebTitle =
    current.type === "celeb"
      ? ((locale === "en"
          ? current.celeb.short_desc_en ?? current.celeb.short_desc
          : current.celeb.short_desc) ??
          (locale === "en" ? current.celeb.title_en ?? current.celeb.title : current.celeb.title))?.trim() || null
      : null;

  const photo = (
    <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-[#0a0a0a] ring-1 ring-white/10">
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
                  ((locale === "en" ? celeb.short_desc_en ?? celeb.short_desc : celeb.short_desc) ??
                    (locale === "en" ? celeb.title_en ?? celeb.title : celeb.title))?.trim() || null;
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
                      {locale === "en" ? celeb.nickname_en ?? celeb.nickname : celeb.nickname}
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
                {locale === "en" ? "FIGURES" : "명"}
              </span>
            </p>
          </div>
        </div>
      ) : photoSrc ? (
        <>
          {/* 흐린 배경으로 여백을 메우고, 전경은 잘림 없이 노출 */}
          <Image src={photoSrc} alt="" fill unoptimized aria-hidden className="object-cover scale-110 blur-2xl opacity-40" />
          <div className="absolute inset-0 bg-black/20" />
          <Image
            key={current.type === "celeb" ? current.celeb.id : `team-${teamSlide}`}
            src={photoSrc}
            alt={photoAlt}
            fill
            unoptimized
            priority
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-contain animate-fade-in"
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

      {/* 단체샷 캐러셀 컨트롤 (여러 장일 때) */}
      {current.type === "team" && teamImages.length > 1 && (
        <>
          {/* 장수 카운터 */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/90 tabular-nums">
            <Images size={12} />
            {teamSlide + 1} / {teamImages.length}
          </div>
          {/* 사진끼리 건너뛴다 — 목록에서도 그 사진이 함께 선택된다 */}
          <button
            type="button"
            aria-label={t("previousPhoto")}
            onClick={() => selectItem(teamItemIdxs[(teamSlide - 1 + teamImages.length) % teamImages.length])}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label={t("nextPhoto")}
            onClick={() => selectItem(teamItemIdxs[(teamSlide + 1) % teamImages.length])}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute left-3 top-3 z-20 flex gap-1.5">
            {teamImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}번째 사진`}
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
      {current.type === "celeb" && (
        <div className="absolute inset-x-0 bottom-0 z-10 cursor-text select-text bg-gradient-to-t from-black via-black/90 to-transparent px-5 pb-5 pt-24 selection:bg-accent/45 selection:text-white md:px-6 md:pb-6 md:pt-32">
          <div className="flex items-center gap-2.5">
            <h3 className="font-serif text-2xl font-black leading-tight text-white md:text-3xl">
              {current.celeb.nickname}
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
          {factionQuote && (
            <blockquote
              className="mt-3 border-l-2 pl-3"
              style={{ borderColor: celebGroupColor }}
            >
              <div className="flex items-start gap-2">
                <Quote
                  size={14}
                  className="mt-1 shrink-0"
                  style={{ color: celebGroupColor }}
                  aria-hidden
                />
                <p className="line-clamp-3 font-serif text-sm leading-6 text-white/95 md:line-clamp-4 md:text-[15px]">
                  {factionQuote}
                </p>
              </div>
            </blockquote>
          )}
          {modalError && (
            <p role="alert" className="mt-2 text-xs leading-5 text-red-200">
              {t("detailUnavailable")}
            </p>
          )}
        </div>
      )}

      {/* 인물 고유 인사 듣기 */}
      {current.type === "celeb" && (
        <button
          type="button"
          aria-label={t("playLine")}
          title={t("playLine")}
          onClick={() => fireGreeting(current.celeb)}
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/90 backdrop-blur-md hover:border-accent hover:bg-black/75 hover:text-accent active:bg-black/90"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  // ── 우측 리스트 ──
  const list = (
    <div className="flex flex-col gap-2 md:max-h-[600px] md:overflow-y-auto md:pr-1 scrollbar-hidden">
      {items.map((item, idx) => {
        const isSel = idx === selectedIdx;

        // 세력 머리글 — 가로선+라벨 모양은 그대로 두되, 누르면 좌측에 그 세력이 뜬다.
        if (item.type === "group") {
          const headerLabel = (locale === "en" ? item.labelEn ?? item.label : item.label).trim() || item.label;
          return (
            <button
              key={`group-${item.label}`}
              type="button"
              onClick={() => selectItem(idx)}
              className={cn(
                "group mt-2 flex w-full cursor-pointer items-baseline gap-2 rounded-lg border px-1 py-1 text-left first:mt-0",
                isSel ? "border-accent/40 bg-accent/10" : "border-transparent hover:border-white/15"
              )}
            >
              <span aria-hidden className="h-3 w-0.5 shrink-0 self-center rounded-full" style={{ backgroundColor: item.color ?? activeTag.color }} />
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
              <span className="text-[10px] font-semibold tabular-nums text-white/35">
                {t("figureCount", { count: item.memberItemIdxs.length })}
              </span>
            </button>
          );
        }
        const isTeam = item.type === "team";
        const img = isTeam ? teamImages[item.imageIdx] : null;
        // 사진에 무리 이름이 있으면 그것이 제목이다. 없는 옛 사진은 테마 이름으로 대신한다
        const imgLabel = (locale === "en" ? img?.labelEn ?? img?.label : img?.label)?.trim() || null;
        const memberCount = isTeam
          ? (img?.celebIds ?? []).filter(id => celebs.some(c => c.id === id)).length
          : 0;
        const label = isTeam ? imgLabel ?? teamName : item.celeb.nickname;
        // 인물 부제 — 팩션 직함(배정 한 줄 소개) 우선, 없으면 프로필 수식어
        const sub = isTeam
          ? t("figureCount", { count: memberCount || celebs.length })
          : (locale === "en"
              ? item.celeb.short_desc_en ?? item.celeb.short_desc
              : item.celeb.short_desc) ?? item.celeb.title;
        const thumb = isTeam ? img?.url ?? null : item.celeb.avatar_url;
        // 사진에 매달린 사람은 한 칸 들여쓰고 세로줄로 소속을 보인다
        const nested = item.type === "celeb" && item.nested;
        return (
          <div key={isTeam ? `team-${item.imageIdx}` : item.celeb.id} className={cn("flex", nested && "pl-4")}>
            {nested && <span className="mr-2 w-px shrink-0 self-stretch bg-white/10" />}
            <button
              onClick={() => selectItem(idx)}
              className={cn(
                "relative w-full flex items-center gap-3 rounded-xl text-left border overflow-hidden cursor-pointer",
                nested ? "p-2" : "p-2.5",
                isSel ? "bg-accent/10 border-accent/40 shadow-sm" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
              )}
            >
              <div
                className={cn(
                  "relative rounded-lg overflow-hidden flex-shrink-0 border-2",
                  nested ? "w-10 h-10" : "w-12 h-12",
                  isSel ? "border-accent/50" : "border-white/10"
                )}
              >
                {thumb ? (
                  <Image src={thumb} alt={label} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    {isTeam ? <Users size={18} className="text-white/30" /> : <span className="text-sm text-white/25 font-serif font-black">{label[0]}</span>}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {isTeam ? (
                  <span className="text-[9px] font-cinzel font-bold tracking-widest uppercase" style={{ color: activeTag.color }}>
                    {t("groupShot")}
                  </span>
                ) : (
                  item.celeb.title && (
                    <span className={cn("text-[9px] font-cinzel font-bold tracking-wider uppercase truncate", isSel ? "text-amber-500" : "text-amber-500/50")}>
                      {item.celeb.title}
                    </span>
                  )
                )}
                <span className={cn("font-sans font-bold truncate", nested ? "text-[13px]" : "text-sm", isSel ? "text-white" : "text-text-secondary")}>
                  {label}
                </span>
                {sub && isTeam && <span className="text-[11px] font-sans">{sub}</span>}
              </div>

              {!isTeam ? (
                <span className={cn("text-xs font-cinzel font-bold flex-shrink-0 w-6 text-right", isSel ? "text-accent" : "text-white/15")}>
                  {(item.celebIdx + 1).toString().padStart(2, "0")}
                </span>
              ) : (
                teamImages.length > 1 && (
                  <span className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-white/70 tabular-nums">
                    <Images size={11} />
                    {item.imageIdx + 1}/{teamImages.length}
                  </span>
                )
              )}
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-stretch gap-6">
        {/* 좌측: 정보가 결합된 사진 + 테마 미디어 */}
        <div className="md:w-[56%] flex flex-col gap-5">
          {photo}
          {/*
            이 테마를 다룬 세력도감 영상과 그 구간에 흐르는 배경음악. 고른 항목이 사람이든 단체든
            테마 자체의 것이라 선택과 무관하게 같은 자리에 둔다. 없으면 아무것도 뜨지 않는다.
          */}
          <FactionMediaLinks videos={activeTag.videos} music={activeTag.music} title={teamName} />
        </div>
        {/* 우측: 단체 + 인물 리스트 */}
        <div className="md:w-[44%]">{list}</div>
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
