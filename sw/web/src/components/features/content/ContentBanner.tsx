"use client";

import DetailBanner from "@/components/shared/DetailBanner";
import type { ContentType } from "@/types/database";
import type { ContentMetadata } from "@/types/content";
import type { BookBannerTheme } from "@/lib/books/bookBanner";
import { getContentBannerArtwork, getContentBannerImages, resolveMediaBannerTheme, type MediaBannerTheme } from "@/lib/contentBanner";

export default function ContentBanner({ type, theme, metadata, mediaTheme }: {
  type: ContentType;
  theme: BookBannerTheme;
  metadata?: ContentMetadata | null;
  mediaTheme?: MediaBannerTheme;
}) {
  const images = getContentBannerImages(type, theme, mediaTheme ?? resolveMediaBannerTheme(type, metadata));
  const artwork = getContentBannerArtwork(type, metadata);
  return <DetailBanner images={images} theme={images.theme} artwork={artwork} size="medium" shaded />;
}
