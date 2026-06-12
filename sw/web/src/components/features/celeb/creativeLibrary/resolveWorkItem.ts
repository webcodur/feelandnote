import type { Locale } from "@/types/locale";
import type { LiveWorkItem, ResolvedWorkItem } from "./types";

export const resolveWorkItem = (item: LiveWorkItem, locale: Locale): ResolvedWorkItem => {
  const title = locale === "en" ? item.title_en : (item.title_ko || item.title_en);
  const subTitle = locale === "ko" && item.title_ko ? item.title_en : null;
  const yearStr = item.release_year
    ? item.release_year < 0 ? `BC ${Math.abs(item.release_year)}` : `${item.release_year}`
    : null;
  const thumbnail = item.image || null;
  const genreLabel = locale === "en" ? item.genre : (item.genre_ko || item.genre);
  const durationStr = item.duration
    ? item.duration >= 60
      ? `${Math.floor(item.duration / 60)}h ${item.duration % 60}m`
      : `${item.duration}m`
    : null;
  const collectionLabel = locale === "en" ? item.collection : (item.collection_ko || item.collection);
  const materialLabel = locale === "en" ? item.material : (item.material_ko || item.material);
  const locationLabel = locale === "en" ? item.location : (item.location_ko || item.location);
  return { title, subTitle, yearStr, thumbnail, genreLabel, durationStr, collectionLabel, materialLabel, locationLabel };
};

export const getSearchUrl = (item: LiveWorkItem, locale: Locale, celebNickname: string) => {
  const title = locale === "en" ? item.title_en : (item.title_ko || item.title_en);
  const keyword = `${title} ${celebNickname}`;
  return `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
};
