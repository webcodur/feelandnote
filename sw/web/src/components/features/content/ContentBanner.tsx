"use client";

import { useState } from "react";
import type { ContentType } from "@/types/database";
import type { ContentMetadata } from "@/types/content";
import type { BookBannerTheme } from "@/lib/books/bookBanner";
import { getContentBannerArtwork, getContentBannerImages, resolveMediaBannerTheme, type MediaBannerTheme } from "@/lib/contentBanner";
import styles from "./ContentDetail.module.css";

export default function ContentBanner({ type, theme, metadata, mediaTheme }: {
  type: ContentType;
  theme: BookBannerTheme;
  metadata?: ContentMetadata | null;
  mediaTheme?: MediaBannerTheme;
}) {
  const images = getContentBannerImages(type, theme, mediaTheme ?? resolveMediaBannerTheme(type, metadata));
  const artwork = getContentBannerArtwork(type, metadata);
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const activeArtwork = artwork && artwork !== failedArtwork ? artwork : null;
  return <div className={styles.banner} data-content-banner={activeArtwork ? "media" : images.theme} aria-hidden="true">
    <picture key={activeArtwork ?? images.theme}>
      <source media="(min-width: 768px)" srcSet={activeArtwork ?? images.pc} />
      <img src={activeArtwork ?? images.mb} alt="" fetchPriority="high" decoding="async" draggable={false}
        onError={activeArtwork ? () => setFailedArtwork(activeArtwork) : undefined} />
    </picture>
    <div className={styles.bannerShade} />
  </div>;
}
