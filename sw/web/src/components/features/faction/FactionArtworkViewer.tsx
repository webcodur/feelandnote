"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Info, Rows3, TextAlignJustify, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { CLOSE_BUTTON_STYLE } from "@/components/ui/Modal";
import FactionArtworkTitle from "./FactionArtworkTitle";
import FactionArtworkHelp from "./FactionArtworkHelp";
import { Z_INDEX } from "@/constants/zIndex";
import { buildStorySlides, type StoryArtwork, type StoryGuide } from "./storyBoundaries";
import FactionStoryGuide from "./FactionStoryGuide";
import FactionSceneNavigator from "./FactionSceneNavigator";
import FactionSceneText from "./FactionSceneText";
import FactionStoryCaption from "./FactionStoryCaption";
import { splitSceneCaptionPages } from "./sceneCaptionPages";
import FactionCaptionSize, { CAPTION_SIZE_CLASSES, type CaptionSize } from "./FactionCaptionSize";
import FactionCaptionHeight, { CAPTION_HEIGHT_OFFSETS, type CaptionHeight } from "./FactionCaptionHeight";
import { usePreloadImages } from "@/hooks/usePreloadImages";
import { useWheelPaging } from "@/hooks/useWheelPaging";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

const PRELOAD_AHEAD = 2;
/* 줌 모드의 휠 배율 — 커서 지점을 고정해 키우고 줄인다 */
const MAX_ZOOM = 10;
const WHEEL_ZOOM_STEP = 1.35;

// 윤곽은 글자 크기에 맞추고, 짧은 음영은 글자 주변에만 남긴다.
const CAPTION_TEXT_STYLE = {
  WebkitTextStroke: "0.1em var(--color-black)",
  paintOrder: "stroke fill",
  textShadow: "0 1px 2px color-mix(in srgb, var(--color-black) 70%, transparent)",
} as const;

interface Props {
  images: StoryArtwork[];
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
export default function FactionArtworkViewer(props: Props) {
  const { images, onIndexChange, initialIndex = 0 } = props;
  const slides = useMemo(() => buildStorySlides(images), [images]);
  const rememberedIndex = Math.max(0, Math.min(images.length - 1, initialIndex));
  const firstSlide = Math.max(0, slides.findIndex(slide => slide.sourceIndex === rememberedIndex));
  const reportIndex = useCallback((index: number) => {
    onIndexChange?.(slides[index]?.sourceIndex ?? Math.max(0, images.length - 1));
  }, [onIndexChange, images.length, slides]);
  return <ArtworkSlides {...props} images={slides} initialIndex={firstSlide} onIndexChange={reportIndex} />;
}

function ArtworkSlides({ images, title, titleInArtwork = false, onClose, nested = false, initialIndex = 0, onIndexChange }: Omit<Props, 'images'> & { images: (StoryArtwork & { guide?: StoryGuide })[] }) {
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
  /* 자막을 장면 안에서 한 쪽씩 넘긴다 — 장면이 바뀌면 첫 쪽으로 돌아간다 */
  const [captionPage, setCaptionPage] = useState(0);
  const [entryCaptionPage, setEntryCaptionPage] = useState(0);
  /* 자막을 누르면 텍스트 선택 모드 — 전체 해설이 선택 가능한 글로 서고 복사 칩이 붙는다 */
  const [captionSelect, setCaptionSelect] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* 상단 ⓘ — 영역별 조작법을 보여주는 패널 */
  const [infoOpen, setInfoOpen] = useState(false);
  const [zoomView, setZoomView] = useState({ scale: 1, x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const zoomDrag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  /* 타이틀아트 제목을 칠해진 그림 영역에 맞추려고 그림별 가로세로비를 잰다 */
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const viewerBodyRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
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
        setCaptionPage(nextPage);
        return;
      }
    }
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= slideCount) return;
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
  // 장면이 바뀌면 읽을 자막과 확대 상태를 초기화한다.
  const [prevIndex, setPrevIndex] = useState(index);
  if (prevIndex !== index) {
    setPrevIndex(index);
    setCaptionPage(entryCaptionPage);
    setEntryCaptionPage(0);
    setCaptionSelect(false);
    setZoomView({ scale: 1, x: 0, y: 0 });
    setPanning(false);
  }
  const captionViewportRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    captionViewportRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [index, captionPage, captionSplit, captionSelect]);
  // 스와이프는 놓는 순간 바로 넘긴다. 그림과 자막을 옆으로 끌지 않는다.
  const swipeStart = useRef<{ x: number; y: number; onCaption: boolean } | null>(null);
  const swipeConsumed = useRef(false);
  const cancelSwipe = () => {
    swipeStart.current = null;
    zoomDrag.current = null;
    setPanning(false);
  };
  const swipeHandlers = {
    onPointerDown: (event: React.PointerEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest('button, input, textarea, select, [contenteditable="true"]')) return;
      const onCaption = Boolean(event.target.closest("[data-caption-swipe]"));
      if (captionSelect && onCaption) return;
      swipeStart.current = { x: event.clientX, y: event.clientY, onCaption };
      zoomDrag.current = { x: event.clientX, y: event.clientY, vx: zoomView.x, vy: zoomView.y };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const start = swipeStart.current;
      const origin = zoomDrag.current;
      if (!start || !origin || start.onCaption || zoomView.scale === 1) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > 6) {
        setPanning(true);
        setZoomView(view => ({ ...view, x: origin.vx + dx, y: origin.vy + dy }));
      }
    },
    onPointerUp: (event: React.PointerEvent) => {
      const start = swipeStart.current;
      cancelSwipe();
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (zoomView.scale > 1 && !start.onCaption) {
        if (Math.hypot(dx, dy) > 8) swipeConsumed.current = true;
        return;
      }
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swipeConsumed.current = true;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) navigate(dx < 0 ? 1 : -1);
    },
    onPointerCancel: cancelSwipe,
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType === "mouse") cancelSwipe();
    },
    onDragStart: (event: React.DragEvent) => event.preventDefault(),
    onClickCapture: (event: React.MouseEvent) => {
      if (!swipeConsumed.current) return;
      swipeConsumed.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
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
  const artwork = image.guide ? <FactionStoryGuide guide={image.guide} url={image.url} onLoad={event => recordImageRatio(image.url, event)} /> : slideCount === 1 && !isScene ? (
    <button type="button" data-artwork-single-close onClick={onClose} aria-label={tAccess("close")}
      className="absolute inset-0 cursor-zoom-out border border-transparent outline-none hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
      {artworkImage}
    </button>
  ) : artworkImage;
  /* 타이틀아트는 그림 안 오른쪽 스트립에 제목을 얹는다 — 전체화면에서 object-contain은 그림을 중앙에 축소하니
     칠해진 그림 영역과 같은 비율의 상자를 만들고 거기에 제목을 얹는다(cqh = 본문 컨테이너 높이) */
  // 엔딩 텍스트는 번역 결과를 보존하고 읽을 때만 화면 안에 둔다.
  const endingSlide = ending && (
    <div data-scene-ending data-wheel-pass aria-hidden={!isEnding || undefined}
      className="absolute top-0 h-full w-full overflow-y-auto overscroll-contain"
      style={{ left: isEnding ? 0 : "200%" }}>
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
  const headerLabel = isEnding ? ending?.title : (image.label ?? title);
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
          <span data-scene-counter translate="no" aria-live="polite" className="col-start-1 row-start-2 justify-self-start rounded-md bg-black/60 px-2 py-0.5 text-xs tabular-nums text-white/90 md:row-start-1">
            {index + 1} / {slideCount}
          </span>
          {headerLabel ? (
            slideCount > 1 ? (
              <button type="button" data-scene-title aria-haspopup="dialog" aria-label={`${headerNumber} ${headerLabel} · ${t("selectImage")}`}
                onClick={() => setNavigatorOpen(true)}
                className="col-span-2 col-start-1 row-start-1 inline-flex min-w-0 max-w-full items-center justify-self-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-primary outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:col-span-1 md:col-start-2">
                <span translate="no" className="shrink-0 tabular-nums text-accent">{headerNumber}</span>
                <span className="relative block min-w-0 overflow-hidden">
                  {[...images.map(item => item.label ?? title), ...(ending ? [ending.title] : [])].map((label, labelIndex) =>
                    <span key={labelIndex} data-story-title={labelIndex} aria-hidden={labelIndex !== index || undefined}
                      className={labelIndex === index ? "block truncate" : "pointer-events-none absolute top-0 block w-full"}
                      style={labelIndex === index ? undefined : { left: "200%" }}>{label}</span>)}
                </span>
              </button>
            ) : (
              <span data-scene-title className="col-span-2 col-start-1 row-start-1 inline-flex min-w-0 max-w-full items-center justify-self-center gap-2 px-2 py-1.5 text-sm font-semibold text-text-primary md:col-span-1 md:col-start-2">
                <span translate="no" className="shrink-0 tabular-nums text-accent">{headerNumber}</span>
                <span className="relative block min-w-0 overflow-hidden">
                  {[...images.map(item => item.label ?? title), ...(ending ? [ending.title] : [])].map((label, labelIndex) =>
                    <span key={labelIndex} data-story-title={labelIndex} aria-hidden={labelIndex !== index || undefined}
                      className={labelIndex === index ? "block truncate" : "pointer-events-none absolute top-0 block w-full"}
                      style={labelIndex === index ? undefined : { left: "200%" }}>{label}</span>)}
                </span>
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
        {/* 현재 그림만 표시한다. 휠 확대와 세로 스크롤은 유지한다. */}
        <div ref={viewerBodyRef} data-artwork-viewer {...swipeHandlers}
          className={`@container relative min-h-0 flex-1 overflow-hidden bg-black ${zoomView.scale > 1 ? (panning ? "cursor-grabbing" : "cursor-grab") : ""}`}
          style={{ touchAction: "pan-y", containerType: "size" }}>
          {endingSlide}
          {!isEnding && <div key={index} className="absolute inset-0" data-artwork-current
            style={{ transform: `translate(${zoomView.x}px, ${zoomView.y}px) scale(${zoomView.scale})`, transformOrigin: "center" }}>
            {artwork}
          </div>}
          {titleInArtwork && !isScene && !isEnding && !image.guide && imageRatio && (
            <div className="@container pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ aspectRatio: imageRatio, width: `min(100%, calc(100cqh * ${imageRatio}))` }}>
              <FactionArtworkTitle title={title} heading />
            </div>
          )}
          {/* 해설 DOM은 분할·전체·선택 모드와 장면 이동 모두에서 유지한다. */}
          <div data-artwork-caption-frame data-caption-swipe data-wheel-pass
            aria-hidden={!isScene || isEnding || !image.caption || undefined}
            onClick={(event) => { if (captionSelect && event.target === event.currentTarget) setCaptionSelect(false); }}
            style={{ touchAction: "pan-y", bottom: captionSelect ? 0 : captionBottom,
              left: isScene && !isEnding && image.caption ? 0 : "200%",
              maxHeight: captionSelect ? undefined : `calc(100% - ${captionBottom})` }}
            className={captionSelect
              ? "absolute top-0 z-20 flex w-full flex-col justify-end bg-black/60"
              : "absolute z-10 w-full overflow-y-auto overscroll-contain px-4 pb-6 pt-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-8 md:pb-10"}>
            <div className={`relative isolate mx-auto w-full max-w-xl ${captionSelect ? "px-4 pb-4 md:px-6" : ""}`}>
              {!captionSelect && <div aria-hidden data-caption-scrim
                className="pointer-events-none absolute -inset-x-4 -inset-y-2 -z-10 rounded-3xl bg-black/55 blur-sm" />}
              {captionSelect && <div className="mb-2 flex justify-end gap-1.5">
                <button type="button" data-caption-copy onClick={copyCaption} aria-label={t("captionCopy")}
                  className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/75 px-3 py-1.5 text-xs font-medium text-white outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                  {captionCopied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}<span>{captionCopied ? t("captionCopied") : t("captionCopy")}</span>
                </button>
                <button type="button" data-caption-select-close onClick={() => setCaptionSelect(false)} aria-label={tAccess("close")}
                  className="flex min-h-8 min-w-8 items-center justify-center rounded-full border border-white/25 bg-black/75 px-2 text-white outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                  <X size={14} />
                </button>
              </div>}
              {!captionSelect && captionSplit && captionPages.length > 1 && (
                <p data-scene-caption-counter translate="no" className="mb-2 text-center text-xs tabular-nums text-white">
                  <span className="rounded-control bg-black/60 px-1.5 py-0.5">{captionPage + 1} / {captionPages.length}</span>
                </p>)}
              <div ref={captionViewportRef} data-artwork-caption role={captionSelect ? undefined : "button"}
                tabIndex={!captionSelect && isScene && !isEnding && image.caption ? 0 : -1}
                onClick={() => { if (!captionSelect) setCaptionSelect(true); }}
                onKeyDown={(event) => { if (!captionSelect && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setCaptionSelect(true); } }}
                aria-live={captionSelect ? undefined : "polite"} title={t("captionSelect")}
                style={captionSelect ? undefined : CAPTION_TEXT_STYLE}
                className={`relative w-full min-w-0 whitespace-pre-line break-keep text-balance text-center leading-normal text-white outline-none [overflow-wrap:anywhere] ${captionSizeClass} ${captionSelect
                  ? "max-h-[60dvh] cursor-text select-text overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-black/80 p-4"
                  : captionSplit ? "max-h-[38dvh] cursor-pointer select-none overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-2 font-semibold [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-scrollbar]:hidden"
                  : "max-h-[45dvh] cursor-pointer select-none overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"}`}>
                <FactionStoryCaption images={images} index={index} page={captionPage} split={captionSplit} selecting={captionSelect} />
              </div>
            </div>
          </div>
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
