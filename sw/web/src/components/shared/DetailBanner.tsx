"use client";

import { useState, type ReactNode } from "react";
import styles from "./DetailBanner.module.css";

export interface DetailBannerImages {
  pc: string;
  mb: string;
}

interface DetailBannerProps {
  images: DetailBannerImages | null;
  theme: string;
  size?: "large" | "medium" | "compact";
  artwork?: string | null;
  shaded?: boolean;
  fallback?: ReactNode;
}

/** 인물·작품 상세가 공유하는 기기별 배너와 원본 이미지 실패 시 대체 처리. */
export default function DetailBanner({ images, theme, size = "large", artwork, shaded = false, fallback }: DetailBannerProps) {
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const activeArtwork = artwork && artwork !== failedArtwork ? artwork : null;

  return <div className={styles.banner} data-size={size} data-banner-theme={activeArtwork ? "media" : theme} aria-hidden="true">
    {images || activeArtwork ? <picture key={activeArtwork ?? `${images?.pc}|${images?.mb}`}>
      <source media="(min-width: 768px)" srcSet={activeArtwork ?? images?.pc} />
      <img src={activeArtwork ?? images?.mb} alt="" fetchPriority="high" decoding="async" draggable={false}
        onError={activeArtwork ? () => setFailedArtwork(activeArtwork) : undefined} />
    </picture> : fallback}
    {shaded && <div className={styles.shade} />}
  </div>;
}
