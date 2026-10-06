"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Info, Rows3, TextAlignJustify, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { CLOSE_BUTTON_STYLE } from "@/components/ui/Modal";
import FactionArtworkTitle from "./FactionArtworkTitle";
import FactionArtworkHelp from "./FactionArtworkHelp";
import { Z_INDEX } from "@/constants/zIndex";
import type { LocalizedSceneEnding } from "@feelandnote/shared/lib/faction-team-image";
import FactionSceneNavigator from "./FactionSceneNavigator";
import FactionSceneText, { SCENE_DIALOGUE_LINE } from "./FactionSceneText";
import FactionCaptionSize, { CAPTION_SIZE_CLASSES, type CaptionSize } from "./FactionCaptionSize";
import FactionCaptionHeight, { CAPTION_HEIGHT_OFFSETS, type CaptionHeight } from "./FactionCaptionHeight";
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
  const [captionSize, setCaptionSize] = useState<CaptionSize>("medium");
  const captionSizeClass = CAPTION_SIZE_CLASSES[captionSize];
  const [captionHeight, setCaptionHeight] = useState<CaptionHeight>("low");
  const captionBottom = CAPTION_HEIGHT_OFFSETS[captionHeight];
  const captionBackdropClass = captionHeight === "low"
    ? "bg-gradient-to-t from-black/90 via-black/65 to-transparent"
    : "bg-gradient-to-b from-transparent via-black/75 to-transparent";
  /* 자막을 장면 안에서 한 쪽씩 넘긴다 — 장면이 바뀌면 첫 쪽으로 돌아간다 */
  const [captionPage, setCaptionPage] = useState(0);
  const [entryCaptionPage, setEntryCaptionPage] = useState(0);
  const [captionDragX, setCaptionDragX] = useState(0);
  const [captionSlideAnim, setCaptionSlideAnim] = useState(false);
  /* 자막을 누르면 텍스트 선택 모드 — 전체 해설이 선택 가능한 글로 서고 복사 칩이 붙는다 */
  const [captionSelect, setCaptionSelect] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* 상단 ⓘ — 영역별 조작법을 보여주는 패널 */
  const [infoOpen, setInfoOpen] = useState(false);
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
  const pendingNavigationAnimation = useRef<{ target: "scene" | "caption"; direction: number } | null>(null);
  const closeNavigator = useCallback(() => setNavigatorOpen(false), []);
  const selectImage = useCallback((nextIndex: number) => {
    setCaptionPage(0);
    setEntryCaptionPage(0);
    setIndex(nextIndex);
    setNavigatorOpen(false);
  }, []);
  const ending = images.at(-1)?.ending;
  const slideCount = images.length + (ending ? 1 : 0);
  const isEnding = Boolean(ending && index === images.length);
  const zIndex = Z_INDEX.modal + (nested ? 1 : 0);
  useEffect(() => { onIndexChange?.(index) }, [index, onIndexChange]);
  const image = images[index] ?? images[0];
  /* 칠해진 그림 영역 계산용 가로세로비 — 그림이 로드되기 전엔 없다 */
  const imageRatio = image ? ratios[image.url] : undefined;
  /* 장면 해설의 자막 쪽 목록 — 장면이 아니면 빈 목록이라 넘길 게 없다 */
  const captionPages = useMemo(
    () => (image?.kind === "scene" && image.caption ? splitSceneCaptionPages(image.caption) : []),
    [image]
  );
  // 슬라이더도 표시 중인 최소 단위가 한 칸이다.
  const navigationStops = useMemo(() => [
    ...images.flatMap((item, sceneIndex) => {
      const count = captionSplit && item.kind === "scene" && item.caption
        ? Math.max(1, splitSceneCaptionPages(item.caption).length) : 1;
      return Array.from({ length: count }, (_, page) => ({ index: sceneIndex, page }));
    }),
    ...(ending ? [{ index: images.length, page: 0 }] : []),
  ], [images, captionSplit, ending]);
  const navigationPosition = Math.max(0, navigationStops.findIndex(stop => stop.index === index && stop.page === (captionSplit ? captionPage : 0)));
  const selectPosition = (position: number) => {
    const stop = navigationStops[position];
    if (!stop) return;
    if (stop.index === index) setCaptionPage(stop.page);
    else { setEntryCaptionPage(stop.page); setIndex(stop.index); }
  };
  const move = useCallback((direction: number) => {
    setIndex(current => Math.max(0, Math.min(slideCount - 1, current + direction)));
  }, [slideCount]);
  const paginatedCaption = captionSplit && !isEnding && captionPages.length > 0;
  /* 버튼·방향키·휠·자막 밀기는 같은 순서로 이동한다. 이전 장면으로 돌아갈 때는 마지막 자막부터 읽는다. */
  const navigate = useCallback((direction: number) => {
    if (paginatedCaption) {
      const nextPage = captionPage + direction;
      if (nextPage >= 0 && nextPage < captionPages.length) {
        pendingNavigationAnimation.current = { target: "caption", direction };
        setCaptionPage(nextPage);
        return;
      }
    }
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= slideCount) return;
    pendingNavigationAnimation.current = { target: "scene", direction };
    const previousImage = images[nextIndex];
    setEntryCaptionPage(direction < 0 && captionSplit && previousImage?.kind === "scene" && previousImage.caption
      ? Math.max(0, splitSceneCaptionPages(previousImage.caption).length - 1) : 0);
    move(direction);
  }, [paginatedCaption, captionPage, captionPages.length, index, slideCount, images, captionSplit, move]);
  const canPrevious = index > 0 || (paginatedCaption && captionPage > 0);
  const canNext = index < slideCount - 1 || (paginatedCaption && captionPage < captionPages.length - 1);
  const hasNavigation = slideCount > 1 || (paginatedCaption && captionPages.length > 1);
  const previousLabel = t(paginatedCaption ? "captionPrevious" : "previousImage");
  const nextLabel = paginatedCaption && captionPage < captionPages.length - 1 ? t("captionNext")
    : ending && index === images.length - 1 ? t("readEnding") : t(paginatedCaption ? "captionNext" : "nextImage");
  useEffect(() => {
    if ((slideCount < 2 && captionPages.length < 2) || navigatorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End" && event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      if (event.key === "Home") { setEntryCaptionPage(0); setCaptionPage(0); setIndex(0); }
      else if (event.key === "End") {
        const last = navigationStops.at(-1);
        if (last) { setEntryCaptionPage(last.page); setCaptionPage(last.page); setIndex(last.index); }
      }
      else navigate(event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [slideCount, navigatorOpen, captionPages.length, navigate, navigationStops]);
  // 다음 두 장을 미리 받는다. 임의 번호 이동과 엔딩에서도 범위를 넘지 않는다.
  const preloadUrls = useMemo(() => imageRatio
    ? images.slice(index + 1, index + 1 + PRELOAD_AHEAD).map(item => item.url) : [], [images, index, imageRatio]);
  usePreloadImages(preloadUrls);
  /* 휠은 영역을 가른다 — 칠해진 그림 위에서는 커서 지점 기준 확대·축소, 그림 밖 빈 여백에서는 공통 순서로 이동한다.
     확대된 그림은 여백 위로 넘치니 1배 초과일 때는 위치와 무관하게 줌이다.
     자막·엔딩의 스크롤 예외와 휠 누적은 공용 훅이 처리한다. */
  useWheelPaging(viewerBodyRef, {
    onPrev: () => navigate(-1),
    onNext: () => navigate(1),
    enabled: !navigatorOpen,
    consumeWheel: (event) => {
      const element = viewerBodyRef.current;
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const cx = event.clientX - (rect.left + rect.width / 2);
      const cy = event.clientY - (rect.top + rect.height / 2);
      const ratio = imageRatio ?? 0;
      let onArt = zoomView.scale > 1;
      if (!onArt && ratio > 0) {
        const w = Math.min(rect.width, rect.height * ratio);
        const h = Math.min(rect.height, rect.width / ratio);
        onArt = event.clientX >= rect.left + (rect.width - w) / 2 && event.clientX <= rect.left + (rect.width + w) / 2
          && event.clientY >= rect.top + (rect.height - h) / 2 && event.clientY <= rect.top + (rect.height + h) / 2;
      }
      if (onArt) {
        const factor = event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
        setZoomView((v) => {
          const next = Math.min(MAX_ZOOM, Math.max(1, v.scale * factor));
          if (next === 1) return { scale: 1, x: 0, y: 0 };
          const k = next / v.scale;
          return { scale: next, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
        });
        return true;
      }
      return false;
    },
  });
  /* Esc는 줌 모드부터 빠지고 그다음 창을 닫는다 — nested면 캡처로 아래 깔린 모달보다 먼저 잡는다.
     전체화면 창이라 바깥 스크롤은 공용 카운트 잠금으로 직접 잠근다 */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      /* 바로가기가 떠 있으면 그 모달이 Esc를 처리한다 — 여기서 전파를 끊으면 바로가기가 못 닫는다 */
      if (navigatorOpen) return;
      if (nested) event.stopImmediatePropagation();
      if (infoOpen) { setInfoOpen(false); return; }
      if (captionSelect) { setCaptionSelect(false); return; }
      if (zoomView.scale > 1) { setZoomView({ scale: 1, x: 0, y: 0 }); return; }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown, nested);
    lockBodyScroll();
    return () => { document.removeEventListener("keydown", onKeyDown, nested); unlockBodyScroll(); };
  }, [onClose, nested, navigatorOpen, captionSelect, zoomView.scale, infoOpen]);
  /* 모달이 하던 일 — 열릴 때 닫기 버튼으로 포커스를 옮기고, 닫히면 열었던 요소로 돌려준다 */
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => previous?.focus();
  }, []);
  /* 자막 넘기기 — 마지막 쪽에서 넘기면 다음 장면, 첫 쪽에서 거슬러가면 이전 장면으로 이어진다 */
  const captionNext = () => {
    navigate(1);
  };
  const captionPrev = () => {
    navigate(-1);
  };
  /* 장면이 바뀌면 미끄러지던 위치를 푼다 (렌더 중 조정 패턴) */
  const [prevIndex, setPrevIndex] = useState(index);
  if (prevIndex !== index) {
    setPrevIndex(index);
    setDragX(0);
    setCaptionPage(entryCaptionPage);
    setEntryCaptionPage(0);
    setCaptionDragX(0);
    setCaptionSelect(false);
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
  /* 번호는 즉시 바꾸고 새 그림·자막만 짧게 이어 보인다. 버튼과 클릭 영역의 위치는 움직이지 않는다. */
  useEffect(() => {
    const pending = pendingNavigationAnimation.current;
    pendingNavigationAnimation.current = null;
    if (!pending || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = pending.target === "caption" ? captionBoxRef.current
      : viewerBodyRef.current?.querySelector<HTMLElement>("[data-artwork-current] img, [data-scene-ending]");
    const animation = element?.animate([
      { opacity: 0.65, transform: `translateX(${pending.direction * 12}px)` },
      { opacity: 1, transform: "translateX(0)" },
    ], { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    return () => animation?.cancel();
  }, [index, captionPage]);
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
      // 분할 자막에서는 그림을 밀어도 자막 한 쪽을 넘긴다.
      if (paginatedCaption && zoomView.scale === 1) { captionSwipeHandlers.onPointerDown(event); return; }
      /* 진행 중이던 복귀·나가기 애니메이션을 끊고 다시 잡는다 */
      pendingSlide.current = null;
      setSlideAnim(false);
      swipeStart.current = { x: event.clientX, y: event.clientY };
      zoomDrag.current = { x: event.clientX, y: event.clientY, vx: zoomView.x, vy: zoomView.y };
    },
    onPointerMove: (event: React.PointerEvent) => {
      if (captionSwipeStart.current) {
        if (!(event.target instanceof HTMLElement) || !event.target.closest("[data-caption-swipe]")) captionSwipeHandlers.onPointerMove(event);
        return;
      }
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
      if (captionSwipeStart.current) { captionSwipeHandlers.onPointerUp(event); return; }
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
      if (slideCount < 2) {
        if (Math.hypot(dx, dy) > 8) swipeConsumed.current = true;
        return;
      }
      /* 조금이라도 밀었으면 그 뒤 click은 누르기가 아니다 — 헤더·버튼 클릭을 막는다 */
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swipeConsumed.current = true;
      /* 밀기 성립 → 그림이 끝까지 나가는 애니메이션을 돌리고, 끝나면 번호를 넘긴다 */
      const canMove = dx < 0 ? index < slideCount - 1 : index > 0;
      setSlideAnim(true);
      pendingSlide.current = Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && canMove ? (dx < 0 ? 1 : -1) : null;
      const boxWidth = viewerBodyRef.current?.getBoundingClientRect().width ?? 0;
      setDragX(pendingSlide.current ? (dx < 0 ? -boxWidth : boxWidth) : 0);
    },
    onPointerCancel: () => { captionSwipeHandlers.onPointerCancel(); swipeStart.current = null; zoomDrag.current = null; pendingSlide.current = null; setPanning(false); setSlideAnim(true); setDragX(0); },
    /* 마우스로 누른 채 화면 밖으로 나가면 up이 안 온다 — 터치는 브라우저가 암묵 포착이라 제외 */
    onPointerLeave: (event: React.PointerEvent) => {
      if (captionSwipeStart.current) { captionSwipeHandlers.onPointerLeave(event); return; }
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
      if (captionSwipeConsumed.current) { captionSwipeHandlers.onClickCapture(event); return; }
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
    if (step) navigate(step);
    setDragX(0);
  };
  if (!image) return null;
  const isScene = image.kind === 'scene';
  const recordImageRatio = (url: string, event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalHeight > 0) setRatios(map => (map[url] ? map : { ...map, [url]: naturalWidth / naturalHeight }));
  };
  const navigationWidth = imageRatio
    ? `max(clamp(5rem, 10vw, 9rem), calc((100cqw - min(100cqw, 100cqh * ${imageRatio})) / 2))`
    : "max(clamp(5rem, 10vw, 9rem), 20%)";
  const artworkImage = <Image key="current" src={image.url} alt={image.label ?? title} fill unoptimized draggable={false} className="object-contain select-none"
    onLoad={event => recordImageRatio(image.url, event)} />;
  const artwork = slideCount === 1 && !isScene ? (
    <button type="button" data-artwork-single-close onClick={onClose} aria-label={tAccess("close")}
      className="absolute inset-0 cursor-zoom-out border border-transparent outline-none hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
      {artworkImage}
    </button>
  ) : artworkImage;
  /* 옆자리 그림도 비율을 기억해 둔다. 이미 로드한 그림으로 넘어가도 여백 폭을 바로 알 수 있다. */
  const slideImage = (item: (typeof images)[number]) => (
    <Image src={item.url} alt={item.label ?? title} fill unoptimized draggable={false} fetchPriority="low" className="object-contain select-none"
      onLoad={event => recordImageRatio(item.url, event)} />
  );
  /* 타이틀아트는 그림 안 오른쪽 스트립에 제목을 얹는다 — 전체화면에서 object-contain은 그림을 중앙에 축소하니
     칠해진 그림 영역과 같은 비율의 상자를 만들고 거기에 제목을 얹는다(cqh = 본문 컨테이너 높이) */
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
  /* 헤더 칸 — 장면은 장면 제목, 엔딩은 엔딩 제목, 비장면 그림은 그 그림의 이름(없으면 뷰어 제목)이 서고 누르면 장면 바로가기가 열린다.
     타이틀아트는 제목을 그림 안에도 그리지만 헤더 중앙 자리는 비우지 않는다 — 전체화면에서 목록 역할은 헤더가 쥔다 */
  const headerLabel = isEnding ? ending?.title : (isScene ? image.label : (image.label ?? title));
  const headerNumber = isEnding ? "ENDING" : index + 1;

  /* 자막 전체를 클립보드에 적는다 — 성공하면 칩이 「복사됨」으로 잠시 바뀐다 */
  const copyCaption = () => {
    const text = image?.caption;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCaptionCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCaptionCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <>
    {/* 장면 뷰어는 전체화면 한 겹 — 창 안의 창(중간 모듈)은 없다. 스크롤 잠금·Esc는 이 컴포넌트가 직접 쥔다 */}
    {createPortal(
      <div role="dialog" aria-modal="true" aria-label={title}
        className="fixed inset-0 flex flex-col bg-bg-main" style={{ zIndex }}>
        {/* 제목은 좌우 폭이 같은 칸 사이에 둔다. 모바일은 제목을 별도 행에 놓아 조작 버튼과 겹치지 않는다. */}
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-white/10 px-2 py-1 md:h-12 md:grid-cols-[minmax(9rem,1fr)_minmax(0,3fr)_minmax(9rem,1fr)] md:py-0">
          <span data-scene-counter aria-live="polite" className="col-start-1 row-start-2 justify-self-start rounded-md bg-black/60 px-2 py-0.5 text-xs tabular-nums text-white/90 md:row-start-1">
            {index + 1} / {slideCount}
          </span>
          {headerLabel ? (
            slideCount > 1 ? (
              <button type="button" data-scene-title aria-haspopup="dialog" aria-label={`${headerNumber} ${headerLabel} · ${t("selectImage")}`}
                onClick={() => setNavigatorOpen(true)}
                className="col-span-2 col-start-1 row-start-1 inline-flex min-w-0 max-w-full items-center justify-self-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-primary outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:col-span-1 md:col-start-2">
                <span className="shrink-0 tabular-nums text-accent">{headerNumber}</span>
                <span className="truncate">{headerLabel}</span>
              </button>
            ) : (
              <span data-scene-title className="col-span-2 col-start-1 row-start-1 inline-flex min-w-0 max-w-full items-center justify-self-center gap-2 px-2 py-1.5 text-sm font-semibold text-text-primary md:col-span-1 md:col-start-2">
                <span className="shrink-0 tabular-nums text-accent">{headerNumber}</span>
                <span className="truncate">{headerLabel}</span>
              </span>
            )
          ) : <span className="col-span-2 col-start-1 row-start-1 md:col-span-1 md:col-start-2" aria-hidden />}
          <div className="col-start-2 row-start-2 flex items-center justify-self-end gap-1.5 md:col-start-3 md:row-start-1">
            <button type="button" data-scene-help aria-pressed={infoOpen}
              aria-label={t("helpTitle")} title={t("helpTitle")}
              onClick={() => setInfoOpen(open => !open)}
              className={`flex min-h-9 min-w-9 items-center justify-center rounded-full border px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${infoOpen ? "border-accent text-accent" : "border-white/25 text-white hover:border-accent hover:text-accent"}`}>
              <Info size={16} />
            </button>
            {isScene && !isEnding && image.caption && (
            <button type="button" data-scene-captions aria-pressed={!captionSplit}
              aria-label={t(captionSplit ? "captionShowAll" : "captionPaginate")} title={t(captionSplit ? "captionShowAll" : "captionPaginate")}
              onClick={() => setCaptionSplit(on => !on)}
              className={`flex min-h-9 min-w-9 items-center justify-center rounded-full border px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${!captionSplit ? "border-accent text-accent hover:bg-accent/10" : "border-white/25 text-white hover:border-accent hover:text-accent"}`}>
              {captionSplit ? <TextAlignJustify size={16} /> : <Rows3 size={16} />}
            </button>)}
            {isScene && !isEnding && image.caption && <FactionCaptionSize value={captionSize} onChange={setCaptionSize} />}
            {isScene && !isEnding && image.caption && <FactionCaptionHeight value={captionHeight} onChange={setCaptionHeight} />}
            <button type="button" ref={closeButtonRef} onClick={onClose} aria-label={tAccess("close")} data-artwork-dismiss className={CLOSE_BUTTON_STYLE}>
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>
        {infoOpen && <FactionArtworkHelp onClose={() => setInfoOpen(false)}
          caption={!isEnding && Boolean(image.caption)}
          settings={isScene && !isEnding && image.caption ? { split: captionSplit, onToggle: () => setCaptionSplit(on => !on), size: captionSize, onSize: setCaptionSize, height: captionHeight, onHeight: setCaptionHeight } : undefined}
          navigation={hasNavigation ? { previous: () => navigate(-1), next: () => navigate(1), canPrevious, canNext, previousLabel, nextLabel } : undefined}
          zoomed={zoomView.scale > 1}
          onZoom={isScene && !isEnding ? () => setZoomView(view => view.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2, x: 0, y: 0 }) : undefined}
          copied={captionCopied} onCopy={copyCaption} />}
        {/* 본문 — 장면 트랙. 휠은 그림 위=확대·축소, 빈 여백=문장·장면 넘기기. pan-y로 세로 스크롤은 브라우저에 남긴다 */}
        <div ref={viewerBodyRef} data-artwork-viewer {...swipeHandlers}
          className={`@container relative min-h-0 flex-1 overflow-hidden bg-black ${zoomView.scale > 1 ? (panning ? "cursor-grabbing" : "cursor-grab") : ""}`}
          style={{ touchAction: "pan-y", containerType: "size" }}>
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
                  {endingHere ? endingSlide : item ? (offset === 0 ? artwork :
                    ((offset > 0 && imageRatio) || ratios[item.url]) ? slideImage(item) : null) : null}
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
          {/* 자막을 누르면 텍스트 선택 모드 — 화면이 어두워지고 전체 해설이 선택 가능한 글로 선다. 배경 눌림·Esc·닫기로 돌아간다 */}
          {isScene && !isEnding && image.caption && captionSelect && (
            <div data-artwork-caption-frame data-caption-swipe data-wheel-pass onClick={(event) => { if (event.target === event.currentTarget) setCaptionSelect(false); }}
              className="absolute inset-0 z-20 flex flex-col justify-end bg-black/60">
              <div className="mx-auto w-full max-w-3xl px-4 pb-4 md:px-6">
                <div className="mb-2 flex justify-end gap-1.5">
                  <button type="button" data-caption-copy onClick={copyCaption}
                    aria-label={t("captionCopy")}
                    className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/75 px-3 py-1.5 text-xs font-medium text-white outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                    {captionCopied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}{captionCopied ? t("captionCopied") : t("captionCopy")}
                  </button>
                  <button type="button" data-caption-select-close onClick={() => setCaptionSelect(false)} aria-label={tAccess("close")}
                    className="flex min-h-8 min-w-8 items-center justify-center rounded-full border border-white/25 bg-black/75 px-2 text-white outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                    <X size={14} />
                  </button>
                </div>
                <p data-artwork-caption className={`max-h-[60dvh] cursor-text select-text overflow-y-auto overscroll-contain whitespace-pre-line break-keep rounded-xl border border-white/15 bg-black/80 p-4 leading-relaxed text-white [overflow-wrap:anywhere] ${captionSizeClass}`}>
                  <FactionSceneText text={image.caption} />
                </p>
              </div>
            </div>
          )}
          {/* 자막 분량과 글자 크기는 독립 설정이다. 누르면 선택·복사를 연다. */}
          {isScene && !isEnding && image.caption && !captionSelect && !captionSplit && (
            <div data-artwork-caption-frame data-wheel-pass style={{ bottom: captionBottom }} className={`absolute inset-x-0 z-10 max-h-[55%] overflow-y-auto overscroll-contain px-4 pb-6 pt-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-8 md:pb-10 ${captionBackdropClass}`}>
              <button type="button" data-artwork-caption onClick={() => setCaptionSelect(true)} title={t("captionSelect")}
                className={`mx-auto block w-full max-w-3xl whitespace-pre-line break-keep text-center leading-relaxed text-white outline-none [overflow-wrap:anywhere] md:text-balance ${captionSizeClass}`}>
                <FactionSceneText text={image.caption} />
              </button>
            </div>
          )}
          {isScene && !isEnding && image.caption && !captionSelect && captionSplit && (
            <div data-artwork-caption-frame data-caption-swipe data-wheel-pass {...captionSwipeHandlers} style={{ touchAction: "pan-y", bottom: captionBottom, maxHeight: `calc(100% - ${captionBottom})` }}
              className={`absolute inset-x-0 z-10 overflow-y-auto overscroll-contain px-4 pb-6 pt-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-8 md:pb-10 ${captionBackdropClass}`}>
              {captionPages.length > 1 && (
                <p data-scene-caption-counter className="mb-1 text-center text-xs tabular-nums text-white/50">{captionPage + 1} / {captionPages.length}</p>)}
              <div className="mx-auto w-full max-w-3xl">
                <button type="button" data-artwork-caption onClick={() => setCaptionSelect(true)} aria-live="polite"
                  title={t("captionSelect")}
                  className={`relative block max-h-[38dvh] w-full min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain whitespace-pre-line break-keep py-1 text-center font-medium leading-relaxed text-white outline-none [overflow-wrap:anywhere] [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-scrollbar]:hidden md:text-balance ${captionSizeClass}`}>
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
              </div>
            </div>
          )}
          {/* 빈 여백 전체가 클릭 영역이다. 화살표는 별도로 화면 가장자리에 고정해 영역 폭이 달라져도 움직이지 않는다. */}
          {hasNavigation && (
            <button type="button" onClick={() => navigate(-1)} disabled={!canPrevious} aria-label={previousLabel}
              style={{ width: navigationWidth }}
              className="group absolute inset-y-0 start-0 z-[15] hidden cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-default md:flex">
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/15 via-accent/5 to-transparent opacity-0 transition-opacity duration-200 ease-out group-enabled:group-hover:opacity-100 group-enabled:group-active:opacity-100 motion-reduce:transition-none" />
              <span className="absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-transparent bg-black/20 text-white/55 [inset-inline-start:clamp(2.5rem,5vw,4.5rem)] group-disabled:opacity-15 group-enabled:group-hover:border-accent/60 group-enabled:group-hover:text-accent group-enabled:group-active:border-accent group-enabled:group-active:bg-accent/15 group-enabled:group-active:text-white">
                <ChevronLeft size={30} aria-hidden />
              </span>
            </button>
          )}
          {hasNavigation && (
            <button type="button" onClick={() => navigate(1)} disabled={!canNext} aria-label={nextLabel}
              style={{ width: navigationWidth }}
              className="group absolute inset-y-0 end-0 z-[15] hidden cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-default md:flex">
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-l from-accent/15 via-accent/5 to-transparent opacity-0 transition-opacity duration-200 ease-out group-enabled:group-hover:opacity-100 group-enabled:group-active:opacity-100 motion-reduce:transition-none" />
              <span className="absolute top-1/2 grid size-12 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-transparent bg-black/20 text-white/55 [inset-inline-end:clamp(2.5rem,5vw,4.5rem)] group-disabled:opacity-15 group-enabled:group-hover:border-accent/60 group-enabled:group-hover:text-accent group-enabled:group-active:border-accent group-enabled:group-active:bg-accent/15 group-enabled:group-active:text-white">
                <ChevronRight size={30} aria-hidden />
              </span>
            </button>
          )}
          {/* 모바일은 ‹ ›가 그림 위에 흐리게 겹친다 — 넘기기는 밀기가 기본이고 이 단추는 보조다 */}
          {hasNavigation && (
            <button type="button" onClick={() => navigate(-1)} disabled={!canPrevious} aria-label={previousLabel}
              className="absolute start-2 top-1/2 z-[5] -translate-y-1/2 rounded-full bg-black/30 p-2 text-white/60 outline-none enabled:hover:bg-black/60 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-0 md:hidden">
              <ChevronLeft size={22} aria-hidden />
            </button>
          )}
          {hasNavigation && (
            <button type="button" onClick={() => navigate(1)} disabled={!canNext} aria-label={nextLabel}
              className="absolute end-2 top-1/2 z-[5] -translate-y-1/2 rounded-full bg-black/30 p-2 text-white/60 outline-none enabled:hover:bg-black/60 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-0 md:hidden">
              <ChevronRight size={22} aria-hidden />
            </button>
          )}
        </div>
        {/* 표지·인물 화보처럼 장면이 아닌 그림의 캡션은 본문 아래 칸에 선다 — 장면 해설은 자막 오버레이가 담당한다.
            글을 골라 복사하거나 칸을 눌러 전체를 복사한다 — 드래그 선택 뒤의 click은 복사로 오인하지 않는다 */}
        {!isEnding && !isScene && image.caption && (
          <div key={image.url} data-artwork-caption-frame className="shrink-0 border-t border-white/10 px-4 py-4 md:px-8">
            <p data-artwork-caption title={t("captionCopy")} role="button" tabIndex={0}
              onClick={() => { if (!window.getSelection()?.toString()) copyCaption(); }}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); copyCaption(); } }}
              className="mx-auto w-full max-w-3xl cursor-text select-text whitespace-pre-line break-keep text-center text-sm leading-relaxed text-text-primary outline-none [overflow-wrap:anywhere] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:text-base">
              {image.caption}
            </p>
            {captionCopied && <p aria-live="polite" className="mt-1 text-center text-xs font-medium text-accent">{t("captionCopied")}</p>}
          </div>
        )}
        {hasNavigation && (
          /* PC는 본문 양끝 ‹ ›로 이동한다. 하단의 한 칸 이동 버튼은 모바일에만 둔다. */
          <div data-scene-controls className="grid h-14 shrink-0 grid-cols-[1fr_1fr_minmax(0,2.5fr)_1fr_1fr] divide-x divide-white/10 border-t border-white/10 bg-bg-main/95 backdrop-blur-sm md:h-12 md:grid-cols-[3rem_minmax(0,1fr)_3rem]">
            <button type="button" onClick={() => selectPosition(0)} disabled={navigationPosition === 0} aria-label={t("firstImage")}
              className="flex items-center justify-center text-text-secondary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25">
              <ChevronsLeft size={18} aria-hidden />
            </button>
            <button type="button" onClick={() => navigate(-1)} disabled={!canPrevious} aria-label={previousLabel}
              className="flex items-center justify-center text-text-primary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:hidden">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <div className="flex min-w-0 items-center justify-center px-3 md:px-4">
              {/* 분할 모드는 자막 한 쪽, 전체 모드는 장면 하나가 한 칸이다. */}
              <input type="range" data-scene-slider min={0} max={navigationStops.length - 1} step={1} value={navigationPosition}
                aria-label={t("imageNumber", { count: slideCount })}
                onChange={(event) => selectPosition(Number(event.target.value))}
                className="h-10 w-full cursor-grab accent-accent outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing" />
            </div>
            <button type="button" onClick={() => navigate(1)} disabled={!canNext} aria-label={nextLabel}
              className="flex items-center justify-center text-text-primary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:hidden">
              <ChevronRight size={20} aria-hidden />
            </button>
            <button type="button" onClick={() => selectPosition(navigationStops.length - 1)} disabled={navigationPosition === navigationStops.length - 1} aria-label={t("lastImage")}
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
