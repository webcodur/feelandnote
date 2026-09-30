"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Maximize, Rows3, TextAlignJustify } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal, { CLOSE_BUTTON_STYLE } from "@/components/ui/Modal";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import FactionArtworkTitle from "./FactionArtworkTitle";
import { Z_INDEX } from "@/constants/zIndex";
import type { LocalizedSceneEnding } from "@feelandnote/shared/lib/faction-team-image";
import FactionSceneNavigator from "./FactionSceneNavigator";
import FactionSceneText, { SCENE_DIALOGUE_LINE } from "./FactionSceneText";
import { usePreloadImages } from "@/hooks/usePreloadImages";

const PRELOAD_AHEAD = 2;

/* 자막 한 쪽 = 문장 하나. 대사 줄(「화자: "…"」)은 한 호흡이라 통째로 두고, 서술 줄은 문장 경계마다 쪼갠다 */
function splitSceneCaptionPages(caption: string): string[] {
  const pages: string[] = [];
  for (const line of caption.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (SCENE_DIALOGUE_LINE.test(trimmed)) { pages.push(trimmed); continue; }
    const sentences = trimmed.match(/[^.!?。…]+(?:[.!?。…]+[”’"'」』》]*|$)/g)?.map(sentence => sentence.trim()).filter(Boolean);
    pages.push(...(sentences && sentences.length > 0 ? sentences : [trimmed]));
  }
  return pages;
}

interface Props {
  images: { url: string; label?: string | null; caption?: string | null; kind?: 'scene'; ending?: LocalizedSceneEnding }[];
  title: string;
  /** 세력 표지는 원본 오른쪽에 제목을 위한 여백이 있다. */
  titleInArtwork?: boolean;
  onClose: () => void;
  nested?: boolean;
  /** 처음 열릴 장면 번호 — 닫았다 다시 열 때 읽던 장면을 되돌리려고 부모가 기억해 둔다 */
  initialIndex?: number;
  /** 장면이 바뀔 때마다 현재 번호를 알린다 */
  onIndexChange?: (index: number) => void;
}

/** 표지·인물 화보·주요 장면의 원본과 해설을 연다. 개요 읽기와 독립된 창이다. */
export default function FactionArtworkViewer({ images, title, titleInArtwork = false, onClose, nested = false, initialIndex = 0, onIndexChange }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tAccess = useTranslations("shared.accessibility");
  const [index, setIndex] = useState(() => Math.max(0, Math.min(images.length - 1, initialIndex)));
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  /* 장면 해설 자막 — 켜면 문장 한 쪽씩 넘겨 읽고, 끄면 해설 전체가 한 덩어리로 선다 */
  const [captionSplit, setCaptionSplit] = useState(true);
  /* 자막을 장면 안에서 한 쪽씩 넘긴다 — 장면이 바뀌면 첫 쪽으로 돌아간다 */
  const [captionPage, setCaptionPage] = useState(0);
  const [captionDragX, setCaptionDragX] = useState(0);
  const [captionSlideAnim, setCaptionSlideAnim] = useState(false);
  /* 전체화면 버튼으로 여는 별도 이미지 뷰어 — 거기서 상하좌우 팬·휠 줌·핀치 확대가 자유롭다 */
  const [inspectIndex, setInspectIndex] = useState<number | null>(null);
  const inspectImage = inspectIndex === null ? null : (images[inspectIndex] ?? null);
  const [dragX, setDragX] = useState(0);
  const [slideAnim, setSlideAnim] = useState(false);
  const pendingSlide = useRef<number | null>(null);
  const slideBoxRef = useRef<HTMLDivElement | null>(null);
  const closeNavigator = useCallback(() => setNavigatorOpen(false), []);
  const selectImage = useCallback((nextIndex: number) => {
    setIndex(nextIndex);
    setNavigatorOpen(false);
  }, []);
  const ending = images.at(-1)?.ending;
  const slideCount = images.length + (ending ? 1 : 0);
  const isEnding = Boolean(ending && index === images.length);
  const zIndex = Z_INDEX.modal + (nested ? 1 : 0);
  const [dimensions, setDimensions] = useState<{ url: string; ratio: number } | null>(null);
  useEffect(() => { onIndexChange?.(index) }, [index, onIndexChange]);
  const image = images[index] ?? images[0];
  /* 장면 해설의 자막 쪽 목록 — 장면이 아니면 빈 목록이라 넘길 게 없다 */
  const captionPages = useMemo(
    () => (image?.kind === "scene" && image.caption ? splitSceneCaptionPages(image.caption) : []),
    [image]
  );
  useEffect(() => {
    if ((slideCount < 2 && captionPages.length < 2) || navigatorOpen || inspectIndex !== null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End" && event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      if (event.key === "Home") setIndex(0);
      else if (event.key === "End") setIndex(slideCount - 1);
      /* ↑↓는 장면 안 자막을 넘긴다 — 자막 끝에서 장면을 넘어간다 */
      else if (event.key === "ArrowDown") {
        if (captionPage < captionPages.length - 1) setCaptionPage(current => current + 1);
        else setIndex(current => Math.min(slideCount - 1, current + 1));
      } else if (event.key === "ArrowUp") {
        if (captionPage > 0) setCaptionPage(current => current - 1);
        else setIndex(current => Math.max(0, current - 1));
      } else setIndex(current => Math.max(0, Math.min(slideCount - 1, current + (event.key === "ArrowLeft" ? -1 : 1))));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [slideCount, navigatorOpen, inspectIndex, captionPage, captionPages.length]);
  // 현재 그림이 도착한 뒤 다음 두 장만 받는다. 임의 번호 이동과 엔딩에서도 범위를 넘지 않는다.
  const preloadUrls = useMemo(() => !isEnding && dimensions?.url === image?.url
    ? images.slice(index + 1, index + 1 + PRELOAD_AHEAD).map(item => item.url)
    : [], [images, index, isEnding, dimensions?.url, image?.url]);
  usePreloadImages(preloadUrls);
  const move = (direction: number) => {
    setIndex(current => Math.max(0, Math.min(slideCount - 1, current + direction)));
  };
  /* 자막 넘기기 — 마지막 쪽에서 넘기면 다음 장면, 첫 쪽에서 거슬러가면 이전 장면으로 이어진다 */
  const captionNext = () => {
    if (captionPage < captionPages.length - 1) setCaptionPage(current => current + 1);
    else move(1);
  };
  const captionPrev = () => {
    if (captionPage > 0) setCaptionPage(current => current - 1);
    else move(-1);
  };
  /* 장면이 바뀌면 미끄러지던 위치를 푼다 (렌더 중 조정 패턴) */
  const [prevIndex, setPrevIndex] = useState(index);
  if (prevIndex !== index) {
    setPrevIndex(index);
    setDragX(0);
    setCaptionPage(0);
    setCaptionDragX(0);
  }
  /* 그림을 좌우로 밀면 장면이 넘어간다 — 미는 동안 그림이 손끝을 따라오고, 밀기 뒤에 따라오는 click은 삼킨다 */
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swipeConsumed = useRef(false);
  /* 자막 영역의 좌우 밀기는 자막 쪽 넘기기로 뺀다 — 그림 트랙이 손끝을 따라오지 않는다.
     대신 자막 글이 손끝을 따라 밀리고 이웃 쪽이 ±100%에서 따라 들어오는, 그림과 같은 미끄러짐을 준다 */
  const captionSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const captionSwipeConsumed = useRef(false);
  const pendingCaptionSlide = useRef<number | null>(null);
  const captionBoxRef = useRef<HTMLSpanElement | null>(null);
  const captionSwipeHandlers = {
    onPointerDown: (event: React.PointerEvent) => {
      pendingCaptionSlide.current = null;
      setCaptionSlideAnim(false);
      captionSwipeStart.current = { x: event.clientX, y: event.clientY };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const start = captionSwipeStart.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        /* 자막과 장면이 모두 끝이면 고무줄처럼 덜 따라온다 */
        const blocked = (dx > 0 && captionPage === 0 && index === 0)
          || (dx < 0 && captionPage === captionPages.length - 1 && index === slideCount - 1);
        setCaptionDragX(blocked ? dx * 0.35 : dx);
      } else {
        setCaptionDragX(0);
      }
    },
    onPointerUp: (event: React.PointerEvent) => {
      const start = captionSwipeStart.current;
      captionSwipeStart.current = null;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) captionSwipeConsumed.current = true;
      /* 자막 끝에서는 장면 끝까지 본다 — 자막 마지막 쪽에서 밀면 다음 장면으로 이어진다 */
      const canMove = dx < 0
        ? captionPage < captionPages.length - 1 || index < slideCount - 1
        : captionPage > 0 || index > 0;
      setCaptionSlideAnim(true);
      pendingCaptionSlide.current = Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && canMove ? (dx < 0 ? 1 : -1) : null;
      const boxWidth = captionBoxRef.current?.getBoundingClientRect().width ?? 0;
      setCaptionDragX(pendingCaptionSlide.current ? (dx < 0 ? -boxWidth : boxWidth) : 0);
    },
    onPointerCancel: () => { captionSwipeStart.current = null; pendingCaptionSlide.current = null; setCaptionSlideAnim(true); setCaptionDragX(0); },
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType !== "mouse" || !captionSwipeStart.current) return;
      captionSwipeStart.current = null;
      pendingCaptionSlide.current = null;
      setCaptionSlideAnim(true);
      setCaptionDragX(0);
    },
    onClickCapture: (event: React.MouseEvent) => {
      if (!captionSwipeConsumed.current) return;
      captionSwipeConsumed.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  /* 밀기 애니메이션이 끝나면 쪽 번호를 넘기고 트랙을 0으로 되돌린다 — 새 쪽이 제자리에 온 상태로 이어진다 */
  const finishCaptionSlide = (event: React.TransitionEvent) => {
    if (event.propertyName !== "transform") return;
    const step = pendingCaptionSlide.current;
    pendingCaptionSlide.current = null;
    setCaptionSlideAnim(false);
    if (step) (step > 0 ? captionNext : captionPrev)();
    setCaptionDragX(0);
  };
  const swipeHandlers = {
    onPointerDown: (event: React.PointerEvent) => {
      /* 밀기는 그림 영역 안에서 눌렀을 때만 시작한다 — 캡션·헤더는 스크롤·클릭 그대로 */
      if (!(event.target instanceof HTMLElement) || !event.target.closest("[data-artwork-viewer]")) return;
      /* 자막 위의 좌우 밀기는 자막 쪽 넘기기가 처리한다 — 그림은 움직이지 않는다 */
      if (event.target.closest("[data-caption-swipe]")) return;
      /* 진행 중이던 복귀·나가기 애니메이션을 끊고 다시 잡는다 */
      pendingSlide.current = null;
      setSlideAnim(false);
      swipeStart.current = { x: event.clientX, y: event.clientY };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const start = swipeStart.current;
      if (!start || slideCount < 2) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        /* 양끝 장면에서는 고무줄처럼 덜 따라오게 해 더 못 가는 자리를 알린다 — 끝은 그림이 아니라 엔딩 장면까지 센다 */
        const blocked = (dx > 0 && index === 0) || (dx < 0 && index === slideCount - 1);
        setDragX(blocked ? dx * 0.35 : dx);
      } else {
        setDragX(0);
      }
    },
    onPointerUp: (event: React.PointerEvent) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (!start || slideCount < 2) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      /* 조금이라도 밀었으면 그 뒤 click은 누르기가 아니다 — 헤더·버튼 클릭을 막는다 */
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swipeConsumed.current = true;
      /* 밀기 성립 → 그림이 끝까지 나가는 애니메이션을 돌리고, 끝나면 번호를 넘긴다 */
      const canMove = dx < 0 ? index < slideCount - 1 : index > 0;
      setSlideAnim(true);
      pendingSlide.current = Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && canMove ? (dx < 0 ? 1 : -1) : null;
      const boxWidth = slideBoxRef.current?.getBoundingClientRect().width ?? 0;
      setDragX(pendingSlide.current ? (dx < 0 ? -boxWidth : boxWidth) : 0);
    },
    onPointerCancel: () => { swipeStart.current = null; pendingSlide.current = null; setSlideAnim(true); setDragX(0); },
    /* 마우스로 누른 채 모달 밖으로 나가면 up이 안 온다 — 터치는 브라우저가 암묵 포착이라 제외 */
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType !== "mouse" || !swipeStart.current) return;
      swipeStart.current = null;
      pendingSlide.current = null;
      setSlideAnim(true);
      setDragX(0);
    },
    /* img 네이티브 드래그가 시작되면 pointerup이 안 와서 밀기가 죽는다 — 드래그 자체를 막는다 */
    onDragStart: (event: React.DragEvent) => event.preventDefault(),
    onClickCapture: (event: React.MouseEvent) => {
      if (!swipeConsumed.current) return;
      swipeConsumed.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  /* 나가기 애니메이션이 끝나면 번호를 넘기고 트랙을 0으로 되돌린다 — 새 그림이 제자리에 온 상태로 이어진다 */
  const finishSlide = (event: React.TransitionEvent) => {
    if (event.propertyName !== "transform") return;
    const step = pendingSlide.current;
    pendingSlide.current = null;
    setSlideAnim(false);
    if (step) move(step);
    setDragX(0);
  };
  /* 전체화면에서 넘기면 아래 장면 뷰어의 번호·저장 위치도 같이 따라간다 */
  const inspectMove = (direction: number) => {
    const next = Math.max(0, Math.min(images.length - 1, (inspectIndex ?? index) + direction));
    setInspectIndex(next);
    setIndex(next);
  };
  if (!image) return null;
  const isScene = image.kind === 'scene';
  /* 엔딩 장면도 장면 트랙의 한 칸이다 — index가 그림 수를 넘으면 image가 images[0]로 떨어지므로 index로 판별한다 */
  const sceneSlide = isScene || isEnding;
  const hasScenes = images.some(item => item.kind === 'scene');
  const fitToImage = titleInArtwork || sceneSlide;
  // 다음 그림이 준비될 때까지 이전 비율을 유지해, 넘길 때마다 임시 높이로 줄어들지 않게 한다.
  const ratio = dimensions?.ratio ?? (isScene ? 1 : 3 / 2);
  const artwork = <Image src={image.url} alt={image.label ?? title} fill unoptimized draggable={false} className="object-contain select-none"
    onLoad={(event) => {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      if (naturalHeight > 0) setDimensions({ url: image.url, ratio: naturalWidth / naturalHeight });
    }} />;
  /* 밀기 트랙의 옆자리 그림 — 현재 그림(artwork)만 로드 측정을 달고, 옆은 같은 틀을 재사용한다 */
  const slideImage = (item: (typeof images)[number]) => (
    <Image src={item.url} alt={item.label ?? title} fill unoptimized draggable={false} className="object-contain select-none" />
  );
  /* 그림이 없는 마지막 장면 — 트랙의 한 칸이라 밀면 옆 장면처럼 함께 들어오고 나간다 */
  const endingSlide = ending && (
    <div data-scene-ending className="h-full overflow-y-auto overscroll-contain">
      <article className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-6 py-10 text-center sm:px-10">
        <p className="mb-5 text-xs tracking-[0.3em] text-accent">ENDING</p>
        <h3 className="mb-8 break-keep text-2xl font-bold text-text-primary sm:text-3xl md:text-balance">{ending.title}</h3>
        <div className="space-y-5 break-keep text-sm leading-7 text-text-primary sm:text-base sm:leading-8">
          {ending.text.split(/\n\s*\n/).map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="md:text-balance"><FactionSceneText text={paragraph} /></p>)}
        </div>
      </article>
    </div>
  );
  /* 헤더 칸 — 장면은 장면 제목, 엔딩은 엔딩 제목이 서고 누르면 장면 바로가기가 열린다 */
  const headerLabel = titleInArtwork ? null : (isEnding ? ending?.title : isScene ? image.label : null);

  return (
    <>
    <Modal isOpen onClose={onClose} title={titleInArtwork || hasScenes ? undefined : title} ariaLabel={title} stickyHeader frame="plain"
      widthClassName={sceneSlide
        ? "w-full max-w-[min(1200px,100%)] md:w-[calc(var(--scene-image-height)*var(--artwork-ratio)_+_var(--artwork-controls))]"
        : "max-w-[1200px]"}
      boxClassName="overflow-hidden rounded-2xl border border-white/15 bg-bg-main text-sm leading-relaxed md:text-base [--scene-image-height:max(8rem,calc(100dvh_-_11rem))]"
      boxStyle={{ "--artwork-ratio": ratio, "--artwork-controls": slideCount > 1 ? "6rem" : "0rem" } as CSSProperties}
      closeOnEscape={!navigatorOpen} escapeCapture={nested} zIndex={zIndex}
      /* 본문 3열의 오른쪽 칸(3rem) 중앙에 X를 얹는다 — 칸 중심이 모서리에서 1.5rem이라 버튼 반폭 1rem을 뺀 end-2 */
      closeButtonClassName={`absolute end-2 ${titleInArtwork ? "top-2 sm:top-4" : "top-2.5 sm:top-3"} md:end-2 ${CLOSE_BUTTON_STYLE}`}>
      {/* PC에서는 본문 자체가 3열 — 양끝 좁은 칸 전체가 넘기기 버튼이다. 모바일은 하단 바가 담당한다 */}
      <div className={slideCount > 1 ? "md:grid md:grid-cols-[3rem_minmax(0,1fr)_3rem]" : undefined} {...swipeHandlers}>
        {slideCount > 1 && (
          <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("previousImage")}
            className="hidden items-center justify-center border-e border-white/10 text-text-secondary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:flex">
            <ChevronLeft size={20} aria-hidden />
          </button>
        )}
        {/* 가로 밀기로 장면 넘기기 — 그림·캡션·엔딩 어디서 밀어도 먹는다. pan-y로 세로 스크롤은 브라우저에 남긴다 */}
        <div className="min-w-0" style={{ touchAction: "pan-y" }}>
          {/* 장면 제목 헤더 — 그림 위에 겹치지 않고 그림 위에 선다. 누르면 장면 바로가기가 열린다. 엔딩 장면은 엔딩 제목이 선다 */}
          {headerLabel && (
            <button type="button" aria-haspopup="dialog" aria-label={`${headerLabel} · ${t("selectImage")}`}
              onClick={() => setNavigatorOpen(true)}
              className="w-full border-b border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-text-primary outline-none hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
              {headerLabel}
            </button>
          )}
          <div className={fitToImage ? "@container relative mx-auto overflow-hidden bg-black/40" : "relative h-[min(70dvh,800px)] overflow-hidden bg-black/40"}
            // 높이를 고정하면 모바일에서 폭만 줄어 검은 여백이 남는다. 폭을 제한하고 높이는 원본 비율로 정한다.
            style={fitToImage ? { aspectRatio: ratio, width: `min(100%, ${sceneSlide ? "var(--scene-image-height)" : "70dvh"} * ${ratio})` } : undefined} data-artwork-viewer>
            {sceneSlide ? (
              /* 전체화면 버튼으로 별도 이미지 뷰어를 연다 — 거기서 상하좌우 팬·줌이 자유롭다.
                 깨끗한 눌림도 전체보기다 — 밀기로 끝난 클릭은 바깥 capture 단계에서 삼켜져 여기까지 오지 않는다 */
              <div ref={slideBoxRef} data-scene-zoombox onClick={(event) => {
                if (isEnding || (event.target instanceof HTMLElement && event.target.closest("button, a"))) return;
                setInspectIndex(index);
              }} className="absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing">
                <div className="absolute inset-0"
                  /* 밀기 중에는 transition을 끊어 손끝에 붙고, 놓으면 160ms로 마저 간다. 옆자리 그림·엔딩이 ±100%에서 따라 들어온다 */
                  onTransitionEnd={finishSlide}
                  style={{ transform: `translateX(${dragX}px)`, transition: slideAnim ? "transform 160ms ease-out" : "none" }}>
                  {[-1, 0, 1].map(offset => {
                    const slideIndex = index + offset;
                    const item = images[slideIndex];
                    const endingHere = ending != null && slideIndex === images.length;
                    if (!item && !endingHere) return null;
                    return (
                      <div key={item?.url ?? "ending"} className="absolute top-0 h-full w-full" style={{ left: `${offset * 100}%` }}>
                        {endingHere ? endingSlide : item ? (offset === 0 ? artwork : slideImage(item)) : null}
                      </div>
                    );
                  })}
                </div>
                {!isEnding && (
                /* 우상단 조작 칸 — 자막 토글(장면만)과 확대. 번호 칩이 좌상단이라 여기가 비어 있다 */
                <div className="absolute end-2 top-2 z-10 flex gap-2">
                  {isScene && image.caption && (
                  <button type="button" data-scene-captions aria-pressed={captionSplit}
                    aria-label={t(captionSplit ? "captionShowAll" : "captionPaginate")} title={t(captionSplit ? "captionShowAll" : "captionPaginate")}
                    onClick={() => setCaptionSplit(on => !on)}
                    className={`flex min-h-9 min-w-9 items-center justify-center rounded-full border bg-black/75 px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${captionSplit ? "border-accent text-accent" : "border-white/25 text-white hover:border-accent hover:text-accent"}`}>
                    {captionSplit ? <TextAlignJustify size={16} /> : <Rows3 size={16} />}
                  </button>)}
                  <button type="button" data-scene-zoom aria-label={t("enlargeImage")} title={t("enlargeImage")}
                    onClick={() => setInspectIndex(index)}
                    className="flex min-h-9 min-w-9 items-center justify-center rounded-full border border-white/25 bg-black/75 px-2.5 text-white outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                    <Maximize size={16} />
                  </button>
                </div>)}
              </div>
            ) :
            <button type="button" onClick={onClose} aria-label={tAccess("close")} data-artwork-dismiss
              className="absolute inset-0 cursor-zoom-out outline-none hover:ring-1 hover:ring-inset hover:ring-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
              <div className="absolute inset-0" onTransitionEnd={finishSlide}
                style={{ transform: `translateX(${dragX}px)`, transition: slideAnim ? "transform 160ms ease-out" : "none" }}>
                {[-1, 0, 1].map(offset => {
                  const item = images[index + offset];
                  if (!item) return null;
                  return (
                    <div key={item.url} className="absolute top-0 h-full w-full" style={{ left: `${offset * 100}%` }}>
                      {offset === 0 ? artwork : slideImage(item)}
                    </div>
                  );
                })}
              </div>
            </button>}
            {titleInArtwork && !isScene && !isEnding && <FactionArtworkTitle title={title} heading />}
            {/* 장면 해설은 그림 아래 깔리는 자막 — 기본은 한 쪽씩 크게 읽고, 눌러서 넘긴다. ‹ ›는 끝에서 장면을 넘으니 자막이 서는 한 항상 둔다 */}
            {isScene && !isEnding && image.caption && !captionSplit && (
              <div data-artwork-caption-frame className="absolute inset-x-0 bottom-0 z-10 max-h-[55%] overflow-y-auto overscroll-contain bg-gradient-to-t from-black/90 via-black/65 to-transparent px-4 pb-4 pt-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6">
                <p data-artwork-caption className="mx-auto w-full max-w-3xl whitespace-pre-line break-keep text-center text-base leading-relaxed text-white [overflow-wrap:anywhere] md:text-balance md:text-lg">
                  <FactionSceneText text={image.caption} />
                </p>
              </div>
            )}
            {isScene && !isEnding && image.caption && captionSplit && (
              <div data-artwork-caption-frame data-caption-swipe {...captionSwipeHandlers} style={{ touchAction: "pan-y" }}
                className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-3 pb-3 pt-10 md:px-6">
                {captionPages.length > 1 && (
                  <p data-scene-caption-counter className="mb-1 text-center text-xs tabular-nums text-white/50">{captionPage + 1} / {captionPages.length}</p>)}
                {/* ‹ ›는 아래 기준으로 붙는다 — 자막칸이 아래로 고정이라 쪽마다 글 높이가 달라도 단추가 흔들리지 않는다 */}
                <div className="mx-auto flex w-full max-w-3xl items-end gap-1.5 sm:gap-3">
                  <button type="button" data-scene-caption-prev aria-label={t("captionPrevious")} onClick={captionPrev}
                    disabled={captionPage === 0 && index === 0}
                    className="mb-0.5 flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/60 px-1.5 text-white outline-none enabled:hover:border-accent enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:min-h-9 md:min-w-9">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" data-artwork-caption onClick={captionNext} aria-live="polite"
                    title={t("captionNext")}
                    className="relative max-h-[38dvh] min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain whitespace-pre-line break-keep py-1 text-center text-lg font-medium leading-relaxed text-white outline-none [overflow-wrap:anywhere] [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-scrollbar]:hidden md:text-balance md:text-xl">
                    {/* 이웃 쪽은 ±100% 자리에서 따라 들어온다 — 현재 쪽만 흐름에 놓아 높이를 정한다 */}
                    <span ref={captionBoxRef} onTransitionEnd={finishCaptionSlide} className="relative block"
                      style={{ transform: `translateX(${captionDragX}px)`, transition: captionSlideAnim ? "transform 160ms ease-out" : "none" }}>
                      {[-1, 0, 1].map(offset => {
                        const pageText = captionPages[captionPage + offset];
                        if (pageText === undefined) return null;
                        return (
                          <span key={captionPage + offset} className={offset === 0 ? "block" : "absolute top-0 block w-full"}
                            style={offset === 0 ? undefined : { left: `${offset * 100}%` }}>
                            <FactionSceneText text={pageText} />
                          </span>
                        );
                      })}
                    </span>
                  </button>
                  <button type="button" data-scene-caption-next aria-label={t("captionNext")} onClick={captionNext}
                    disabled={captionPage === captionPages.length - 1 && index === slideCount - 1}
                    className="mb-0.5 flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/60 px-1.5 text-white outline-none enabled:hover:border-accent enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:min-h-9 md:min-w-9">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
            {/* 장면 번호는 좌상단 칩 — 클릭 불가, 읽기 표시다. 엔딩은 마지막 번호를 쓴다 */}
            <span data-scene-counter aria-live="polite" className="pointer-events-none absolute start-2 top-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-xs tabular-nums text-white/90">
              {index + 1} / {slideCount}
            </span>
          </div>
          {/* 표지·인물 화보처럼 장면이 아닌 그림의 캡션은 그림 아래 칸에 선다 — 장면 해설은 자막 오버레이가 담당한다 */}
          {!isEnding && !isScene && image.caption && (
            <div key={image.url} data-artwork-caption-frame className="px-4 py-4 md:px-8 md:py-5">
              <p data-artwork-caption className="mx-auto w-full max-w-3xl whitespace-pre-line break-keep text-center text-sm leading-relaxed text-text-primary [overflow-wrap:anywhere] md:text-base">
                {image.caption}
              </p>
            </div>
          )}
        </div>
        {slideCount > 1 && (
          <button type="button" onClick={() => move(1)} disabled={index === slideCount - 1} aria-label={ending && index === images.length - 1 ? t("readEnding") : t("nextImage")}
            className="hidden items-center justify-center border-s border-white/10 text-text-secondary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:flex">
            <ChevronRight size={20} aria-hidden />
          </button>
        )}
      </div>
      {slideCount > 1 && (
        /* 모바일: « ‹ 스크러버 › » 다섯 칸. PC: 본문과 같은 3열 — 1·3열 레일에 « », 가운데에 스크러버(좌우 한 칸 넘기기는 본문 가장자리 칸이 담당) */
        <div className="sticky bottom-0 z-20 grid h-14 grid-cols-[1fr_1fr_minmax(0,2.5fr)_1fr_1fr] divide-x divide-white/10 border-t border-white/10 bg-bg-main/95 backdrop-blur-sm md:h-12 md:grid-cols-[3rem_minmax(0,1fr)_3rem]">
          <button type="button" onClick={() => setIndex(0)} disabled={index === 0} aria-label={t("firstImage")}
            className="flex items-center justify-center text-text-secondary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25">
            <ChevronsLeft size={18} aria-hidden />
          </button>
          <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("previousImage")}
            className="flex items-center justify-center text-text-primary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:hidden">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <div className="flex min-w-0 items-center justify-center px-3 md:px-4">
            {hasScenes ? (
              /* 장면 스크러버 — 끌거나 눌러 그 자리로 간다. 키보드 ←→는 input이라 전역 핸들러가 건너뛰고 네이티브 한 칸 이동이 먹는다 */
              <input type="range" data-scene-slider min={0} max={slideCount - 1} step={1} value={index}
                aria-label={t("imageNumber", { count: slideCount })}
                onChange={(event) => setIndex(Number(event.target.value))}
                className="h-10 w-full cursor-grab accent-accent outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing" />
            ) : (
              <span data-scene-counter aria-live="polite" className="min-w-16 text-center text-sm tabular-nums text-text-secondary">{isEnding ? "ENDING" : index + 1}</span>
            )}
          </div>
          <button type="button" onClick={() => move(1)} disabled={index === slideCount - 1} aria-label={ending && index === images.length - 1 ? t("readEnding") : t("nextImage")}
            className="flex items-center justify-center text-text-primary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:hidden">
            <ChevronRight size={20} aria-hidden />
          </button>
          <button type="button" onClick={() => setIndex(slideCount - 1)} disabled={index === slideCount - 1} aria-label={t("lastImage")}
            className="flex items-center justify-center text-text-secondary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25">
            <ChevronsRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </Modal>
    {navigatorOpen && <FactionSceneNavigator images={images} title={title} activeIndex={index} endingTitle={ending?.title}
      onSelect={selectImage} onClose={closeNavigator} zIndex={zIndex + 1} />}
    {inspectImage && <ImageViewerModal src={inspectImage.url} alt={inspectImage.label ?? title} caption={inspectImage.caption}
      isOpen onClose={() => setInspectIndex(null)}
      onPrev={inspectIndex !== null && inspectIndex > 0 ? () => inspectMove(-1) : undefined}
      onNext={inspectIndex !== null && inspectIndex < images.length - 1 ? () => inspectMove(1) : undefined} />}
    </>
  );
}
