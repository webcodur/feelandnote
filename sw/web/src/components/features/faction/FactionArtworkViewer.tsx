"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal, { CLOSE_BUTTON_STYLE } from "@/components/ui/Modal";
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
}

/** 표지·인물 화보·주요 장면의 원본과 해설을 연다. 개요 읽기와 독립된 창이다. */
export default function FactionArtworkViewer({ images, title, titleInArtwork = false, onClose, nested = false }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tAccess = useTranslations("shared.accessibility");
  const [index, setIndex] = useState(0);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
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
  useEffect(() => {
    if (slideCount < 2 || navigatorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      setIndex(current => Math.max(0, Math.min(slideCount - 1, current + (event.key === "ArrowLeft" ? -1 : 1))));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [slideCount, navigatorOpen]);
  const image = images[index] ?? images[0];
  // 현재 그림이 도착한 뒤 다음 두 장만 받는다. 임의 번호 이동과 엔딩에서도 범위를 넘지 않는다.
  const preloadUrls = useMemo(() => !isEnding && dimensions?.url === image?.url
    ? images.slice(index + 1, index + 1 + PRELOAD_AHEAD).map(item => item.url)
    : [], [images, index, isEnding, dimensions?.url, image?.url]);
  usePreloadImages(preloadUrls);
  if (!image) return null;
  const isScene = image.kind === 'scene';
  const hasScenes = images.some(item => item.kind === 'scene');
  const middleTitle = isEnding ? ending?.title : image.label;
  const fitToImage = titleInArtwork || isScene;
  // 다음 그림이 준비될 때까지 이전 비율을 유지해, 넘길 때마다 임시 높이로 줄어들지 않게 한다.
  const ratio = dimensions?.ratio ?? (isScene ? 1 : 3 / 2);
  const move = (direction: number) => setIndex(current => Math.max(0, Math.min(slideCount - 1, current + direction)));

  return (
    <>
    <Modal isOpen onClose={onClose} title={titleInArtwork ? undefined : title} ariaLabel={title} stickyHeader frame="plain"
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
        <div className="min-w-0">
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
            <button type="button" onClick={onClose} aria-label={tAccess("close")} data-artwork-dismiss
              className="absolute inset-0 cursor-zoom-out outline-none hover:ring-1 hover:ring-inset hover:ring-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
              <Image src={image.url} alt={image.label ?? title} fill unoptimized className="object-contain"
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (naturalHeight > 0) setDimensions({ url: image.url, ratio: naturalWidth / naturalHeight });
                }} />
            </button>
            {titleInArtwork && !isScene && <FactionArtworkTitle title={title} heading />}
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
        /* 모바일: 세 칸이 빈틈 없이 갈리고 아이콘은 각 칸의 중앙. PC는 본문 가장자리 칸이 넘긴다 */
        <div className="sticky bottom-0 z-20 grid h-14 grid-cols-[1fr_auto_1fr] divide-x divide-white/10 border-t border-white/10 bg-bg-main/95 backdrop-blur-sm md:flex md:h-12 md:items-center md:justify-center md:divide-x-0">
          <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("previousImage")}
            className="flex items-center justify-center text-text-primary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:hidden">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <div className="flex items-center justify-center px-2">
            {hasScenes ? (
              <button type="button" data-scene-select aria-haspopup="dialog" aria-label={t("selectImage")} title={t("selectImage")} onClick={() => setNavigatorOpen(true)}
                className="flex h-10 w-[min(52vw,24rem)] items-center justify-center gap-2 rounded-full border border-white/20 bg-bg-main px-3.5 text-sm font-semibold text-text-primary outline-none hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
                <span data-scene-counter aria-live="polite" className="shrink-0 tabular-nums text-text-secondary">{isEnding ? "ENDING" : index + 1}</span>
                {middleTitle && <span data-scene-title className="min-w-0 truncate">{middleTitle}</span>}
              </button>
            ) : (
              <span data-scene-counter aria-live="polite" className="min-w-16 text-center text-sm tabular-nums text-text-secondary">{isEnding ? "ENDING" : index + 1}</span>
            )}
          </div>
          <button type="button" onClick={() => move(1)} disabled={index === slideCount - 1} aria-label={ending && index === images.length - 1 ? t("readEnding") : t("nextImage")}
            className="flex items-center justify-center text-text-primary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-25 md:hidden">
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      )}
    </Modal>
    {navigatorOpen && <FactionSceneNavigator images={images} title={title} activeIndex={index} endingTitle={ending?.title}
      onSelect={selectImage} onClose={closeNavigator} zIndex={zIndex + 1} />}
    </>
  );
}
