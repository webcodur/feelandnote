"use client";

import { useState } from "react";
import { MYTH_TITLE_DISPLAY } from "@feelandnote/shared/constants/responsive-artwork";

/** R2 원본 PNG 하나에서 화면 크기에 맞는 WebP를 요청한다. */
export default function MythTitleImage({ src, alt, priority, sizes = "(min-width: 1040px) 990px, (min-width: 768px) calc(100vw - 80px), calc(100vw - 58px)", fit = "contain", className = "", onUnavailable }: { src: string; alt: string; priority: boolean; sizes?: string; fit?: "contain" | "cover"; className?: string; onUnavailable?: () => void }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sourceUrl = URL.canParse(src) ? new URL(src) : null;
  const file = sourceUrl?.hostname === "assets.feelandnote.com"
    ? /^\/myth\/title-art\/([a-z0-9][a-z0-9-]*-[a-f0-9]{12}\.png)$/.exec(sourceUrl.pathname)?.[1]
    : null;
  const available = failedSource !== src && file;
  const variant = (width: number) => `/api/myth-title/${file}?w=${width}`;
  const unavailable = () => { if (available) setFailedSource(src); else onUnavailable?.(); };
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={(img) => {
      // SSR 그림이 하이드레이션 전에 실패하면 error 이벤트가 지나가므로 완료 상태도 확인한다.
      // 변환본에서 원본으로 바뀌는 순간에는 이전 currentSrc의 실패 상태를 재사용하지 않는다.
      if (!img?.complete || !img.currentSrc || img.naturalWidth > 0) return;
      const current = new URL(img.currentSrc, document.baseURI);
      const matches = available
        ? current.pathname === `/api/myth-title/${file}`
        : current.href === new URL(src, document.baseURI).href;
      if (matches) unavailable();
    }} src={available ? variant(MYTH_TITLE_DISPLAY.widths[0]) : src}
      srcSet={available ? MYTH_TITLE_DISPLAY.widths.map(width => `${variant(width)} ${width}w`).join(", ") : undefined}
      sizes={sizes}
      alt={alt} className={`absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"} ${className}`} style={{ filter: "none" }}
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async"
      onError={unavailable} />
  );
}
