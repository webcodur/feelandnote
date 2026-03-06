"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";
import defaultLinesData from "@/lib/game/voice/defaultLines";
import type { SpeechTone } from "@/lib/game/voice/types";
import { getVoiceUrl } from "@/lib/game/voice/voiceUrl";

interface CuratedSpotlightMobileProps {
  activeTag: FeaturedTag;
  onCelebClick: (celeb: FeaturedCeleb) => void;
  onSubtitle?: (data: DialogueSubtitleData) => void;
}

export default function CuratedSpotlightMobile({ activeTag, onCelebClick, onSubtitle }: CuratedSpotlightMobileProps) {
  const locale = useLocale() as 'ko' | 'en';
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const subtitleKeyRef = useRef(0);
  const heroCeleb = activeTag.celebs[selectedIndex];
  const celebsCount = activeTag.celebs.length;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchMoved = useRef(false);
  const hasInteracted = useRef(false);
  const SWIPE_THRESHOLD = 30; // 스와이프 감도 향상
  const CLICK_THRESHOLD = 8; // 이 이하면 클릭으로 판정

  const canGoNext = selectedIndex < celebsCount - 1;
  const canGoPrev = selectedIndex > 0;

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
        audioUrl: celeb.has_voice && greetingIdx >= 0 ? getVoiceUrl(celeb.id, locale, "greeting", greetingIdx + 1) : null,
      });
    }
  }, [locale, onSubtitle]);

  useEffect(() => {
    if (!hasInteracted.current) return;
    showGreeting(activeTag.celebs[selectedIndex]);
  }, [selectedIndex, activeTag.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchMoved.current = false;
    setIsSwiping(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;
    // X 또는 Y 방향으로 일정 이상 움직이면 드래그로 판정
    if (Math.abs(diffX) > CLICK_THRESHOLD || Math.abs(diffY) > CLICK_THRESHOLD) {
      touchMoved.current = true;
    }
    const resistance = (!canGoPrev && diffX > 0) || (!canGoNext && diffX < 0) ? 0.3 : 1;
    setDragOffset(diffX * resistance);
  };

  const handleTouchEnd = () => {
    // 스와이프 처리
    if (Math.abs(dragOffset) > SWIPE_THRESHOLD) {
      hasInteracted.current = true;
      if (dragOffset < 0 && canGoNext) {
        setSlideDirection("left");
        setSelectedIndex(selectedIndex + 1);
      } else if (dragOffset > 0 && canGoPrev) {
        setSlideDirection("right");
        setSelectedIndex(selectedIndex - 1);
      }
    }
    // 클릭 처리 (터치 이동이 없었을 때)
    else if (!touchMoved.current && heroCeleb) {
      onCelebClick(heroCeleb);
    }
    setDragOffset(0);
    setIsSwiping(false);
    setTimeout(() => setSlideDirection(null), 350);
  };

  return (
    <>
      {/* Hero Card - 텍스트 중심, 스와이프 지원 */}
      <div className="px-4 py-6 mb-2">
         <div
           className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-[#0a0a0a] to-[#111] select-none"
           onTouchStart={handleTouchStart}
           onTouchMove={handleTouchMove}
           onTouchEnd={handleTouchEnd}
         >
            {/* 드래그에 따라 움직이는 콘텐츠 */}
            <div
              key={selectedIndex}
              className={cn(
                "relative flex flex-col items-center py-8 px-6 pb-12",
                slideDirection === "left" && "animate-slide-in-right",
                slideDirection === "right" && "animate-slide-in-left"
              )}
              style={{
                transform: isSwiping ? `translateX(${dragOffset * 0.3}px)` : undefined,
                opacity: isSwiping ? 1 - Math.abs(dragOffset) * 0.002 : 1,
              }}
            >
              {/* 원형 아바타 */}
              <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-accent/30 ring-offset-2 ring-offset-[#0a0a0a] mb-5">
                {heroCeleb.avatar_url ? (
                  <Image
                    src={heroCeleb.avatar_url}
                    alt={heroCeleb.nickname}
                    width={96}
                    height={96}
                    priority={selectedIndex === 0}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-3xl text-white/20 font-serif font-black">{heroCeleb.nickname[0]}</span>
                  </div>
                )}
              </div>

              {/* 텍스트 영역 */}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-8 h-0.5 bg-accent mb-1 shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                {heroCeleb.title && (
                  <span className="text-accent text-xs font-serif font-bold tracking-wider">
                    {heroCeleb.title}
                  </span>
                )}
                <h3 className="text-2xl text-white font-serif font-black leading-tight">
                  {heroCeleb.nickname}
                </h3>
                {(locale === "en" ? (heroCeleb.short_desc_en ?? heroCeleb.short_desc) : heroCeleb.short_desc) && (
                  <p className="text-white/80 text-sm font-sans line-clamp-2 mt-1">
                    {locale === "en" ? (heroCeleb.short_desc_en ?? heroCeleb.short_desc) : heroCeleb.short_desc}
                  </p>
                )}
                {(locale === "en" ? (heroCeleb.long_desc_en ?? heroCeleb.long_desc) : heroCeleb.long_desc) && (
                  <p className="text-text-secondary text-xs font-sans leading-relaxed mt-1 px-2 break-keep">
                    {locale === "en" ? (heroCeleb.long_desc_en ?? heroCeleb.long_desc) : heroCeleb.long_desc}
                  </p>
                )}
              </div>
            </div>

            {/* 스와이프 인디케이터 - 하단 중앙 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {activeTag.celebs.map((_, idx) => {
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
      </div>

      {/* 전체 인물 수직 리스트 */}
      <div className="px-4 flex flex-col gap-2">
        <h4 className="text-xs font-cinzel text-text-tertiary mb-1">ALL FIGURES</h4>
        {activeTag.celebs.map((celeb, idx) => {
          const isSelected = idx === selectedIndex;
          const celebTags = celeb.tags?.filter(t => t.id !== activeTag.id).slice(0, 2);
          return (
            <button
              key={celeb.id}
              onClick={() => { hasInteracted.current = true; setSelectedIndex(idx); showGreeting(celeb); }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 border",
                isSelected
                  ? "bg-accent/10 border-accent/30 shadow-sm"
                  : "bg-white/[0.02] border-white/5 active:bg-white/[0.06]"
              )}
            >
              {/* 아바타 */}
              <div className={cn(
                "relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 transition-colors",
                isSelected ? "border-accent/50" : "border-white/10"
              )}>
                {celeb.avatar_url ? (
                  <Image src={celeb.avatar_url} alt={celeb.nickname} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-sm text-white/20 font-serif font-black">{celeb.nickname[0]}</span>
                  </div>
                )}
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  {celeb.title && (
                    <span className={cn(
                      "text-[9px] font-cinzel font-bold tracking-wider uppercase flex-shrink-0",
                      isSelected ? "text-amber-500" : "text-amber-500/50"
                    )}>
                      {celeb.title}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-sm font-sans font-bold truncate transition-colors",
                  isSelected ? "text-white" : "text-text-secondary"
                )}>
                  {celeb.nickname}
                </span>
                {(locale === "en" ? (celeb.short_desc_en ?? celeb.short_desc) : celeb.short_desc) && (
                  <p className="text-xs text-text-tertiary font-sans line-clamp-1 leading-snug">
                    {locale === "en" ? (celeb.short_desc_en ?? celeb.short_desc) : celeb.short_desc}
                  </p>
                )}
                {celebTags && celebTags.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {celebTags.map(tag => (
                      <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-text-tertiary border border-white/5">
                        {locale === "en" ? (tag.name_en ?? tag.name) : tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 순번 */}
              <span className={cn(
                "text-xs font-cinzel font-bold flex-shrink-0 w-6 text-right",
                isSelected ? "text-accent" : "text-white/15"
              )}>
                {(idx + 1).toString().padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
