"use client";

import { useState, useRef, lazy, Suspense, useEffect, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import type { SpotlightLocation } from "./FeaturedSpotlight";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";
import defaultLinesData from "@/lib/game/voice/defaultLines";
import type { SpeechTone } from "@/lib/game/voice/types";
import { getVoiceUrl } from "@/lib/game/voice/voiceUrl";

const CelebDetailModal = lazy(() => import("@/components/features/home/celeb-card-drafts/CelebDetailModal"));

interface CuratedSpotlightDesktopProps {
  activeTag: FeaturedTag;
  location?: Exclude<SpotlightLocation, "explore-mb">;
  onSubtitle?: (data: DialogueSubtitleData) => void;
}

export default function CuratedSpotlightDesktop({ activeTag, location = "main", onSubtitle }: CuratedSpotlightDesktopProps) {
  const t = useTranslations("landing");
  const locale = useLocale() as 'ko' | 'en';
  const isExplore = location === "explore-pc";
  const [selectedIndex, setSelectedIndex] = useState(0);
  const subtitleKeyRef = useRef(0);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);
  const [modalCelebIndex, setModalCelebIndex] = useState(-1);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const hasInteracted = useRef(false);

  // Transition State
  const [renderedTag, setRenderedTag] = useState(activeTag);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (activeTag.id !== renderedTag.id) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setRenderedTag(activeTag);
        setSelectedIndex(0);
        setIsTransitioning(false);
      }, 300); // fade-out duration
      return () => clearTimeout(timer);
    }
  }, [activeTag, renderedTag]);

  // greeting 대사 표시
  const showGreeting = useCallback((celeb: FeaturedCeleb | undefined) => {
    if (!celeb || !onSubtitle) return;
    const greetings = locale === 'ko' ? celeb.greeting : (celeb.greeting_en ?? celeb.greeting);
    let text: string | undefined;
    let greetingIdx = -1;
    if (greetings?.length) {
      greetingIdx = Math.floor(Math.random() * greetings.length);
      text = greetings[greetingIdx];
    } else if (celeb.speech_tone) {
      const fallback = defaultLinesData[locale].greeting?.[celeb.speech_tone as SpeechTone];
      if (fallback?.length) text = fallback[Math.floor(Math.random() * fallback.length)];
    }
    if (text) {
      onSubtitle({
        key: ++subtitleKeyRef.current,
        tone: (celeb.speech_tone as SpeechTone) ?? 'composed',
        text: stripEmotionTag(text),
        nickname: celeb.nickname,
        avatarUrl: celeb.avatar_url,
      });
      if (celeb.has_voice && greetingIdx >= 0) {
        voiceAudioRef.current?.pause();
        const audio = new Audio(getVoiceUrl(celeb.id, locale, "greeting", greetingIdx + 1));
        audio.volume = 0.7;
        audio.play().catch(() => {});
        voiceAudioRef.current = audio;
      }
    }
  }, [locale, onSubtitle]);

  useEffect(() => {
    if (!hasInteracted.current) return;
    showGreeting(celebs[selectedIndex]);
  }, [selectedIndex, renderedTag.id]);

  // Refs & Drags (하단 리스트용)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, scrollLeft: 0, hasMoved: false });

  // Hero Card 드래그 (인물 전환용)
  const heroDragStartX = useRef(0);
  const heroDragStartY = useRef(0);
  const [isHeroDragging, setIsHeroDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const heroHasDragged = useRef(false);

  const celebs = renderedTag.celebs;
  const heroCeleb = celebs[selectedIndex];
  const SWIPE_THRESHOLD = 30; // 스와이프 감도 향상
  const CLICK_THRESHOLD = 8; // 이 이하면 클릭으로 판정

  // 드래그 방향에 따른 다음/이전 인물
  const canGoNext = selectedIndex < celebs.length - 1;
  const canGoPrev = selectedIndex > 0;

  // 하단 리스트 드래그 스크롤 — mousedown 시 document에 리스너 부착, mouseup 시 즉시 제거
  const onListMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    e.preventDefault(); // 이미지 드래그·텍스트 선택 방지
    const d = dragRef.current;
    d.startX = e.clientX;
    d.scrollLeft = el.scrollLeft;
    d.hasMoved = false;
    el.style.cursor = "grabbing";

    const onMove = (ev: MouseEvent) => {
      const walk = ev.clientX - d.startX;
      if (!d.hasMoved && Math.abs(walk) > 5) d.hasMoved = true;
      if (d.hasMoved) el.scrollLeft = d.scrollLeft - walk;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      el.style.cursor = "grab";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  // Hero Card 드래그 Handlers
  const handleHeroDragStart = (clientX: number, clientY: number) => {
    setIsHeroDragging(true);
    heroHasDragged.current = false;
    heroDragStartX.current = clientX;
    heroDragStartY.current = clientY;
    setDragOffset(0);
  };

  const handleHeroDragMove = (clientX: number, clientY: number) => {
    if (!isHeroDragging) return;
    const diffX = clientX - heroDragStartX.current;
    const diffY = clientY - heroDragStartY.current;
    // 끝에서는 저항감 추가
    const resistance = (!canGoPrev && diffX > 0) || (!canGoNext && diffX < 0) ? 0.3 : 1;
    setDragOffset(diffX * resistance);
    // X 또는 Y 방향으로 일정 이상 움직이면 드래그로 판정
    if (Math.abs(diffX) > CLICK_THRESHOLD || Math.abs(diffY) > CLICK_THRESHOLD) {
      heroHasDragged.current = true;
    }
  };

  const handleHeroDragEnd = () => {
    if (!isHeroDragging) return;

    if (Math.abs(dragOffset) > SWIPE_THRESHOLD) {
      if (dragOffset < 0 && canGoNext) {
        setSlideDirection("left"); // 왼쪽으로 밀었으니 새 카드는 오른쪽에서 등장
        selectHero(selectedIndex + 1);
      } else if (dragOffset > 0 && canGoPrev) {
        setSlideDirection("right"); // 오른쪽으로 밀었으니 새 카드는 왼쪽에서 등장
        selectHero(selectedIndex - 1);
      }
    }

    setDragOffset(0);
    setIsHeroDragging(false);
    setTimeout(() => {
      heroHasDragged.current = false;
      setSlideDirection(null);
    }, 350);
  };

  const selectHero = (idx: number) => {
    hasInteracted.current = true;
    if (idx !== selectedIndex) {
      const scrollPos = scrollContainerRef.current?.scrollLeft ?? 0;
      setSelectedIndex(idx);
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollPos;
        }
      });
    }
  };

  // #region 공통 서브 컴포넌트
  const celebThumbnails = (
    <div
      ref={scrollContainerRef}
      onMouseDown={onListMouseDown}
      className={cn(
        "flex overflow-x-auto scrollbar-hidden select-none cursor-grab touch-pan-x",
        isExplore ? "gap-4 py-3 px-1" : "gap-4 pb-4 px-4 pt-2"
      )}
    >
      {celebs.map((celeb, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <div
            key={celeb.id}
            onClick={() => {
              if (!dragRef.current.hasMoved) selectHero(idx);
              dragRef.current.hasMoved = false;
            }}
            className={cn(
              "flex-shrink-0 w-[80px] md:w-[100px] flex flex-col gap-1.5 cursor-pointer transition-all duration-300",
              isSelected
                ? "scale-[1.02]"
                : "opacity-60 hover:opacity-100 hover:-translate-y-1"
            )}
          >
            <div className={cn(
              "relative aspect-square rounded-lg overflow-hidden transition-all",
              isSelected ? "ring-2 ring-accent ring-offset-2 ring-offset-bg-main shadow-lg" : ""
            )}>
              {celeb.avatar_url ? (
                <Image src={celeb.avatar_url} alt={celeb.nickname} fill sizes="150px" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-bg-card flex items-center justify-center text-text-tertiary">
                  <span className="font-serif text-xl">{celeb.nickname[0]}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              {celeb.title && (
                <span className={cn(
                  "text-[9px] font-cinzel font-bold tracking-widest uppercase leading-tight truncate w-full text-center",
                  isSelected ? "text-amber-500" : "text-amber-500/60"
                )}>
                  {celeb.title}
                </span>
              )}
              <span className={cn(
                "text-[11px] font-sans font-bold tracking-wide truncate w-full text-center transition-colors",
                isSelected ? "text-white" : "text-text-secondary"
              )}>
                {celeb.nickname}
              </span>
            </div>
          </div>
        );
      })}
      {!isExplore && (
        <Link
          href={`/explore?tagId=${activeTag.id}`}
          className="flex-shrink-0 w-[80px] md:w-[100px] aspect-square flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 hover:border-accent hover:bg-accent/5 transition-all group"
        >
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-accent group-hover:text-accent">
            <ArrowRight size={14} />
          </div>
          <span className="text-xs text-text-tertiary group-hover:text-accent font-sans">{t("viewAll")}</span>
        </Link>
      )}
    </div>
  );
  // #endregion

  // #region explore-pc 전용 2열 레이아웃
  if (isExplore) {
    return (
      <div className="max-w-5xl mx-auto overflow-hidden">
        {/* Hero Card + 썸네일 배열 */}
        <div
          className={cn(
            "flex flex-col gap-6 min-w-0 transition-all duration-300 ease-in-out",
            isTransitioning ? "opacity-0 translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
          )}
        >
          {/* Hero Card (텍스트 중심) */}
          <div
            className={cn(
              "group relative w-full overflow-hidden rounded-lg bg-[#0a0a0a] shadow-xl select-none",
              isHeroDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={(e) => handleHeroDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleHeroDragMove(e.clientX, e.clientY)}
            onMouseUp={handleHeroDragEnd}
            onMouseLeave={handleHeroDragEnd}
            onClick={() => !heroHasDragged.current && heroCeleb && (() => { setModalCeleb(heroCeleb); setModalCelebIndex(selectedIndex); })()}
          >
            <div
              key={selectedIndex}
              className={cn(
                "relative flex items-center gap-6 p-8",
                slideDirection === "left" && "animate-slide-in-right",
                slideDirection === "right" && "animate-slide-in-left"
              )}
              style={{
                transform: isHeroDragging ? `translateX(${dragOffset * 0.3}px)` : undefined,
                opacity: isHeroDragging ? 1 - Math.abs(dragOffset) * 0.002 : 1,
              }}
            >
              {/* 원형 아바타 */}
              <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden ring-2 ring-accent/30 ring-offset-2 ring-offset-[#0a0a0a]">
                {heroCeleb?.avatar_url ? (
                  <Image
                    src={heroCeleb.avatar_url}
                    alt={heroCeleb?.nickname ?? ""}
                    width={80}
                    height={80}
                    priority={selectedIndex === 0}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-2xl text-white/20 font-serif font-black">{heroCeleb?.nickname?.[0]}</span>
                  </div>
                )}
              </div>

              {/* 텍스트 영역 */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex flex-col gap-1">
                  {heroCeleb?.title && (
                    <span className="text-xs text-accent font-serif font-bold tracking-wider">{heroCeleb.title}</span>
                  )}
                  <h3 className="text-2xl font-serif font-black text-white leading-tight">{heroCeleb?.nickname}</h3>
                </div>

                {(locale === "en" ? (heroCeleb?.short_desc_en ?? heroCeleb?.short_desc) : heroCeleb?.short_desc) && (
                  <p className="text-base text-white/90 font-sans leading-relaxed">{locale === "en" ? (heroCeleb.short_desc_en ?? heroCeleb.short_desc) : heroCeleb.short_desc}</p>
                )}

                {(locale === "en" ? (heroCeleb?.long_desc_en ?? heroCeleb?.long_desc) : heroCeleb?.long_desc) && (
                  <p className="text-sm text-text-secondary font-sans leading-relaxed break-keep line-clamp-3">{locale === "en" ? (heroCeleb.long_desc_en ?? heroCeleb.long_desc) : heroCeleb.long_desc}</p>
                )}
              </div>
            </div>

            {/* 넘버 뱃지 */}
            <div className="absolute top-4 right-4 z-30">
              <div className="w-12 h-12 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center flex-col gap-0.5">
                <span className="text-[8px] font-cinzel uppercase text-white/70">{t("number")}</span>
                <span className="text-base font-serif font-bold text-white">{selectedIndex + 1}</span>
              </div>
            </div>

            {/* 스와이프 인디케이터 - 하단 중앙 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
              {celebs.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    idx === selectedIndex ? "bg-accent w-4" : "bg-white/30"
                  )}
                />
              ))}
            </div>
          </div>

          {/* 인물 배열 썸네일 */}
          {celebThumbnails}
        </div>

        {modalCeleb && (
          <Suspense fallback={null}>
            <CelebDetailModal
              celeb={modalCeleb}
              isOpen={!!modalCeleb}
              onClose={() => { setModalCeleb(null); setModalCelebIndex(-1); }}
              onNavigate={(dir) => {
                const idx = dir === "prev" ? modalCelebIndex - 1 : modalCelebIndex + 1;
                if (idx >= 0 && idx < celebs.length) { setModalCelebIndex(idx); setModalCeleb(celebs[idx]); }
              }}
              hasPrev={modalCelebIndex > 0}
              hasNext={modalCelebIndex < celebs.length - 1}
            />
          </Suspense>
        )}
      </div>
    );
  }
  // #endregion

  // #region main 기본 레이아웃 (수직 배치)
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">

      {/* Hero Card - 텍스트 중심, 좌우 드래그 시 인물 전환 */}
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-[4px] bg-[#0a0a0a] shadow-2xl select-none transition-all duration-300",
          isHeroDragging ? "cursor-grabbing" : "cursor-grab",
          isTransitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
        )}
        onMouseDown={(e) => handleHeroDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleHeroDragMove(e.clientX, e.clientY)}
        onMouseUp={handleHeroDragEnd}
        onMouseLeave={handleHeroDragEnd}
        onClick={() => !heroHasDragged.current && heroCeleb && (() => { setModalCeleb(heroCeleb); setModalCelebIndex(selectedIndex); })()}
      >
        <div className="absolute inset-0 opacity-[0.03] bg-[url('/images/stardust.png')]" />

        <div
          key={selectedIndex}
          className={cn(
            "relative flex items-center gap-6 md:gap-8 p-6 md:p-10",
            slideDirection === "left" && "animate-slide-in-right",
            slideDirection === "right" && "animate-slide-in-left"
          )}
          style={{
            transform: isHeroDragging ? `translateX(${dragOffset * 0.3}px)` : undefined,
            opacity: isHeroDragging ? 1 - Math.abs(dragOffset) * 0.002 : 1,
          }}
        >
            {/* 원형 아바타 */}
            <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring-2 ring-accent/30 ring-offset-2 ring-offset-[#0a0a0a]">
              {heroCeleb?.avatar_url ? (
                <Image
                  src={heroCeleb.avatar_url}
                  alt={heroCeleb?.nickname ?? ""}
                  width={96}
                  height={96}
                  priority={selectedIndex === 0}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <span className="text-3xl text-white/20 font-serif font-black">{heroCeleb?.nickname?.[0]}</span>
                </div>
              )}
            </div>

            {/* 텍스트 영역 */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 max-w-xl">
                  <div className="flex flex-col gap-1">
                    {heroCeleb?.title && (
                      <span className="text-xs md:text-sm text-accent font-serif font-bold tracking-wider leading-snug">
                        {heroCeleb.title}
                      </span>
                    )}
                    <h3 className="text-lg md:text-2xl font-serif font-black text-white leading-tight tracking-tight">
                      {heroCeleb?.nickname}
                    </h3>
                  </div>

                  {(locale === "en" ? (heroCeleb?.short_desc_en ?? heroCeleb?.short_desc) : heroCeleb?.short_desc) && (
                    <p className="text-base md:text-lg text-white font-sans font-medium leading-relaxed text-balance opacity-90">
                      {locale === "en" ? (heroCeleb.short_desc_en ?? heroCeleb.short_desc) : heroCeleb.short_desc}
                    </p>
                  )}

                  {(locale === "en" ? (heroCeleb?.long_desc_en ?? heroCeleb?.long_desc) : heroCeleb?.long_desc) && (
                    <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep opacity-80 line-clamp-4">
                      {locale === "en" ? (heroCeleb.long_desc_en ?? heroCeleb.long_desc) : heroCeleb.long_desc}
                    </p>
                  )}
            </div>
        </div>

        {/* 넘버 뱃지 - 우상단 */}
        <div className="absolute top-3 right-3 z-30">
          <div className="w-11 h-11 md:w-14 md:h-14 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center flex-col gap-0">
             <span className="text-[7px] md:text-[9px] font-cinzel uppercase text-white/70">{t("number")}</span>
             <span className="text-sm md:text-lg font-serif font-bold text-white">{selectedIndex + 1}</span>
          </div>
        </div>

        {/* 스와이프 인디케이터 - 하단 중앙 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
          {celebs.map((_, idx) => {
            const isNext = (dragOffset < -SWIPE_THRESHOLD && idx === selectedIndex + 1);
            const isPrev = (dragOffset > SWIPE_THRESHOLD && idx === selectedIndex - 1);
            return (
              <div
                key={idx}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  idx === selectedIndex ? "bg-accent w-4" : "bg-white/30",
                  (isNext || isPrev) && "bg-accent/70 scale-125"
                )}
              />
            );
          })}
        </div>

      </div>

      {/* Grid Content - 썸네일 리스트 */}
      {celebThumbnails}

      {modalCeleb && (
        <Suspense fallback={null}>
          <CelebDetailModal
            celeb={modalCeleb}
            isOpen={!!modalCeleb}
            onClose={() => { setModalCeleb(null); setModalCelebIndex(-1); }}
            onNavigate={(dir) => {
              const idx = dir === "prev" ? modalCelebIndex - 1 : modalCelebIndex + 1;
              if (idx >= 0 && idx < celebs.length) { setModalCelebIndex(idx); setModalCeleb(celebs[idx]); }
            }}
            hasPrev={modalCelebIndex > 0}
            hasNext={modalCelebIndex < celebs.length - 1}
          />
        </Suspense>
      )}
    </div>
  );
}
