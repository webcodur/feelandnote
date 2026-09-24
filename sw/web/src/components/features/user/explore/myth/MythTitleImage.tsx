"use client";

import { useState } from "react";
import { MYTH_TITLE_DISPLAY } from "@feelandnote/shared/constants/responsive-artwork";

/** R2 원본 PNG 하나에서 화면 크기에 맞는 WebP를 요청한다. */
export default function MythTitleImage({ src, alt, priority }: { src: string; alt: string; priority: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sourceUrl = URL.canParse(src) ? new URL(src) : null;
  const file = sourceUrl?.hostname === "assets.feelandnote.com"
    ? /^\/myth\/title-art\/([a-z0-9][a-z0-9-]*-[a-f0-9]{12}\.png)$/.exec(sourceUrl.pathname)?.[1]
    : null;
  const available = failedSource !== src && file;
  const variant = (width: number) => `/api/myth-title/${file}?w=${width}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={available ? variant(MYTH_TITLE_DISPLAY.widths[0]) : src}
      srcSet={available ? MYTH_TITLE_DISPLAY.widths.map(width => `${variant(width)} ${width}w`).join(", ") : undefined}
      sizes="(min-width: 1040px) 990px, (min-width: 768px) calc(100vw - 80px), calc(100vw - 58px)"
      alt={alt} className="absolute inset-0 h-full w-full object-contain" style={{ filter: "none" }}
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async"
      onError={() => { if (available) setFailedSource(src); }} />
  );
}
