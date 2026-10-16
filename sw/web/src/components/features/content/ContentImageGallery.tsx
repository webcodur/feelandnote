"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import ContentImage from "@/components/ui/ContentImage";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";

const ArtworkViewer = dynamic(() => import("@/components/features/faction/FactionArtworkViewer"));
const CONTROL = "flex size-11 shrink-0 items-center justify-center rounded-md border border-line text-text-secondary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:opacity-30";
// 썸네일은 기존 크기를 쓰고, 선택한 TMDB 이미지와 확대본만 가로 1280px로 읽는다.
const displayImage = (url: string) => url.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\//, "https://image.tmdb.org/t/p/w1280/");

/** 스틸컷에는 장면 해설·시각 정보가 없으므로 이미지와 순번만 사용한다. */
export default function ContentImageGallery({ images, title, label }: { images: string[]; title: string; label: string }) {
  const t = useTranslations("contentDetail");
  const tViewer = useTranslations("shared.ui.imageViewer");
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { ref, cursorClassName, dragProps } = useMouseDragScroll();
  if (!images.length) return null;
  const index = Math.min(active, images.length - 1);
  const alt = (i: number) => t("mediaImageAlt", { title, kind: label, index: i + 1 });
  return <div className="space-y-3 border-t border-line pt-4" data-content-image-gallery>
    <div className="flex items-center justify-between gap-3">
      <DecorativeLabel label={label} />
      <div className="flex items-center gap-2">
        <span className="px-2 text-xs tabular-nums text-text-secondary" aria-live="polite">{index + 1} / {images.length}</span>
        {images.length > 1 && <>
          <button type="button" className={CONTROL} aria-label={tViewer("previous")} disabled={index === 0} onClick={() => setActive(index - 1)}><ChevronLeft size={18} aria-hidden /></button>
          <button type="button" className={CONTROL} aria-label={tViewer("next")} disabled={index === images.length - 1} onClick={() => setActive(index + 1)}><ChevronRight size={18} aria-hidden /></button>
        </>}
      </div>
    </div>
    <button type="button" aria-haspopup="dialog" aria-label={t("viewMediaImage", { image: alt(index) })}
      onClick={() => setExpanded(true)}
      className="group relative mx-auto block aspect-video w-full max-w-4xl cursor-zoom-in overflow-hidden rounded-lg border border-line bg-black/25 hover:border-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <ContentImage src={displayImage(images[index])} alt={alt(index)} className="object-contain" dissolve={false} sizes="(max-width: 767px) 90vw, 896px" />
      <span aria-hidden className="absolute bottom-3 end-3 rounded-md bg-black/70 p-2 text-white/80 group-hover:text-accent"><Expand size={18} /></span>
    </button>
    {images.length > 1 && <div ref={ref} {...dragProps} aria-label={label}
      className={`scrollbar-hide flex gap-2 overflow-x-auto overscroll-x-contain p-1 select-none pointer-coarse:snap-x ${cursorClassName}`}>
      {images.map((url, i) => <button type="button" key={url} aria-pressed={index === i} aria-label={t("selectMediaImage", { image: alt(i) })}
        onClick={() => setActive(i)}
        className={`relative aspect-video w-20 shrink-0 snap-start overflow-hidden rounded border-2 outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent sm:w-28 ${index === i ? "border-accent" : "border-line opacity-60 hover:opacity-100"}`}>
        <ContentImage src={url} alt="" className="object-cover" sizes="112px" draggable={false} dissolve={false} />
      </button>)}
    </div>}
    {expanded && <ArtworkViewer images={images.map((url, i) => ({ url: displayImage(url), label: alt(i), kind: "scene" as const }))}
      title={`${title} · ${label}`} initialIndex={index} onIndexChange={setActive} onClose={() => setExpanded(false)} />}
  </div>;
}
