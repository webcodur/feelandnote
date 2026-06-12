"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Locale } from "@/types/locale";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";

export const SWIPE_THRESHOLD = 30; // 스와이프 감도 향상
const CLICK_THRESHOLD = 8; // 이 이하면 클릭으로 판정

interface UseCuratedSpotlightParams {
  activeTag: FeaturedTag;
  locale: Locale;
  onSubtitle?: (data: DialogueSubtitleData) => void;
}

export function useCuratedSpotlight({ activeTag, locale, onSubtitle }: UseCuratedSpotlightParams) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { fireGreeting, ripple, triggerRipple, clearRipple } = useCelebGreeting({ onSubtitle, locale });
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);
  const [modalCelebIndex, setModalCelebIndex] = useState(-1);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const hasInteracted = useRef(false);

  // Transition State
  const [renderedTag, setRenderedTag] = useState(activeTag);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const celebs = renderedTag.celebs;

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

  useEffect(() => {
    if (!hasInteracted.current) return;
    const celeb = celebs[selectedIndex];
    if (celeb) fireGreeting(celeb);
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

  const heroCeleb = celebs[selectedIndex];

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

  return {
    selectedIndex,
    fireGreeting,
    ripple,
    triggerRipple,
    clearRipple,
    modalCeleb,
    setModalCeleb,
    modalCelebIndex,
    setModalCelebIndex,
    slideDirection,
    isTransitioning,
    scrollContainerRef,
    dragRef,
    onListMouseDown,
    isHeroDragging,
    dragOffset,
    heroHasDragged,
    celebs,
    heroCeleb,
    handleHeroDragStart,
    handleHeroDragMove,
    handleHeroDragEnd,
    selectHero,
  };
}
