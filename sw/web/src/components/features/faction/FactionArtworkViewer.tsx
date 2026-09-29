"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal, { CLOSE_BUTTON_STYLE } from "@/components/ui/Modal";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import FactionArtworkTitle from "./FactionArtworkTitle";
import { Z_INDEX } from "@/constants/zIndex";
import type { LocalizedSceneEnding } from "@feelandnote/shared/lib/faction-team-image";
import FactionSceneNavigator from "./FactionSceneNavigator";
import FactionSceneText from "./FactionSceneText";
import { usePreloadImages } from "@/hooks/usePreloadImages";

const PRELOAD_AHEAD = 2;

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
  /* 장면을 누르면 별도 이미지 뷰어(휠 줌)로 연다 — 이 창의 넘기기 위치와 독립이다 */
  const [inspectIndex, setInspectIndex] = useState<number | null>(null);
  const inspectImage = inspectIndex === null ? null : (images[inspectIndex] ?? null);
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
  useEffect(() => {
    if (slideCount < 2 || navigatorOpen || inspectIndex !== null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      if (event.key === "Home") setIndex(0);
      else if (event.key === "End") setIndex(slideCount - 1);
      else setIndex(current => Math.max(0, Math.min(slideCount - 1, current + (event.key === "ArrowLeft" ? -1 : 1))));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [slideCount, navigatorOpen, inspectIndex]);
  const image = images[index] ?? images[0];
  // 현재 그림이 도착한 뒤 다음 두 장만 받는다. 임의 번호 이동과 엔딩에서도 범위를 넘지 않는다.
  const preloadUrls = useMemo(() => !isEnding && dimensions?.url === image?.url
    ? images.slice(index + 1, index + 1 + PRELOAD_AHEAD).map(item => item.url)
    : [], [images, index, isEnding, dimensions?.url, image?.url]);
  usePreloadImages(preloadUrls);
  const move = (direction: number) => {
    setIndex(current => Math.max(0, Math.min(slideCount - 1, current + direction)));
  };
  /* 그림을 좌우로 밀면 장면이 넘어간다 — 밀기 뒤에 따라오는 click은 삼켜 확대가 안 열리게 한다 */
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swipeConsumed = useRef(false);
  const swipeHandlers = {
    onPointerDown: (event: React.PointerEvent) => { swipeStart.current = { x: event.clientX, y: event.clientY }; },
    onPointerUp: (event: React.PointerEvent) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (!start || slideCount < 2) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swipeConsumed.current = true;
        move(dx < 0 ? 1 : -1);
      }
    },
    onPointerCancel: () => { swipeStart.current = null; },
    onClickCapture: (event: React.MouseEvent) => {
      if (!swipeConsumed.current) return;
      swipeConsumed.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  if (!image) return null;
  const isScene = image.kind === 'scene';
  const hasScenes = images.some(item => item.kind === 'scene');
  const fitToImage = titleInArtwork || isScene;
  // 다음 그림이 준비될 때까지 이전 비율을 유지해, 넘길 때마다 임시 높이로 줄어들지 않게 한다.
  const ratio = dimensions?.ratio ?? (isScene ? 1 : 3 / 2);
  const artwork = <Image src={image.url} alt={image.label ?? title} fill unoptimized className="object-contain"
    onLoad={(event) => {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      if (naturalHeight > 0) setDimensions({ url: image.url, ratio: naturalWidth / naturalHeight });
    }} />;

  return (
    <>
    <Modal isOpen onClose={onClose} title={titleInArtwork || hasScenes ? undefined : title} ariaLabel={title} stickyHeader frame="plain"
      widthClassName={isScene && !isEnding
        ? "w-full max-w-[min(1200px,100%)] md:w-[calc(var(--scene-image-height)*var(--artwork-ratio)_+_var(--artwork-controls))]"
        : "max-w-[1200px]"}
      boxClassName="overflow-hidden rounded-2xl border border-white/15 bg-bg-main text-sm leading-relaxed md:text-base [--scene-caption-height:calc(4lh_+_1.5rem)] md:[--scene-caption-height:calc(3lh_+_1.5rem)] [--scene-image-height:max(8rem,calc(100dvh_-_var(--scene-caption-height)_-_11rem))]"
      boxStyle={{ "--artwork-ratio": ratio, "--artwork-controls": slideCount > 1 ? "6rem" : "0rem" } as CSSProperties}
      closeOnEscape={!navigatorOpen} escapeCapture={nested} zIndex={zIndex}
      /* 본문 3열의 오른쪽 칸(3rem) 중앙에 X를 얹는다 — 칸 중심이 모서리에서 1.5rem이라 버튼 반폭 1rem을 뺀 end-2 */
      closeButtonClassName={`absolute end-2 ${titleInArtwork ? "top-2 sm:top-4" : "top-2.5 sm:top-3"} md:end-2 ${CLOSE_BUTTON_STYLE}`}>
      {/* PC에서는 본문 자체가 3열 — 양끝 좁은 칸 전체가 넘기기 버튼이다. 모바일은 하단 바가 담당한다 */}
      <div className={slideCount > 1 ? "md:grid md:grid-cols-[3rem_minmax(0,1fr)_3rem]" : undefined}>
        {slideCount > 1 && (
          <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("previousImage")}
            className="hidden items-center justify-center border-e border-white/10 text-text-secondary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:flex">
            <ChevronLeft size={20} aria-hidden />
          </button>
        )}
        {/* 가로 밀기로 장면 넘기기 — 그림·캡션·엔딩 어디서 밀어도 먹는다. pan-y로 세로 스크롤은 브라우저에 남긴다 */}
        <div className="min-w-0" style={{ touchAction: "pan-y" }} {...swipeHandlers}>
          {/* 장면 제목 헤더 — 그림 위에 겹치지 않고 그림 위에 선다. 누르면 장면 바로가기가 열린다 */}
          {isScene && !titleInArtwork && image.label && (
            <button type="button" aria-haspopup="dialog" aria-label={`${image.label} · ${t("selectImage")}`}
              onClick={() => setNavigatorOpen(true)}
              className="w-full border-b border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-text-primary outline-none hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
              {image.label}
            </button>
          )}
          {isEnding && ending ? (
            <article data-scene-ending className="mx-auto flex min-h-[50dvh] max-w-3xl flex-col justify-center px-6 py-12 text-center sm:px-10 sm:py-16">
              <p className="mb-5 text-xs tracking-[0.3em] text-accent">ENDING</p>
              <h3 className="mb-8 break-keep text-2xl font-bold text-text-primary sm:text-3xl md:text-balance">{ending.title}</h3>
              <div className="space-y-5 break-keep text-sm leading-7 text-text-primary sm:text-base sm:leading-8">
                {ending.text.split(/\n\s*\n/).map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="md:text-balance"><FactionSceneText text={paragraph} /></p>)}
              </div>
            </article>
          ) : <>
          <div className={fitToImage ? "@container relative mx-auto bg-black/40" : "relative h-[min(70dvh,800px)] bg-black/40"}
            // 높이를 고정하면 모바일에서 폭만 줄어 검은 여백이 남는다. 폭을 제한하고 높이는 원본 비율로 정한다.
            style={fitToImage ? { aspectRatio: ratio, width: `min(100%, ${isScene ? "var(--scene-image-height)" : "70dvh"} * ${ratio})` } : undefined} data-artwork-viewer>
            {isScene ? (
              /* 장면 그림을 누르면 별도 이미지 뷰어가 열린다 — 거기서 휠로 자유 확대·축소 */
              <button type="button" data-scene-zoom aria-label={t("enlargeImage")} title={t("enlargeImage")}
                onClick={() => setInspectIndex(index)}
                className="group absolute inset-0 cursor-zoom-in overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                {artwork}
                <span aria-hidden className="pointer-events-none absolute bottom-3 end-3 flex min-h-9 min-w-9 items-center justify-center rounded-full border border-white/25 bg-black/75 px-2.5 text-white group-hover:border-accent group-hover:text-accent group-focus-visible:border-accent group-focus-visible:text-accent">
                  <ZoomIn size={16} />
                </span>
              </button>
            ) :
            <button type="button" onClick={onClose} aria-label={tAccess("close")} data-artwork-dismiss
              className="absolute inset-0 cursor-zoom-out outline-none hover:ring-1 hover:ring-inset hover:ring-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
              {artwork}
            </button>}
            {titleInArtwork && !isScene && <FactionArtworkTitle title={title} heading />}
            {/* 장면 번호는 좌상단 칩 — 클릭 불가, 읽기 표시다 */}
            <span data-scene-counter aria-live="polite" className="pointer-events-none absolute start-2 top-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-xs tabular-nums text-white/90">
              {index + 1} / {slideCount}
            </span>
          </div>
          {image.caption && (
            <div key={image.url} data-artwork-caption-frame className={isScene
              ? "flex h-[var(--scene-caption-height)] flex-col overflow-y-auto overscroll-contain px-4 py-3 md:px-6"
              : "px-4 py-4 md:px-8 md:py-5"}>
              <p data-artwork-caption className={`mx-auto w-full max-w-3xl whitespace-pre-line break-keep text-center text-sm leading-relaxed text-text-primary [overflow-wrap:anywhere] md:text-base ${isScene ? 'my-auto shrink-0 md:text-balance' : ''}`}>
                {isScene ? <FactionSceneText text={image.caption} /> : image.caption}
              </p>
            </div>
          )}
          </>}
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
                className="h-10 w-full accent-accent outline-none focus-visible:ring-2 focus-visible:ring-accent" />
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
      isOpen onClose={() => setInspectIndex(null)} />}
    </>
  );
}
