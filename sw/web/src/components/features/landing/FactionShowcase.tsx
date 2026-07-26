"use client";

import { useState, lazy, Suspense } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Users, Volume2, Images, Quote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import FactionVideoLinks from "@/components/features/faction/FactionVideoLinks";
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
  | { type: "team" }
  | { type: "celeb"; celeb: FeaturedCeleb; celebIdx: number };

export default function FactionShowcase({ activeTag, locale, onSubtitle }: FactionShowcaseProps) {
  const t = useTranslations("landing");
  const { fireGreeting } = useCelebGreeting({ onSubtitle, locale });

  const celebs = activeTag.celebs;
  const teamImages = activeTag.team_images;
  const hasTeam = teamImages.length > 0;
  const teamName = locale === "en" ? activeTag.name_en ?? activeTag.name : activeTag.name;
  const teamDesc = locale === "en" ? activeTag.description_en ?? activeTag.description : activeTag.description;

  const items: ShowcaseItem[] = [
    ...(hasTeam ? [{ type: "team" } as const] : []),
    ...celebs.map((celeb, celebIdx) => ({ type: "celeb" as const, celeb, celebIdx })),
  ];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [teamSlide, setTeamSlide] = useState(0);
  // 개인 화보를 누르면 그 인물이 세력도 영상에서 하는 말을 사진 위에 띄운다
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);
  const [modalCelebIdx, setModalCelebIdx] = useState(-1);

  // 테마 전환 시 상태 초기화는 부모가 key={activeTag.id}로 재마운트해 처리한다.
  const current = items[selectedIdx] ?? items[0];

  if (!current) return null;

  // 리스트 클릭: 좌측을 그 항목으로 전환만 한다 (대사는 사진의 스피커 버튼에서)
  const selectItem = (idx: number) => {
    setSelectedIdx(idx);
    setQuoteOpen(false);
  };

  const openModal = () => {
    if (current.type !== "celeb") return;
    setModalCeleb(current.celeb);
    setModalCelebIdx(current.celebIdx);
  };

  // ── 좌측 사진 ──
  const teamSrc = hasTeam ? teamImages[teamSlide] : null;
  const celebSrc = current.type === "celeb" ? current.celeb.spotlight_image_url ?? current.celeb.avatar_url : null;
  const photoSrc = current.type === "team" ? teamSrc : celebSrc;
  const fallbackInitial = current.type === "team" ? teamName[0] : current.celeb.nickname[0];
  const photoAlt = current.type === "team" ? teamName : current.celeb.nickname;

  // 이 인물이 세력도 영상에서 하는 말. 없으면 아무 표시도 하지 않는다(빈 말풍선을 띄우지 않는다)
  const factionQuote =
    current.type === "celeb"
      ? (locale === "en" ? current.celeb.faction_quote_en ?? current.celeb.faction_quote : current.celeb.faction_quote)?.trim() || null
      : null;
  const showQuoteOverlay = quoteOpen && !!factionQuote;

  const photo = (
    <div className="group/photo relative w-full aspect-square overflow-hidden rounded-xl bg-[#0a0a0a] ring-1 ring-white/10">
      {photoSrc ? (
        <>
          {/* 흐린 배경으로 여백을 메우고, 전경은 잘림 없이 노출 */}
          <Image src={photoSrc} alt="" fill unoptimized aria-hidden className="object-cover scale-110 blur-2xl opacity-40" />
          <div className="absolute inset-0 bg-black/20" />
          <Image
            key={`${current.type === "team" ? "team-" + teamSlide : current.celeb.id}`}
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
          <button
            type="button"
            aria-label="이전 사진"
            onClick={() => setTeamSlide((teamSlide - 1 + teamImages.length) % teamImages.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="다음 사진"
            onClick={() => setTeamSlide((teamSlide + 1) % teamImages.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {teamImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}번째 사진`}
                onClick={() => setTeamSlide(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-200",
                  i === teamSlide ? "bg-accent w-4" : "bg-white/50 w-2 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* 인물 대사 듣기 (스피커) — 한마디를 펼친 동안은 감춘다 */}
      {current.type === "celeb" && !showQuoteOverlay && (
        <button
          type="button"
          aria-label={t("playLine")}
          title={t("playLine")}
          onClick={() => fireGreeting(current.celeb)}
          className="absolute bottom-3 right-3 z-10 w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 border border-white/15 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-accent active:scale-90 transition-[transform,color,background-color] duration-150"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      )}

      {/*
        한마디 — 화보 전체가 여닫는 단추다(재클릭으로 닫힌다).
        말풍선과 닫기 표시는 클릭을 가로채지 않도록(pointer-events-none) 두어
        어디를 눌러도 같은 단추가 받는다. 그래서 X 자리를 눌러도 닫힌다.
      */}
      {factionQuote && current.type === "celeb" && (
        <>
          <button
            type="button"
            aria-label={showQuoteOverlay ? t("hideQuote") : t("showQuote")}
            title={showQuoteOverlay ? t("hideQuote") : t("showQuote")}
            aria-expanded={showQuoteOverlay}
            onClick={() => setQuoteOpen(o => !o)}
            className="absolute inset-0 z-0 cursor-pointer"
          />
          {!showQuoteOverlay && (
            <span className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/80 group-hover/photo:text-accent group-hover/photo:border-accent/50">
              <Quote size={12} />
              {t("showQuote")}
            </span>
          )}
          {showQuoteOverlay && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 md:p-8 bg-black/80 backdrop-blur-sm animate-fade-in">
              <Quote size={20} style={{ color: activeTag.color }} />
              <p className="max-w-[34ch] text-center text-[15px] md:text-lg font-serif font-medium text-white leading-relaxed break-keep">
                {factionQuote}
              </p>
              <span className="text-xs md:text-sm font-sans text-white/60">— {current.celeb.nickname}</span>
              <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white/80 group-hover/photo:text-accent">
                <X className="w-4 h-4" />
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── 좌측 설명 ──
  const shortDesc = current.type === "celeb" ? (locale === "en" ? current.celeb.short_desc_en ?? current.celeb.short_desc : current.celeb.short_desc) : null;
  const longDesc = current.type === "celeb" ? (locale === "en" ? current.celeb.long_desc_en ?? current.celeb.long_desc : current.celeb.long_desc) : null;

  const detail = (
    <div className="flex flex-col gap-2.5">
      {current.type === "team" ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-xs font-serif font-bold tracking-wider" style={{ color: activeTag.color }}>
            <Users size={13} />
            {t("groupShot")}
          </span>
          <h3 className="text-2xl md:text-3xl font-serif font-black text-white leading-tight">{teamName}</h3>
          {teamDesc && <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep">{teamDesc}</p>}
        </>
      ) : (
        <>
          {current.celeb.title && (
            <span className="text-xs md:text-sm font-serif font-bold tracking-wider" style={{ color: activeTag.color }}>
              {current.celeb.title}
            </span>
          )}
          <h3 className="text-2xl md:text-3xl font-serif font-black text-white leading-tight">{current.celeb.nickname}</h3>
          {shortDesc && <p className="text-base text-white/90 font-sans leading-relaxed text-balance">{shortDesc}</p>}
          {longDesc && <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep">{longDesc}</p>}
          <button
            type="button"
            onClick={openModal}
            className="group/btn inline-flex items-center gap-1 mt-1 self-start text-sm font-semibold transition-colors hover:brightness-125"
            style={{ color: activeTag.color }}
          >
            {t("viewDetail")}
            <ChevronRight size={15} className="transition-transform group-hover/btn:translate-x-0.5" />
          </button>
        </>
      )}
    </div>
  );

  // ── 우측 리스트 ──
  const list = (
    <div className="flex flex-col gap-2 md:max-h-[600px] md:overflow-y-auto md:pr-1 scrollbar-hidden">
      {items.map((item, idx) => {
        const isSel = idx === selectedIdx;
        const isTeam = item.type === "team";
        const label = isTeam ? teamName : item.celeb.nickname;
        const sub = isTeam ? t("figureCount", { count: celebs.length }) : item.celeb.title;
        const thumb = isTeam ? teamImages[0] ?? null : item.celeb.avatar_url;
        return (
          <button
            key={isTeam ? "team" : item.celeb.id}
            onClick={() => selectItem(idx)}
            className={cn(
              "relative w-full flex items-center gap-3 p-2.5 rounded-xl text-left border overflow-hidden cursor-pointer",
              isSel ? "bg-accent/10 border-accent/40 shadow-sm" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
            )}
          >
            <div
              className={cn(
                "relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors",
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
              <span className={cn("text-sm font-sans font-bold truncate transition-colors", isSel ? "text-white" : "text-text-secondary")}>
                {label}
              </span>
              {sub && isTeam && <span className="text-[11px] text-text-tertiary font-sans">{sub}</span>}
            </div>

            {!isTeam ? (
              <span className={cn("text-xs font-cinzel font-bold flex-shrink-0 w-6 text-right", isSel ? "text-accent" : "text-white/15")}>
                {(item.celebIdx + 1).toString().padStart(2, "0")}
              </span>
            ) : (
              teamImages.length > 1 && (
                <span className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-white/70">
                  <Images size={11} />
                  {t("photoCount", { count: teamImages.length })}
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-stretch gap-6">
        {/* 좌측: 사진 + 설명 */}
        <div className="md:w-[56%] flex flex-col gap-5">
          {photo}
          {detail}
          {/*
            이 테마를 다룬 세력도 영상. 고른 항목이 사람이든 단체든 테마 자체의 영상이라
            선택과 무관하게 같은 자리에 둔다. 영상이 없으면 아무것도 뜨지 않는다.
          */}
          <FactionVideoLinks videos={activeTag.videos} title={teamName} />
        </div>
        {/* 우측: 단체 + 인물 리스트 */}
        <div className="md:w-[44%]">{list}</div>
      </div>

      {/* 인물 상세 모달 */}
      {modalCeleb && (
        <Suspense fallback={null}>
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
                setModalCelebIdx(next);
                setModalCeleb(celebs[next]);
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
