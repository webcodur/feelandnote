"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { PORTRAIT_DISPLAY, portraitVariantUrl } from "@feelandnote/shared/constants/responsive-artwork";

/** 원본은 확대 보기에 남기고, 보이는 화보 칸만 해상도에 맞춰 요청한다. */
export default function ResponsivePortraitImage({ src, alt, className = "object-cover", style, priority = false, sizes }: {
  src: string; alt: string; className?: string; style?: CSSProperties; priority?: boolean; sizes?: string;
}) {
  const [selection, setSelection] = useState<{ source: string; url: string; width: number } | null>(null);
  const failed = useRef<string | null>(null);
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const measure = useRef<(() => void) | undefined>(undefined);
  const ref = useCallback((image: HTMLImageElement | null) => {
    cleanup.current?.();
    cleanup.current = undefined;
    measure.current = undefined;
    if (!image) return;
    let sourceAspect = 1;
    const update = () => {
      const rect = image.getBoundingClientRect();
      const width = Math.max(rect.width, image.clientWidth);
      const height = Math.max(rect.height, image.clientHeight);
      if (!width || !height) return;
      const sourceWidth = Math.max(width, height * sourceAspect);
      const required = sourceWidth * (window.devicePixelRatio || 1);
      const target = PORTRAIT_DISPLAY.widths.find(size => size >= required) ?? PORTRAIT_DISPLAY.widths.at(-1)!;
      const url = failed.current === src ? src : portraitVariantUrl(src, target);
      setSelection(previous => previous?.source === src && previous.url === url && previous.width === sourceWidth
        ? previous : { source: src, url, width: sourceWidth });
    };
    // 가로 화보를 세로 칸에 cover한 경우에도 해상도가 부족하지 않게 보정한다.
    const loaded = () => { if (image.naturalHeight) { sourceAspect = Math.max(1, image.naturalWidth / image.naturalHeight); update(); } };
    const observer = new ResizeObserver(update);
    observer.observe(image);
    let density = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const changed = () => {
      density.removeEventListener("change", changed);
      density = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      density.addEventListener("change", changed);
      update();
    };
    density.addEventListener("change", changed);
    window.addEventListener("resize", update, { passive: true });
    image.addEventListener("load", loaded);
    measure.current = update;
    update();
    cleanup.current = () => {
      observer.disconnect();
      density.removeEventListener("change", changed);
      window.removeEventListener("resize", update);
      image.removeEventListener("load", loaded);
    };
  }, [src]);

  // 상세의 대표 이미지는 초기 HTML에도 주소를 싣고, 브라우저가 해상도를 고른다.
  const nativeSources = sizes && !(selection?.source === src && selection.url === src)
    ? PORTRAIT_DISPLAY.widths.map(width => `${portraitVariantUrl(src, width)} ${width}w`).join(", ")
    : undefined;
  const srcSet = nativeSources && portraitVariantUrl(src, PORTRAIT_DISPLAY.widths[0]) !== src ? nativeSources : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={sizes ? src : selection?.source === src ? selection.url : undefined} alt={alt}
      srcSet={srcSet} sizes={srcSet ? (selection?.source === src && selection.width > 0 ? `${selection.width}px` : sizes) : undefined}
      className={className} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }}
      loading={sizes ? "lazy" : priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async"
      onError={(event) => {
        if ((sizes ? event.currentTarget.currentSrc : event.currentTarget.getAttribute("src")) !== src) {
          failed.current = src;
          setSelection({ source: src, url: src, width: 0 });
          measure.current?.();
        }
      }} />
  );
}
