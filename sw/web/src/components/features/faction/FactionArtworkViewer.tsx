"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Rows3, TextAlignJustify, X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { CLOSE_BUTTON_STYLE } from "@/components/ui/Modal";
import FactionArtworkTitle from "./FactionArtworkTitle";
import { Z_INDEX } from "@/constants/zIndex";
import type { LocalizedSceneEnding } from "@feelandnote/shared/lib/faction-team-image";
import FactionSceneNavigator from "./FactionSceneNavigator";
import FactionSceneText, { SCENE_DIALOGUE_LINE } from "./FactionSceneText";
import { usePreloadImages } from "@/hooks/usePreloadImages";
import { useWheelPaging } from "@/hooks/useWheelPaging";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

const PRELOAD_AHEAD = 2;
/* 줌 모드의 휠 배율 — 커서 지점을 고정해 키우고 줄인다 */
const MAX_ZOOM = 10;
const WHEEL_ZOOM_STEP = 1.35;

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
  /* 줌 모드 — 그림을 깨끗하게 누르면 켜지고(휠=배율, 끌기=이동) 다시 누르거나 Esc로 빠진다.
     평시에는 휠·가로 밀기가 장면 넘기기다 */
  const [zoomMode, setZoomMode] = useState(false);
  const [zoomView, setZoomView] = useState({ scale: 1, x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const zoomDrag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [slideAnim, setSlideAnim] = useState(false);
  /* 타이틀아트 제목을 칠해진 그림 영역에 맞추려고 그림별 가로세로비를 잰다 */
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const pendingSlide = useRef<number | null>(null);
  const viewerBodyRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeNavigator = useCallback(() => setNavigatorOpen(false), []);
  const selectImage = useCallback((nextIndex: number) => {
    setIndex(nextIndex);
    setNavigatorOpen(false);
  }, []);
  const ending = images.at(-1)?.ending;
  const slideCount = images.length + (ending ? 1 : 0);
  const isEnding = Boolean(ending && index === images.length);
  const zIndex = Z_INDEX.modal + (nested ? 1 : 0);
  useEffect(() => { onIndexChange?.(index) }, [index, onIndexChange]);
  const image = images[index] ?? images[0];
  /* 장면 해설의 자막 쪽 목록 — 장면이 아니면 빈 목록이라 넘길 게 없다 */
  const captionPages = useMemo(
    () => (image?.kind === "scene" && image.caption ? splitSceneCaptionPages(image.caption) : []),
    [image]
  );
  useEffect(() => {
    if ((slideCount < 2 && captionPages.length < 2) || navigatorOpen) return;
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
  }, [slideCount, navigatorOpen, captionPage, captionPages.length]);
  // 다음 두 장을 미리 받는다. 임의 번호 이동과 엔딩에서도 범위를 넘지 않는다.
  const preloadUrls = useMemo(() => images.slice(index + 1, index + 1 + PRELOAD_AHEAD).map(item => item.url), [images, index]);
  usePreloadImages(preloadUrls);
  const move = (direction: number) => {
    setIndex(current => Math.max(0, Math.min(slideCount - 1, current + direction)));
  };
  /* 휠·트랙패드 스크롤은 장면 넘기기 — 줌 모드에서는 휠이 배율을 바꾸고, 장면 바로가기가 떠 있으면 거기가 쓴다 */
  useWheelPaging(viewerBodyRef, { onPrev: () => move(-1), onNext: () => move(1), enabled: slideCount > 1 && !navigatorOpen && !zoomMode });
  /* 줌 모드의 휠 — 커서가 가리킨 지점을 고정해 배율을 바꾼다(전체화면 공용 뷰어와 같은 수학) */
  useEffect(() => {
    const element = viewerBodyRef.current;
    if (!element || !zoomMode) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const cx = event.clientX - (rect.left + rect.width / 2);
      const cy = event.clientY - (rect.top + rect.height / 2);
      const factor = event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
      setZoomView((v) => {
        const scale = Math.min(MAX_ZOOM, Math.max(1, v.scale * factor));
        if (scale === 1) return { scale: 1, x: 0, y: 0 };
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [zoomMode]);
  /* Esc는 줌 모드부터 빠지고 그다음 창을 닫는다 — nested면 캡처로 아래 깔린 모달보다 먼저 잡는다.
     전체화면 창이라 바깥 스크롤은 공용 카운트 잠금으로 직접 잠근다 */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      /* 바로가기가 떠 있으면 그 모달이 Esc를 처리한다 — 여기서 전파를 끊으면 바로가기가 못 닫는다 */
      if (navigatorOpen) return;
      if (nested) event.stopImmediatePropagation();
      if (zoomMode) { setZoomMode(false); setZoomView({ scale: 1, x: 0, y: 0 }); return; }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown, nested);
    lockBodyScroll();
    return () => { document.removeEventListener("keydown", onKeyDown, nested); unlockBodyScroll(); };
  }, [onClose, nested, navigatorOpen, zoomMode]);
  /* 모달이 하던 일 — 열릴 때 닫기 버튼으로 포커스를 옮기고, 닫히면 열었던 요소로 돌려준다 */
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => previous?.focus();
  }, []);
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
    setZoomMode(false);
    setZoomView({ scale: 1, x: 0, y: 0 });
    setPanning(false);
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
      /* 밀기는 본문 영역 안에서 눌렀을 때만 시작한다 — 캡션·버튼은 스크롤·클릭 그대로 */
      if (!(event.target instanceof HTMLElement) || !event.target.closest("[data-artwork-viewer]")) return;
      /* 자막 위의 좌우 밀기는 자막 쪽 넘기기가 처리한다 — 그림은 움직이지 않는다 */
      if (event.target.closest("[data-caption-swipe]")) return;
      /* 진행 중이던 복귀·나가기 애니메이션을 끊고 다시 잡는다 */
      pendingSlide.current = null;
      setSlideAnim(false);
      swipeStart.current = { x: event.clientX, y: event.clientY };
      zoomDrag.current = { x: event.clientX, y: event.clientY, vx: zoomView.x, vy: zoomView.y };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const start = swipeStart.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      /* 확대된 그림에서는 끌기가 팬이다 — 장면 넘기기는 1배에서만 */
      if (zoomView.scale > 1) {
        if (Math.hypot(dx, dy) > 6) {
          if (!panning) setPanning(true);
          setZoomView((v) => ({ ...v, x: zoomDrag.current!.vx + dx, y: zoomDrag.current!.vy + dy }));
        }
        return;
      }
      if (slideCount < 2) return;
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
      zoomDrag.current = null;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      /* 팬으로 끝난 눌림은 클릭이 아니다 — 줌 토글이 발동하지 않게 삼킨다 */
      if (zoomView.scale > 1) {
        setPanning(false);
        if (Math.hypot(dx, dy) > 8) swipeConsumed.current = true;
        return;
      }
      if (slideCount < 2) return;
      /* 조금이라도 밀었으면 그 뒤 click은 누르기가 아니다 — 헤더·버튼 클릭을 막는다 */
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swipeConsumed.current = true;
      /* 밀기 성립 → 그림이 끝까지 나가는 애니메이션을 돌리고, 끝나면 번호를 넘긴다 */
      const canMove = dx < 0 ? index < slideCount - 1 : index > 0;
      setSlideAnim(true);
      pendingSlide.current = Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && canMove ? (dx < 0 ? 1 : -1) : null;
      const boxWidth = viewerBodyRef.current?.getBoundingClientRect().width ?? 0;
      setDragX(pendingSlide.current ? (dx < 0 ? -boxWidth : boxWidth) : 0);
    },
    onPointerCancel: () => { swipeStart.current = null; zoomDrag.current = null; pendingSlide.current = null; setPanning(false); setSlideAnim(true); setDragX(0); },
    /* 마우스로 누른 채 화면 밖으로 나가면 up이 안 온다 — 터치는 브라우저가 암묵 포착이라 제외 */
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType !== "mouse" || !swipeStart.current) return;
      swipeStart.current = null;
      zoomDrag.current = null;
      pendingSlide.current = null;
      setPanning(false);
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
  if (!image) return null;
  const isScene = image.kind === 'scene';
  const hasScenes = images.some(item => item.kind === 'scene');
  const artwork = <Image src={image.url} alt={image.label ?? title} fill unoptimized draggable={false} className="object-contain select-none"
    onLoad={(event) => {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      if (naturalHeight > 0) setRatios(map => (map[image.url] ? map : { ...map, [image.url]: naturalWidth / naturalHeight }));
    }} />;
  /* 밀기 트랙의 옆자리 그림 — 현재 그림(artwork)만 로드 측정을 달고, 옆은 같은 틀을 재사용한다 */
  const slideImage = (item: (typeof images)[number]) => (
    <Image src={item.url} alt={item.label ?? title} fill unoptimized draggable={false} className="object-contain select-none" />
  );
  /* 타이틀아트는 그림 안 오른쪽 스트립에 제목을 얹는다 — 전체화면에서 object-contain은 그림을 중앙에 축소하니
     칠해진 그림 영역과 같은 비율의 상자를 만들고 거기에 제목을 얹는다(cqh = 본문 컨테이너 높이) */
  const imageRatio = ratios[image.url];
  /* 그림이 없는 마지막 장면 — 트랙의 한 칸이라 밀면 옆 장면처럼 함께 들어오고 나간다 */
  const endingSlide = ending && (
    <div data-scene-ending data-wheel-pass className="h-full overflow-y-auto overscroll-contain">
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

  /* 본문 위 깨끗한 눌림은 줌 모드 토글 — 버튼·자막·입력 위의 눌림과 밀기로 끝난 클릭(capture에서 삼켜진다)은 아니다 */
  const toggleZoom = (event: React.MouseEvent) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    if (el.closest("button, a, input, [data-wheel-pass], [data-caption-swipe]")) return;
    if (isEnding) return;
    if (zoomMode) { setZoomMode(false); setZoomView({ scale: 1, x: 0, y: 0 }); }
    else setZoomMode(true);
  };
  const exitZoom = () => { setZoomMode(false); setZoomView({ scale: 1, x: 0, y: 0 }); };

  return (
    <>
    {/* 장면 뷰어는 전체화면 한 겹 — 창 안의 창(중간 모듈)은 없다. 스크롤 잠금·Esc는 이 컴포넌트가 직접 쥔다 */}
    {createPortal(
      <div role="dialog" aria-modal="true" aria-label={title}
        className="fixed inset-0 flex flex-col bg-bg-main" style={{ zIndex }}>
        {/* 상단 바 — 번호 칩 · 장면 제목(누르면 바로가기) · 자막 나누기/줌/닫기 */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-2">
          <span data-scene-counter aria-live="polite" className="shrink-0 rounded-md bg-black/60 px-2 py-0.5 text-xs tabular-nums text-white/90">
            {index + 1} / {slideCount}
          </span>
          {headerLabel ? (
            <button type="button" aria-haspopup="dialog" aria-label={`${headerLabel} · ${t("selectImage")}`}
              onClick={() => setNavigatorOpen(true)}
              className="min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-center text-sm font-semibold text-text-primary outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
              {headerLabel}
            </button>
          ) : <span className="min-w-0 flex-1" aria-hidden />}
          <div className="flex shrink-0 items-center gap-1.5">
            {isScene && !isEnding && image.caption && (
            <button type="button" data-scene-captions aria-pressed={captionSplit}
              aria-label={t(captionSplit ? "captionShowAll" : "captionPaginate")} title={t(captionSplit ? "captionShowAll" : "captionPaginate")}
              onClick={() => setCaptionSplit(on => !on)}
              className={`flex min-h-9 min-w-9 items-center justify-center rounded-full border px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${captionSplit ? "border-accent text-accent" : "border-white/25 text-white hover:border-accent hover:text-accent"}`}>
              {captionSplit ? <TextAlignJustify size={16} /> : <Rows3 size={16} />}
            </button>)}
            {!isEnding && (
            <button type="button" data-scene-zoom aria-pressed={zoomMode}
              aria-label={zoomMode ? t("zoomExit") : t("enlargeImage")} title={zoomMode ? t("zoomExit") : t("enlargeImage")}
              onClick={() => (zoomMode ? exitZoom() : setZoomMode(true))}
              className={`flex min-h-9 min-w-9 items-center justify-center rounded-full border px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${zoomMode ? "border-accent text-accent" : "border-white/25 text-white hover:border-accent hover:text-accent"}`}>
              {zoomMode ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
            </button>)}
            <button type="button" ref={closeButtonRef} onClick={onClose} aria-label={tAccess("close")} data-artwork-dismiss className={CLOSE_BUTTON_STYLE}>
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>
        {/* 본문 — 장면 트랙. 가로 밀기·휠로 넘기고, 깨끗한 눌림은 줌 모드다. pan-y로 세로 스크롤은 브라우저에 남긴다 */}
        <div ref={viewerBodyRef} data-artwork-viewer {...swipeHandlers} onClick={toggleZoom}
          className={`@container relative min-h-0 flex-1 overflow-hidden bg-black ${zoomView.scale > 1 ? (panning ? "cursor-grabbing" : "cursor-grab") : zoomMode ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          style={{ touchAction: "pan-y" }}>
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
                <div key={item?.url ?? "ending"} className="absolute top-0 h-full w-full" data-artwork-current={offset === 0 || undefined}
                  style={offset === 0
                    ? { left: 0, transform: `translate(${zoomView.x}px, ${zoomView.y}px) scale(${zoomView.scale})`, transformOrigin: "center", transition: panning ? "none" : "transform 150ms" }
                    : { left: `${offset * 100}%` }}>
                  {endingHere ? endingSlide : item ? (offset === 0 ? artwork : slideImage(item)) : null}
                </div>
              );
            })}
          </div>
          {titleInArtwork && !isScene && !isEnding && imageRatio && (
            <div className="@container pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ aspectRatio: imageRatio, width: `min(100%, calc(100cqh * ${imageRatio}))` }}>
              <FactionArtworkTitle title={title} heading />
            </div>
          )}
          {/* 장면 해설은 그림 아래 깔리는 자막 — 기본은 한 쪽씩 크게 읽고, 눌러서 넘긴다. ‹ ›는 끝에서 장면을 넘으니 자막이 서는 한 항상 둔다 */}
          {isScene && !isEnding && image.caption && !captionSplit && (
            <div data-artwork-caption-frame data-wheel-pass className="absolute inset-x-0 bottom-0 z-10 max-h-[55%] overflow-y-auto overscroll-contain bg-gradient-to-t from-black/90 via-black/65 to-transparent px-4 pb-4 pt-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6">
              <p data-artwork-caption className="mx-auto w-full max-w-3xl whitespace-pre-line break-keep text-center text-base leading-relaxed text-white [overflow-wrap:anywhere] md:text-balance md:text-lg">
                <FactionSceneText text={image.caption} />
              </p>
            </div>
          )}
          {isScene && !isEnding && image.caption && captionSplit && (
            <div data-artwork-caption-frame data-caption-swipe data-wheel-pass {...captionSwipeHandlers} style={{ touchAction: "pan-y" }}
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
          {/* PC 양끝 ‹ › — 모바일은 하단 바가 담당한다 */}
          {slideCount > 1 && (
            <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("previousImage")}
              className="absolute start-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/25 bg-black/60 p-2 text-white/80 outline-none enabled:hover:border-accent enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:flex">
              <ChevronLeft size={24} />
            </button>
          )}
          {slideCount > 1 && (
            <button type="button" onClick={() => move(1)} disabled={index === slideCount - 1} aria-label={ending && index === images.length - 1 ? t("readEnding") : t("nextImage")}
              className="absolute end-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/25 bg-black/60 p-2 text-white/80 outline-none enabled:hover:border-accent enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:flex">
              <ChevronRight size={24} />
            </button>
          )}
        </div>
        {/* 표지·인물 화보처럼 장면이 아닌 그림의 캡션은 본문 아래 칸에 선다 — 장면 해설은 자막 오버레이가 담당한다 */}
        {!isEnding && !isScene && image.caption && (
          <div key={image.url} data-artwork-caption-frame className="shrink-0 border-t border-white/10 px-4 py-4 md:px-8">
            <p data-artwork-caption className="mx-auto w-full max-w-3xl whitespace-pre-line break-keep text-center text-sm leading-relaxed text-text-primary [overflow-wrap:anywhere] md:text-base">
              {image.caption}
            </p>
          </div>
        )}
        {slideCount > 1 && (
          /* 모바일: « ‹ 스크러버 › » 다섯 칸. PC: 3열 — 1·3열 레일에 « », 가운데에 스크러버(좌우 한 칸 넘기기는 본문 가장자리 버튼과 휠이 담당) */
          <div className="grid h-14 shrink-0 grid-cols-[1fr_1fr_minmax(0,2.5fr)_1fr_1fr] divide-x divide-white/10 border-t border-white/10 bg-bg-main/95 backdrop-blur-sm md:h-12 md:grid-cols-[3rem_minmax(0,1fr)_3rem]">
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
      </div>,
      document.body,
    )}
    {navigatorOpen && <FactionSceneNavigator images={images} title={title} activeIndex={index} endingTitle={ending?.title}
      onSelect={selectImage} onClose={closeNavigator} zIndex={zIndex + 1} />}
    </>
  );
}
