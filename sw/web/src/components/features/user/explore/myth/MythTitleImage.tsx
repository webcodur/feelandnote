"use client";

import { useState } from "react";
import manifest from "@/generated/myth-title-images.json";

/** 정적 타이틀은 SSR부터 srcSet을 제공해 원본 선다운로드를 막는다. */
export default function MythTitleImage({ src, alt, priority }: { src: string; alt: string; priority: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const variants = (manifest as Record<string, Array<{ src: string; width: number }>>)[src.split(/[?#]/)[0]];
  const available = failedSource !== src && variants?.length ? variants : null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={available?.[0].src ?? src} srcSet={available?.map(image => `${image.src} ${image.width}w`).join(", ")}
      sizes="(min-width: 1040px) 990px, (min-width: 768px) calc(100vw - 80px), calc(100vw - 58px)"
      alt={alt} className="absolute inset-0 h-full w-full object-contain" style={{ filter: "none" }}
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async"
      onError={() => { if (available) setFailedSource(src); }} />
  );
}
