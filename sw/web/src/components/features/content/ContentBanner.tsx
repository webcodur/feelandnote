"use client";

import DetailBanner from "@/components/shared/DetailBanner";
import type { ContentType } from "@/types/database";
import type { BookBannerTheme } from "@/lib/books/bookBanner";
import { getContentBannerImages } from "@/lib/contentBanner";

export default function ContentBanner({ type, theme }: {
  type: ContentType;
  theme: BookBannerTheme;
}) {
  const images = getContentBannerImages(type, theme);
  return <DetailBanner images={images} theme={images.theme} size="large" shaded />;
}
